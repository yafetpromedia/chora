"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsEmpty,
  AcademicsHero,
  formatAcadDate,
  termDaysRemaining,
  termDurationDays,
  termProgress,
  termStatus,
  yearProgress,
} from "@/components/academics/academics-ui";
import {
  createTerm,
  deleteTerm,
  listAcademicYears,
  listTerms,
  updateTerm,
  type AcademicTerm,
  type AcademicYear,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

function suggestNextTerm(terms: AcademicTerm[], termLabel: (n: number) => string) {
  const termNumber = terms.length + 1;
  return {
    name: termLabel(termNumber),
    termNumber: String(termNumber),
  };
}

function termNumberToSortOrder(termNumber: string) {
  const n = Number.parseInt(termNumber, 10);
  return Number.isFinite(n) && n > 0 ? n - 1 : 0;
}

export default function AcademicTermsPage() {
  const { t, tp } = useLocale();
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
  const [termNumber, setTermNumber] = useState("1");
  const [isCurrent, setIsCurrent] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const termNameFor = useCallback(
    (n: number) => t("adminAcademicTermsUi.suggestTermName", { n }),
    [t],
  );

  function applyFormDefaults(termList: AcademicTerm[]) {
    const suggestion = suggestNextTerm(termList, termNameFor);
    setName(suggestion.name);
    setTermNumber(suggestion.termNumber);
    setStartDate("");
    setEndDate("");
    setIsCurrent(!termList.some((t) => t.isCurrent));
    setEditingTermId(null);
  }

  function startEdit(term: AcademicTerm) {
    setEditingTermId(term.id);
    setName(term.name);
    setStartDate(toDateInput(term.startDate));
    setEndDate(toDateInput(term.endDate));
    setTermNumber(String(term.sortOrder + 1));
    setIsCurrent(term.isCurrent);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    applyFormDefaults(terms);
  }

  async function fetchTermsData(yearFilter?: string) {
    const y = await listAcademicYears();
    const defaultYearId = y.find((x) => x.isCurrent)?.id ?? y[0]?.id ?? "";
    const yearId = yearFilter || academicYearId || defaultYearId;
    const loadedTerms = await listTerms(yearId || undefined);
    return { years: y, yearId, loadedTerms };
  }

  function applyTermsData(data: Awaited<ReturnType<typeof fetchTermsData>>) {
    setYears(data.years);
    if (data.yearId !== academicYearId) setAcademicYearId(data.yearId);
    setTerms(data.loadedTerms);
    return data.loadedTerms;
  }

  async function load(yearFilter?: string) {
    return applyTermsData(await fetchTermsData(yearFilter));
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
    void fetchTermsData()
      .then((data) => {
        if (cancelled) return;
        applyFormDefaults(applyTermsData(data));
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("adminAcademicTermsUi.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      setError(err instanceof Error ? err.message : t("adminAcademicTermsUi.loadFailed"));
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!academicYearId) {
      setError(t("adminAcademicTermsUi.createYearFirst"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editingTermId) {
        await updateTerm(editingTermId, {
          name: name.trim(),
          startDate,
          endDate,
          sortOrder: termNumberToSortOrder(termNumber),
          isCurrent,
        });
        setSuccess(t("adminAcademicTermsUi.termUpdated", { name: name.trim() }));
      } else {
        await createTerm({
          academicYearId,
          name: name.trim(),
          startDate,
          endDate,
          sortOrder: termNumberToSortOrder(termNumber),
          isCurrent,
        });
        setSuccess(t("adminAcademicTermsUi.termReady", { name: name.trim() }));
      }
      const loadedTerms = await load(academicYearId);
      applyFormDefaults(loadedTerms);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminAcademicTermsUi.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(term: AcademicTerm) {
    const ok = window.confirm(t("adminAcademicTermsUi.deleteConfirm", { name: term.name }));
    if (!ok) return;
    setDeletingId(term.id);
    setError("");
    setSuccess("");
    try {
      await deleteTerm(term.id);
      setSuccess(t("adminAcademicTermsUi.termDeleted", { name: term.name }));
      const loadedTerms = await load(academicYearId);
      applyFormDefaults(loadedTerms);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminAcademicTermsUi.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const selectedYear = years.find((y) => y.id === academicYearId);
  const currentTerm = terms.find((term) => term.isCurrent);
  const activeTerm = terms.find(
    (term) => termStatus(term.startDate, term.endDate) === "active",
  );

  const stats = useMemo(() => {
    const yearPct = selectedYear
      ? yearProgress(selectedYear.startDate, selectedYear.endDate)
      : 0;
    const daysLeft = currentTerm ? termDaysRemaining(currentTerm.endDate) : null;
    return [
      {
        label: t("adminAcademicTermsUi.statTerms"),
        value: loading ? "—" : terms.length,
        hint:
          terms.length < 3
            ? t("adminAcademicTermsUi.hintFewTerms")
            : t("adminAcademicTermsUi.hintConfigured"),
      },
      {
        label: t("adminAcademicTermsUi.statCurrent"),
        value: currentTerm?.name ?? t("adminAcademicTermsUi.none"),
        hint: activeTerm
          ? t("adminAcademicTermsUi.percentElapsed", {
              n: termProgress(activeTerm.startDate, activeTerm.endDate),
            })
          : t("adminAcademicTermsUi.markOneCurrent"),
      },
      {
        label: t("adminAcademicTermsUi.statYearProgress"),
        value: selectedYear ? `${yearPct}%` : "—",
        hint:
          daysLeft != null
            ? t("adminAcademicTermsUi.daysLeft", { n: daysLeft })
            : (selectedYear?.name ?? ""),
        accent: true,
      },
    ];
  }, [loading, terms, currentTerm, activeTerm, selectedYear, t]);

  return (
    <DashboardPage role="admin" title={tp("Terms")}>
      <div className="acad-page acad-page--terms">
        <AcademicsHero
          chip={t("adminAcademicTermsUi.chip")}
          compact
          backHref="/admin/academics"
          title={t("adminAcademicTermsUi.heroTitle")}
          subtitle={t("adminAcademicTermsUi.heroSub")}
          badges={
            <>
              {selectedYear ? (
                <AcademicsBadge variant="default">
                  {t("adminAcademicTermsUi.yearBadge", { name: selectedYear.name })}
                </AcademicsBadge>
              ) : null}
              {currentTerm ? (
                <AcademicsBadge variant="live">
                  {t("adminAcademicTermsUi.currentBadge", { name: currentTerm.name })}
                </AcademicsBadge>
              ) : (
                <AcademicsBadge variant="muted">{t("adminAcademicTermsUi.noCurrentTerm")}</AcademicsBadge>
              )}
            </>
          }
          stats={stats}
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

        <div className="acad-terms-toolbar">
          <div className="acad-year-picker acad-year-picker--inline">
            <div className="acad-year-picker__label">
              <DashIcon name="calendar" className="dash-icon--xs" />
              <span>{t("adminAcademicTermsUi.academicYear")}</span>
            </div>
            <select
              className="acad-year-picker__select"
              value={academicYearId}
              onChange={(e) => void onYearChange(e.target.value)}
              disabled={years.length === 0}
            >
              {years.length === 0 ? (
                <option value="">{t("adminAcademicTermsUi.noYearsOption")}</option>
              ) : null}
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isCurrent ? t("adminAcademicTermsUi.yearCurrentSuffix") : ""}
                </option>
              ))}
            </select>
            {years.length === 0 ? (
              <Link href="/admin/results/academic-years" className="acad-year-picker__link">
                {t("adminAcademicTermsUi.createYearLink")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="acad-terms-layout">
          <section className="acad-terms-main">
            <header className="acad-terms-main__head">
              <div>
                <h2 className="acad-terms-main__title">
                  {selectedYear ? selectedYear.name : t("adminAcademicTermsUi.statTerms")}
                </h2>
                <p className="acad-terms-main__sub">
                  {terms.length === 0
                    ? t("adminAcademicTermsUi.addFirstTerm")
                    : terms.length === 1
                      ? t("adminAcademicTermsUi.termsConfigured", { count: terms.length })
                      : t("adminAcademicTermsUi.termsConfiguredPlural", { count: terms.length })}
                </p>
              </div>
              {selectedYear ? (
                <span className="acad-terms-main__pct">
                  {t("adminAcademicTermsUi.percentOfYear", {
                    n: yearProgress(selectedYear.startDate, selectedYear.endDate),
                  })}
                </span>
              ) : null}
            </header>

            {loading ? (
              <div className="acad-terms-loading">
                <span className="acad-terms-loading__spinner" aria-hidden />
                <p>{t("adminAcademicTermsUi.loadingTerms")}</p>
              </div>
            ) : terms.length === 0 ? (
              <AcademicsEmpty message={t("adminAcademicTermsUi.emptyTerms")} />
            ) : (
              <ul className="acad-terms-timeline">
                {terms.map((term, index) => {
                  const status = termStatus(term.startDate, term.endDate);
                  const progress = termProgress(term.startDate, term.endDate);
                  const duration = termDurationDays(term.startDate, term.endDate);
                  const daysLeft = termDaysRemaining(term.endDate);
                  return (
                    <li
                      key={term.id}
                      className={`acad-term-item acad-term-item--${status}${term.isCurrent ? " acad-term-item--current" : ""}`}
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
                            <span className="acad-term-item__order">
                              {t("adminAcademicTermsUi.termOrder", { n: term.sortOrder + 1 })}
                            </span>
                            <h3 className="acad-term-item__name">{term.name}</h3>
                          </div>
                          <div className="acad-term-item__badges">
                            {term.isCurrent ? (
                              <AcademicsBadge variant="live">{t("adminAcademicTermsUi.current")}</AcademicsBadge>
                            ) : null}
                            <span className={`acad-term-item__status acad-term-item__status--${status}`}>
                              {status === "active"
                                ? t("adminAcademicTermsUi.inProgress")
                                : status === "upcoming"
                                  ? t("adminAcademicTermsUi.upcoming")
                                  : t("adminAcademicTermsUi.completed")}
                            </span>
                          </div>
                        </div>
                        <p className="acad-term-item__dates">
                          {formatAcadDate(term.startDate)} – {formatAcadDate(term.endDate)}
                          <span className="acad-term-item__duration">
                            ·{" "}
                            {duration === 1
                              ? t("adminAcademicTermsUi.dayDuration", { n: duration })
                              : t("adminAcademicTermsUi.daysDuration", { n: duration })}
                          </span>
                        </p>
                        <div
                          className="acad-term-item__bar"
                          title={t("adminAcademicTermsUi.percentComplete", { n: progress })}
                        >
                          <span
                            className={`acad-term-item__bar-fill acad-term-item__bar-fill--${status}`}
                            style={{ width: `${status === "upcoming" ? 0 : progress}%` }}
                          />
                        </div>
                        <p className="acad-term-item__meta">
                          {status === "active"
                            ? `${t("adminAcademicTermsUi.percentComplete", { n: progress })} · ${t("adminAcademicTermsUi.daysRemaining", { n: daysLeft })}`
                            : status === "upcoming"
                              ? t("adminAcademicTermsUi.startsSoon")
                              : t("adminAcademicTermsUi.termEnded")}
                        </p>
                        <div className="acad-term-item__actions">
                          <button
                            type="button"
                            className="acad-btn acad-btn--ghost acad-btn--sm"
                            onClick={() => startEdit(term)}
                          >
                            {t("adminAcademicTermsUi.edit")}
                          </button>
                          <button
                            type="button"
                            className="acad-btn acad-btn--danger acad-btn--sm"
                            disabled={deletingId === term.id}
                            onClick={() => void onDelete(term)}
                          >
                            {deletingId === term.id
                              ? t("adminAcademicTermsUi.deleting")
                              : t("adminAcademicTermsUi.delete")}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="acad-terms-form-panel">
            <form className="acad-terms-form" onSubmit={(e) => void onSave(e)}>
              <header className="acad-terms-form__head">
                <div className="acad-terms-form__icon" aria-hidden>
                  <DashIcon name="calendar" className="dash-icon--sm" />
                </div>
                <div>
                  <h3 className="acad-terms-form__title">
                    {editingTermId ? t("adminAcademicTermsUi.editTerm") : t("adminAcademicTermsUi.addTerm")}
                  </h3>
                  <p className="acad-terms-form__sub">
                    {editingTermId
                      ? t("adminAcademicTermsUi.editSub")
                      : terms.length === 0
                        ? t("adminAcademicTermsUi.startTerm1")
                        : t("adminAcademicTermsUi.nextUp", {
                            name: suggestNextTerm(terms, termNameFor).name,
                          })}
                  </p>
                </div>
              </header>

              <div className="acad-terms-form__fields">
                <label>
                  {t("adminAcademicTermsUi.termName")}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("adminAcademicTermsUi.termNamePh")}
                    required
                  />
                </label>
                <div className="acad-form__row">
                  <label>
                    {t("adminAcademicTermsUi.startDate")}
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {t("adminAcademicTermsUi.endDate")}
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label>
                  {t("adminAcademicTermsUi.termNumber")}
                  <input
                    type="number"
                    min={1}
                    value={termNumber}
                    onChange={(e) => setTermNumber(e.target.value)}
                    placeholder="1"
                  />
                </label>
                <label className="acad-form__check acad-terms-form__check">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                  />
                  {t("adminAcademicTermsUi.setCurrent")}
                </label>
              </div>

              <div className="acad-terms-form__actions">
                <button
                  type="submit"
                  className="acad-btn acad-btn--primary acad-btn--block"
                  disabled={saving || years.length === 0}
                >
                  {saving
                    ? t("common.saving")
                    : editingTermId
                      ? t("adminAcademicTermsUi.saveChanges")
                      : t("adminAcademicTermsUi.createTerm")}
                </button>
                {editingTermId ? (
                  <button
                    type="button"
                    className="acad-btn acad-btn--ghost acad-btn--block"
                    disabled={saving}
                    onClick={cancelEdit}
                  >
                    {t("adminAcademicTermsUi.cancelEdit")}
                  </button>
                ) : null}
                <p className="acad-terms-form__hint">{t("adminAcademicTermsUi.formHint")}</p>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </DashboardPage>
  );
}
