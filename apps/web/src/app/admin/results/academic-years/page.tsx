"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsBreadcrumb,
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
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
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

  return (
    <DashboardPage role="admin" title="Academic years" eyebrow="Academics">
      <div className="acad-page">
        <AcademicsBreadcrumb
          items={[
            { label: "Academics", href: "/admin/academics" },
            { label: "Academic years" },
          ]}
        />

        <AcademicsHero
          title="Academic years"
          subtitle="Each year is the container for terms, class subjects, results, and finance. Only one year should be marked current at a time."
          badges={
            current ? <AcademicsBadge variant="live">Current: {current.name}</AcademicsBadge> : null
          }
        />

        {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
        {success ? <AcademicsAlert tone="success">{success}</AcademicsAlert> : null}

        <AcademicsPanel
          title="School years"
          subtitle="Open terms for a year after it is created."
          aside={
            <form className="acad-form" onSubmit={(e) => void onCreate(e)}>
              <h3 className="acad-panel__title">New academic year</h3>
              <p className="acad-panel__sub">Example: 2026/2027 · Sep 2026 – Jun 2027</p>
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
              <button type="submit" className="acad-btn acad-btn--primary" disabled={saving}>
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
            <ul className="acad-year-list">
              {years.map((y) => (
                <li
                  key={y.id}
                  className={`acad-year-card${y.isCurrent ? " acad-year-card--current" : ""}`}
                >
                  <div className="acad-year-card__top">
                    <span className="acad-year-card__name">{y.name}</span>
                    {y.isCurrent ? (
                      <AcademicsBadge variant="live">Current</AcademicsBadge>
                    ) : (
                      <button
                        type="button"
                        className="acad-btn acad-btn--ghost"
                        onClick={() => void onSetCurrent(y.id)}
                      >
                        Set current
                      </button>
                    )}
                  </div>
                  <p className="acad-year-card__meta">
                    {formatAcadDate(y.startDate)} – {formatAcadDate(y.endDate)}
                  </p>
                  <div className="acad-year-card__counts">
                    <span>{y._count?.academicTerms ?? 0} terms</span>
                    <span>{y._count?.classSubjects ?? 0} class subjects</span>
                    <Link href={`/admin/results/terms`}>Manage terms →</Link>
                  </div>
                  <div className="acad-year-card__bar" title="Year progress">
                    <span style={{ width: `${yearProgress(y.startDate, y.endDate)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AcademicsPanel>
      </div>
    </DashboardPage>
  );
}
