"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  AcademicsBadge,
  AcademicsEmpty,
  AcademicsHero,
  AcademicsPanel,
  formatAcadDate,
  yearProgress,
} from "@/components/academics/academics-ui";
import {
  createAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  type AcademicYear,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { AppToast } from "@/components/ui/app-toast";

export default function AcademicYearsPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);

  async function load() {
    setYears(await listAcademicYears());
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void listAcademicYears()
      .then((list) => {
        if (!cancelled) setYears(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createAcademicYear({ name, startDate, endDate, isCurrent });
      setName("");
      setStartDate("");
      setEndDate("");
      setSuccess("Academic year created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSetCurrent(id: string) {
    setError("");
    setSuccess("");
    try {
      await setCurrentAcademicYear(id);
      setSuccess("Current year updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  const current = years.find((y) => y.isCurrent);
  const totalTerms = years.reduce((sum, y) => sum + (y._count?.academicTerms ?? 0), 0);
  const totalSubjects = years.reduce((sum, y) => sum + (y._count?.classSubjects ?? 0), 0);
  const currentProgress = current
    ? yearProgress(current.startDate, current.endDate)
    : 0;

  return (
    <DashboardPage role="admin" title="Academic years">
      <div className="acad-page acad-page--years">
        <AcademicsHero
          chip="Academics"
          compact
          backHref="/admin/academics"
          title="Academic years"
          subtitle="Each year holds terms, class subjects, results, and finance. Mark one year as current."
          badges={
            current ? <AcademicsBadge variant="live">Current: {current.name}</AcademicsBadge> : null
          }
          stats={[
            { label: "Years", value: years.length },
            { label: "Terms", value: totalTerms },
            { label: "Class subjects", value: totalSubjects },
            {
              label: "Year progress",
              value: current ? `${currentProgress}%` : "—",
              hint: current?.name,
              accent: true,
            },
          ]}
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

        <AcademicsPanel
          title="School years"
          subtitle="Open terms for each year after it is created."
          aside={
            <form className="acad-form acad-form-card" onSubmit={(e) => void onCreate(e)}>
              <div className="acad-form-card__head">
                <h3 className="acad-form-card__title">New academic year</h3>
                <p className="acad-form-card__sub">e.g. 2026/2027 · Sep 2026 – Jun 2027</p>
              </div>
              <label>
                Year label
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="2026/2027"
                  required
                />
              </label>
              <div className="acad-form__row">
                <label>
                  Starts
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Ends
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="acad-form__check">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                />
                Set as current school year
              </label>
              <button type="submit" className="acad-btn acad-btn--primary acad-btn--block" disabled={saving}>
                {saving ? "Creating…" : "Create year"}
              </button>
            </form>
          }
        >
          {loading ? (
            <p className="acad-loading">Loading years…</p>
          ) : years.length === 0 ? (
            <AcademicsEmpty message="No academic years yet. Create your first year using the form." />
          ) : (
            <ul className="acad-year-list acad-year-list--grid">
              {years.map((y) => {
                const progress = yearProgress(y.startDate, y.endDate);
                return (
                  <li
                    key={y.id}
                    className={`acad-year-card${y.isCurrent ? " acad-year-card--current" : ""}`}
                  >
                    <div className="acad-year-card__top">
                      <div className="acad-year-card__identity">
                        <span className="acad-year-card__name">{y.name}</span>
                        <p className="acad-year-card__meta">
                          {formatAcadDate(y.startDate)} – {formatAcadDate(y.endDate)}
                        </p>
                      </div>
                      {y.isCurrent ? (
                        <AcademicsBadge variant="live">Current</AcademicsBadge>
                      ) : (
                        <button
                          type="button"
                          className="acad-btn acad-btn--ghost acad-btn--sm"
                          onClick={() => void onSetCurrent(y.id)}
                        >
                          Set current
                        </button>
                      )}
                    </div>
                    <div className="acad-year-card__stats">
                      <span className="acad-year-card__pill">
                        <strong>{y._count?.academicTerms ?? 0}</strong> terms
                      </span>
                      <span className="acad-year-card__pill">
                        <strong>{y._count?.classSubjects ?? 0}</strong> class subjects
                      </span>
                      <span className="acad-year-card__pill acad-year-card__pill--muted">
                        <strong>{progress}%</strong> elapsed
                      </span>
                    </div>
                    <div className="acad-year-card__foot">
                      <div className="acad-year-card__bar" title="Year progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <Link href="/admin/results/terms" className="acad-year-card__cta">
                        Manage terms →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AcademicsPanel>
      </div>
    </DashboardPage>
  );
}
