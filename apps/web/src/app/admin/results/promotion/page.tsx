"use client";

import { useEffect, useState } from "react";
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
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

export default function YearPromotionPage() {
  const router = useRouter();
  const { t, tp } = useLocale();
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
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("adminPromotionUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!fromYearId) return;
    let cancelled = false;
    void (async () => {
      setError("");
      try {
        const p = await getPromotionPreview(fromYearId);
        if (cancelled) return;
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
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("adminPromotionUi.previewFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromYearId]);

  async function onSync() {
    setBusy(true);
    setError("");
    try {
      const res = await syncEnrollments();
      setSuccess(
        t("adminPromotionUi.syncSuccess", {
          count: res.synced,
          year: res.academicYearName ?? "",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminPromotionUi.syncFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onPromote() {
    if (!preview || !toYearId) return;
    if (
      !window.confirm(
        t("adminPromotionUi.confirmPromote"),
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
      setError(err instanceof Error ? err.message : t("adminPromotionUi.promotionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title={tp("End-of-year promotion")}
    >
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

      <section className="att-admin-section" style={{ borderTop: "none" }}>
        <h2 className="setup-panel-label">{t("adminPromotionUi.sectionBefore")}</h2>
        <button
          type="button"
          className="dash-copy-btn"
          disabled={busy}
          onClick={() => void onSync()}
        >
          {t("adminPromotionUi.syncBtn")}
        </button>
      </section>

      {loading ? (
        <p className="setup-hint">{t("common.loading")}</p>
      ) : (
        <>
          <div className="att-mark-toolbar">
            <div className="att-field">
              <span>{t("adminPromotionUi.closingYear")}</span>
              <select
                value={fromYearId}
                onChange={(e) => setFromYearId(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isCurrent ? t("adminPromotionUi.currentSuffix") : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="att-field">
              <span>{t("adminPromotionUi.promoteInto")}</span>
              <select value={toYearId} onChange={(e) => setToYearId(e.target.value)}>
                <option value="">{t("adminPromotionUi.selectYear")}</option>
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
              <table className="res-matrix">
                <thead>
                  <tr>
                    <th>{t("adminPromotionUi.thFromGrade")}</th>
                    <th>{t("adminPromotionUi.thStudents")}</th>
                    <th>{t("adminPromotionUi.thPromoteTo")}</th>
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
                          <option value="">{t("adminPromotionUi.graduateLeave")}</option>
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
              <div className="setup-actions-row">
                <button
                  type="button"
                  className="auth-page-submit"
                  disabled={busy || !toYearId}
                  onClick={() => void onPromote()}
                >
                  {busy ? t("adminPromotionUi.promoting") : t("adminPromotionUi.runPromotion")}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </DashboardPage>
  );
}
