"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsBreadcrumb,
  AcademicsEmpty,
  AcademicsHero,
  AcademicsStatGrid,
  formatAcadDate,
  termDaysRemaining,
  termDurationDays,
  termProgress,
  termStatus,
  yearProgress,
} from "@/components/academics/academics-ui";
import {
  createTerm,
  listAcademicYears,
  listTerms,
  type AcademicTerm,
  type AcademicYear,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function suggestNextTerm(terms: AcademicTerm[]) {
  const nextIndex = terms.length + 1;
  const maxOrder = terms.reduce((max, t) => Math.max(max, t.sortOrder), -1);
  return {
    name: `Term ${nextIndex}`,
    sortOrder: String(maxOrder + 1),
  };
}

export default function AcademicTermsPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isCurrent, setIsCurrent] = useState(false);

  function applyFormDefaults(termList: AcademicTerm[]) {
    const suggestion = suggestNextTerm(termList);
    setName(suggestion.name);
    setSortOrder(suggestion.sortOrder);
    setStartDate("");
    setEndDate("");
    setIsCurrent(!termList.some((t) => t.isCurrent));
  }

  async function load(yearFilter?: string) {
    const y = await listAcademicYears();
    setYears(y);
    const defaultYearId = y.find((x) => x.isCurrent)?.id ?? y[0]?.id ?? "";
    const yearId = yearFilter || academicYearId || defaultYearId;
    if (yearId !== academicYearId) setAcademicYearId(yearId);
    const loadedTerms = await listTerms(yearId || undefined);
    setTerms(loadedTerms);
    return loadedTerms;
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
      .then((loadedTerms) => applyFormDefaults(loadedTerms))
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onYearChange(yearId: string) {
    setAcademicYearId(yearId);
    setError("");
    setSuccess("");
    try {
      const loadedTerms = await listTerms(yearId || undefined);
      setTerms(loadedTerms);
      applyFormDefaults(loadedTerms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!academicYearId) {
      setError("Create an academic year first.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createTerm({
        academicYearId,
        name: name.trim(),
        startDate,
        endDate,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        isCurrent,
      });
      setSuccess(`${name.trim()} is ready — teachers can enter scores for this term.`);
      const loadedTerms = await load(academicYearId);
      applyFormDefaults(loadedTerms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedYear = years.find((y) => y.id === academicYearId);
  const currentTerm = terms.find((t) => t.isCurrent);
  const activeTerm = terms.find((t) => termStatus(t.startDate, t.endDate) === "active");

  const stats = useMemo(() => {
    const yearPct = selectedYear
      ? yearProgress(selectedYear.startDate, selectedYear.endDate)
      : 0;
    const daysLeft = currentTerm ? termDaysRemaining(currentTerm.endDate) : null;
    return [
      {
        label: "Terms this year",
        value: loading ? "—" : terms.length,
        hint: terms.length < 3 ? "Ethiopian schools often use 3" : "Full year coverage",
      },
      {
        label: "Active term",
        value: currentTerm?.name ?? "None set",
        hint: activeTerm
          ? `${termProgress(activeTerm.startDate, activeTerm.endDate)}% elapsed`
          : "Mark one term as current",
      },
      {
        label: "Year progress",
        value: selectedYear ? `${yearPct}%` : "—",
        hint: daysLeft != null ? `${daysLeft} days left in current term` : "Select a year",
      },
    ];
  }, [loading, terms, currentTerm, activeTerm, selectedYear]);

  return (
    <DashboardPage role="admin" title="Terms" eyebrow="Academics">
      <div className="acad-page acad-page--terms">
        <AcademicsBreadcrumb
          items={[
            { label: "Academics", href: "/admin/academics" },
            { label: "Terms" },
          ]}
        />

        <AcademicsHero
          title="Terms & semesters"
          subtitle="Results, attendance, and report cards are scoped to a term. Set up Term 1, 2, and 3 for the school year."
          badges={
            <>
              {selectedYear ? (
                <AcademicsBadge variant="default">Year: {selectedYear.name}</AcademicsBadge>
              ) : null}
              {currentTerm ? (
                <AcademicsBadge variant="live">Current: {currentTerm.name}</AcademicsBadge>
              ) : (
                <AcademicsBadge variant="muted">No current term</AcademicsBadge>
              )}
            </>
          }
        />

        {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
        {success ? <AcademicsAlert tone="success">{success}</AcademicsAlert> : null}

        <AcademicsStatGrid items={stats} />

        <div className="acad-year-picker">
          <div className="acad-year-picker__label">
            <DashIcon name="calendar" className="dash-icon--xs" />
            <span>Academic year</span>
          </div>
          <select
            className="acad-year-picker__select"
            value={academicYearId}
            onChange={(e) => void onYearChange(e.target.value)}
            disabled={years.length === 0}
          >
            {years.length === 0 ? (
              <option value="">No years — create one first</option>
            ) : null}
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
          {years.length === 0 ? (
            <Link href="/admin/results/academic-years" className="acad-year-picker__link">
              Create year →
            </Link>
          ) : null}
        </div>

        <div className="acad-terms-layout">
          <section className="acad-terms-main">
            <header className="acad-terms-main__head">
              <div>
                <h2 className="acad-terms-main__title">
                  {selectedYear ? selectedYear.name : "Terms"}
                </h2>
                <p className="acad-terms-main__sub">
                  {terms.length === 0
                    ? "Add your first term to unlock results and grading."
                    : `${terms.length} term${terms.length === 1 ? "" : "s"} configured`}
                </p>
              </div>
              {selectedYear ? (
                <span className="acad-terms-main__pct">
                  {yearProgress(selectedYear.startDate, selectedYear.endDate)}% of year
                </span>
              ) : null}
            </header>

            {loading ? (
              <div className="acad-terms-loading">
                <span className="acad-terms-loading__spinner" aria-hidden />
                <p>Loading terms…</p>
              </div>
            ) : terms.length === 0 ? (
              <AcademicsEmpty message="No terms yet. Use the form to add Term 1 — typically June–July for the first semester." />
            ) : (
              <ul className="acad-terms-timeline">
                {terms.map((t, index) => {
                  const status = termStatus(t.startDate, t.endDate);
                  const progress = termProgress(t.startDate, t.endDate);
                  const duration = termDurationDays(t.startDate, t.endDate);
                  const daysLeft = termDaysRemaining(t.endDate);
                  return (
                    <li
                      key={t.id}
                      className={`acad-term-item acad-term-item--${status}${t.isCurrent ? " acad-term-item--current" : ""}`}
                    >
                      <div className="acad-term-item__rail" aria-hidden>
                        <span className="acad-term-item__dot" />
                        {index < terms.length - 1 ? (
                          <span className="acad-term-item__line" />
                        ) : null}
                      </div>
                      <div className="acad-term-item__body">
                        <div className="acad-term-item__top">
                          <div>
                            <span className="acad-term-item__order">Term {t.sortOrder + 1}</span>
                            <h3 className="acad-term-item__name">{t.name}</h3>
                          </div>
                          <div className="acad-term-item__badges">
                            {t.isCurrent ? (
                              <AcademicsBadge variant="live">Current</AcademicsBadge>
                            ) : null}
                            <span className={`acad-term-item__status acad-term-item__status--${status}`}>
                              {status === "active"
                                ? "In progress"
                                : status === "upcoming"
                                  ? "Upcoming"
                                  : "Completed"}
                            </span>
                          </div>
                        </div>
                        <p className="acad-term-item__dates">
                          {formatAcadDate(t.startDate)} – {formatAcadDate(t.endDate)}
                          <span className="acad-term-item__duration">
                            · {duration} days
                          </span>
                        </p>
                        <div className="acad-term-item__bar" title={`${progress}% complete`}>
                          <span
                            className={`acad-term-item__bar-fill acad-term-item__bar-fill--${status}`}
                            style={{ width: `${status === "upcoming" ? 0 : progress}%` }}
                          />
                        </div>
                        <p className="acad-term-item__meta">
                          {status === "active"
                            ? `${progress}% complete · ${daysLeft} days remaining`
                            : status === "upcoming"
                              ? "Starts soon"
                              : "Term ended"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="acad-terms-form-panel">
            <form className="acad-terms-form" onSubmit={(e) => void onCreate(e)}>
              <header className="acad-terms-form__head">
                <div className="acad-terms-form__icon" aria-hidden>
                  <DashIcon name="calendar" className="dash-icon--sm" />
                </div>
                <div>
                  <h3 className="acad-terms-form__title">Add term</h3>
                  <p className="acad-terms-form__sub">
                    {terms.length === 0
                      ? "Start with Term 1"
                      : `Next up: ${suggestNextTerm(terms).name}`}
                  </p>
                </div>
              </header>

              <div className="acad-terms-form__fields">
                <label>
                  Term name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Term 1"
                    required
                  />
                </label>
                <div className="acad-form__row">
                  <label>
                    Start date
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label>
                  Sort order
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </label>
                <label className="acad-form__check acad-terms-form__check">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                  />
                  Set as current term
                </label>
              </div>

              <div className="acad-terms-form__actions">
                <button
                  type="submit"
                  className="acad-btn acad-btn--primary acad-btn--block"
                  disabled={saving || years.length === 0}
                >
                  {saving ? "Creating…" : "Create term"}
                </button>
                <p className="acad-terms-form__hint">
                  Teachers see the current term on their dashboard.
                </p>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </DashboardPage>
  );
}
