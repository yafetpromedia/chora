"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  executePromotion,
  getPromotionPreview,
  syncEnrollments,
  type PromotionPreview,
} from "@/lib/academic-promotion";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listAcademicYears, type AcademicYear } from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function YearPromotionPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [mappings, setMappings] = useState<
    Record<string, string | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([listAcademicYears(), listGrades()])
      .then(([y, g]) => {
        setYears(y);
        setGrades(g);
        const current = y.find((x) => x.isCurrent) ?? y[0];
        if (current) setFromYearId(current.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!fromYearId) return;
    setError("");
    void getPromotionPreview(fromYearId)
      .then((p) => {
        setPreview(p);
        if (p.suggestedToYear) setToYearId(p.suggestedToYear.id);
        else if (p.availableTargetYears[0]) {
          setToYearId(p.availableTargetYears[0].id);
        }
        const map: Record<string, string | null> = {};
        for (const m of p.mappings) {
          map[m.fromGradeId] = m.suggestedToGradeId;
        }
        setMappings(map);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Preview failed"));
  }, [fromYearId]);

  async function onSync() {
    setBusy(true);
    setError("");
    try {
      const res = await syncEnrollments();
      setSuccess(`Synced ${res.synced} enrollments for ${res.academicYearName ?? "current year"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPromote() {
    if (!preview || !toYearId) return;
    if (
      !window.confirm(
        "Promote all students per the mapping below? This updates active grade/section and creates enrollment history. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await executePromotion({
        fromYearId,
        toYearId,
        mappings: preview.mappings.map((m) => ({
          fromGradeId: m.fromGradeId,
          toGradeId: mappings[m.fromGradeId] ?? null,
        })),
        setToYearCurrent: true,
      });
      setSuccess(result.message);
      const y = await listAcademicYears();
      setYears(y);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="End-of-year promotion"
      subtitle="Move students to the next grade while keeping historical enrollments frozen."
      eyebrow="Academics"
    >
      <p className="setup-hint">
        <Link href="/admin/results/academic-years">← Academic years</Link>
        {" · "}
        <Link href="/admin/results">Results</Link>
      </p>
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {success ? <p className="att-toast">{success}</p> : null}

      <section className="att-admin-section" style={{ borderTop: "none" }}>
        <h2 className="setup-panel-label">Before you promote</h2>
        <p className="setup-hint">
          Create the <strong>next academic year</strong> first, then run promotion. Old year
          enrollments are archived; student profiles move to the new grade.
        </p>
        <button
          type="button"
          className="dash-copy-btn"
          disabled={busy}
          onClick={() => void onSync()}
        >
          Sync enrollments for current year
        </button>
      </section>

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <>
          <div className="att-mark-toolbar">
            <div className="att-field">
              <span>Closing year</span>
              <select
                value={fromYearId}
                onChange={(e) => setFromYearId(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isCurrent ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="att-field">
              <span>Promote into</span>
              <select value={toYearId} onChange={(e) => setToYearId(e.target.value)}>
                <option value="">Select year</option>
                {(preview?.availableTargetYears ?? years.filter((y) => y.id !== fromYearId)).map(
                  (y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {preview ? (
            <>
              <p className="setup-hint">
                {preview.totalStudents} students across {preview.mappings.length} grades.
                Adjust targets — leave as <em>Graduate</em> for final-year leavers.
              </p>
              <table className="res-matrix">
                <thead>
                  <tr>
                    <th>From grade</th>
                    <th>Students</th>
                    <th>Promote to</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.mappings.map((m) => (
                    <tr key={m.fromGradeId}>
                      <td>{m.fromGradeName}</td>
                      <td>{m.studentCount}</td>
                      <td>
                        <select
                          className="auth-input auth-input--login auth-input--login-plain"
                          value={mappings[m.fromGradeId] ?? ""}
                          onChange={(e) =>
                            setMappings((prev) => ({
                              ...prev,
                              [m.fromGradeId]: e.target.value || null,
                            }))
                          }
                        >
                          <option value="">Graduate / leave</option>
                          {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="setup-hint">
                Tip: use the suggested next grade from preview. The dropdown lists all grades in
                your school — pick the grade immediately above (e.g. Grade 9 → Grade 10).
              </p>
              <div className="setup-actions-row">
                <button
                  type="button"
                  className="auth-page-submit"
                  disabled={busy || !toYearId}
                  onClick={() => void onPromote()}
                >
                  {busy ? "Promoting…" : "Run promotion"}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </DashboardPage>
  );
}
