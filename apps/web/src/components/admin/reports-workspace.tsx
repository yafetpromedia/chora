"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { AppToast } from "@/components/ui/app-toast";
import { downloadAttendanceExport } from "@/lib/attendance";
import { downloadFinanceExport } from "@/lib/finance";
import {
  downloadParentsReport,
  downloadStudentsReport,
  downloadTeachersReport,
} from "@/lib/school-reports";
import {
  downloadStaffAttendanceCsv,
  downloadStaffPayrollCsv,
} from "@/lib/staff-attendance";
import { listGrades } from "@/lib/school-setup";
import {
  downloadResultsExport,
  listTerms,
  type AcademicTerm,
} from "@/lib/results";
import type { GradeWithSections } from "@/lib/api";

type DatePreset = "7" | "30" | "90" | "term";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

function rangeForPreset(preset: DatePreset, term?: AcademicTerm | null) {
  const to = new Date();
  if (preset === "term" && term?.startDate && term?.endDate) {
    return {
      from: term.startDate.slice(0, 10),
      to: term.endDate.slice(0, 10),
    };
  }
  const from = new Date();
  const days = preset === "7" ? 7 : preset === "90" ? 90 : 30;
  from.setDate(to.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
}

export function ReportsWorkspace() {
  const { t } = useLocale();
  const defaults = useMemo(() => defaultDateRange(), []);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [termId, setTermId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [preset, setPreset] = useState<DatePreset>("30");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastExport, setLastExport] = useState("");

  const emptyDash = t("reportsHubUi.emptyDash");

  useEffect(() => {
    void Promise.all([listTerms(), listGrades()])
      .then(([termList, gradeList]) => {
        setTerms(termList);
        setGrades(gradeList);
        const current = termList.find((term) => term.isCurrent) ?? termList[0];
        if (current) setTermId((prev) => prev || current.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("reportsHubUi.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const currentTerm =
    terms.find((term) => term.isCurrent) ?? terms.find((term) => term.id === termId);

  function applyPreset(next: DatePreset) {
    setPreset(next);
    const range = rangeForPreset(next, currentTerm);
    setFrom(range.from);
    setTo(range.to);
  }

  async function runExport(id: string, label: string, action: () => Promise<void>) {
    setBusy(id);
    setError("");
    setSuccess("");
    try {
      await action();
      setLastExport(label);
      setSuccess(t("reportsHubUi.downloadStarted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reportsHubUi.exportFailed"));
    } finally {
      setBusy(null);
    }
  }

  const periodValue =
    from && to ? `${from}${t("reportsHubUi.periodArrow")}${to}` : emptyDash;
  const rangeReady = Boolean(from && to);

  return (
    <div className="rpt-hub">
      <AcademicsHero
        chip={t("reportsHubUi.chip")}
        title={t("reportsHubUi.title")}
        subtitle={t("reportsHubUi.subtitle")}
        stats={[
          { label: t("reportsHubUi.statTerms"), value: loading ? emptyDash : terms.length },
          { label: t("reportsHubUi.statGrades"), value: loading ? emptyDash : grades.length },
          { label: t("reportsHubUi.statPeriod"), value: periodValue },
          {
            label: t("reportsHubUi.statLast"),
            value: lastExport || emptyDash,
            accent: Boolean(lastExport),
          },
        ]}
        badges={
          currentTerm ? (
            <AcademicsBadge variant="live">{currentTerm.name}</AcademicsBadge>
          ) : (
            <AcademicsBadge variant="muted">{t("reportsHubUi.noCurrentTerm")}</AcademicsBadge>
          )
        }
      />

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

      <section className="rpt-hub__toolbar" aria-label={t("reportsHubUi.periodToolbarAria")}>
        <div className="rpt-hub__toolbar-copy">
          <p className="rpt-hub__toolbar-kicker">{t("reportsHubUi.periodKicker")}</p>
          <h2 className="rpt-hub__toolbar-title">{t("reportsHubUi.periodTitle")}</h2>
          <p className="rpt-hub__toolbar-hint">{t("reportsHubUi.periodHint")}</p>
        </div>
        <div className="rpt-hub__toolbar-fields">
          <label className="rpt-hub__field">
            <span>{t("reportsHubUi.from")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("30");
              }}
            />
          </label>
          <label className="rpt-hub__field">
            <span>{t("reportsHubUi.to")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("30");
              }}
            />
          </label>
        </div>
        <div className="rpt-hub__presets" role="group" aria-label={t("reportsHubUi.presetsAria")}>
          {(
            [
              ["7", "preset7"],
              ["30", "preset30"],
              ["90", "preset90"],
              ["term", "presetTerm"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`rpt-hub__preset${preset === id ? " is-active" : ""}`}
              onClick={() => applyPreset(id)}
              disabled={id === "term" && !currentTerm}
            >
              {t(`reportsHubUi.${key}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="rpt-hub__section" aria-labelledby="rpt-section-academic">
        <header className="rpt-hub__section-head">
          <h2 id="rpt-section-academic" className="rpt-hub__section-title">
            {t("reportsHubUi.sectionAcademic")}
          </h2>
          <p className="rpt-hub__section-sub">{t("reportsHubUi.sectionAcademicSub")}</p>
        </header>
        <div className="rpt-hub__grid">
          <article className="rpt-hub__card" aria-labelledby="rpt-attendance">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="attendance" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-attendance" className="rpt-hub__card-title">
                  {t("reportsHubUi.attendanceTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.attendanceSub")}</p>
                <p className="rpt-hub__card-meta">{periodValue}</p>
              </div>
            </header>
            <div className="rpt-hub__actions">
              <button
                type="button"
                className="rpt-hub__btn"
                disabled={!rangeReady || busy != null}
                onClick={() =>
                  void runExport("attendance", t("reportsHubUi.attendanceTitle"), () =>
                    downloadAttendanceExport(from, to),
                  )
                }
              >
                {busy === "attendance" ? t("reportsHubUi.preparing") : t("reportsHubUi.downloadCsv")}
              </button>
            </div>
          </article>

          <article className="rpt-hub__card" aria-labelledby="rpt-fees">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="finance" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-fees" className="rpt-hub__card-title">
                  {t("reportsHubUi.feesTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.feesSub")}</p>
                <p className="rpt-hub__card-meta">{periodValue}</p>
              </div>
            </header>
            <div className="rpt-hub__actions">
              <button
                type="button"
                className="rpt-hub__btn"
                disabled={!rangeReady || busy != null}
                onClick={() =>
                  void runExport("fees", t("reportsHubUi.feesTitle"), () =>
                    downloadFinanceExport(from, to),
                  )
                }
              >
                {busy === "fees" ? t("reportsHubUi.preparing") : t("reportsHubUi.downloadCsv")}
              </button>
            </div>
          </article>

          <article className="rpt-hub__card" aria-labelledby="rpt-results">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="results" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-results" className="rpt-hub__card-title">
                  {t("reportsHubUi.resultsTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.resultsSub")}</p>
              </div>
            </header>
            <div className="rpt-hub__filters rpt-hub__filters--stack">
              <label className="rpt-hub__field">
                <span>{t("reportsHubUi.term")}</span>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  disabled={loading || terms.length === 0}
                >
                  {terms.length === 0 ? (
                    <option value="">{t("reportsHubUi.noTerms")}</option>
                  ) : (
                    terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                        {term.isCurrent ? t("reportsHubUi.currentSuffix") : ""} —{" "}
                        {term.academicYear.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="rpt-hub__field">
                <span>{t("reportsHubUi.gradeOptional")}</span>
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">{t("reportsHubUi.allGrades")}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rpt-hub__actions">
              <button
                type="button"
                className="rpt-hub__btn"
                disabled={!termId || busy != null}
                onClick={() =>
                  void runExport("results", t("reportsHubUi.resultsTitle"), () =>
                    downloadResultsExport(termId, gradeId || undefined),
                  )
                }
              >
                {busy === "results" ? t("reportsHubUi.preparing") : t("reportsHubUi.downloadCsv")}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="rpt-hub__section" aria-labelledby="rpt-section-people">
        <header className="rpt-hub__section-head">
          <h2 id="rpt-section-people" className="rpt-hub__section-title">
            {t("reportsHubUi.sectionPeople")}
          </h2>
          <p className="rpt-hub__section-sub">{t("reportsHubUi.sectionPeopleSub")}</p>
        </header>
        <div className="rpt-hub__grid">
          <article className="rpt-hub__card" aria-labelledby="rpt-rosters">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="users" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-rosters" className="rpt-hub__card-title">
                  {t("reportsHubUi.rostersTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.rostersSub")}</p>
              </div>
            </header>
            <div className="rpt-hub__roster-actions">
              <button
                type="button"
                className="rpt-hub__btn rpt-hub__btn--ghost"
                disabled={busy != null}
                onClick={() =>
                  void runExport("students", t("reportsHubUi.studentsCsv"), () =>
                    downloadStudentsReport(),
                  )
                }
              >
                {busy === "students" ? t("reportsHubUi.preparing") : t("reportsHubUi.studentsCsv")}
              </button>
              <button
                type="button"
                className="rpt-hub__btn rpt-hub__btn--ghost"
                disabled={busy != null}
                onClick={() =>
                  void runExport("teachers", t("reportsHubUi.teachersCsv"), () =>
                    downloadTeachersReport(),
                  )
                }
              >
                {busy === "teachers" ? t("reportsHubUi.preparing") : t("reportsHubUi.teachersCsv")}
              </button>
              <button
                type="button"
                className="rpt-hub__btn rpt-hub__btn--ghost"
                disabled={busy != null}
                onClick={() =>
                  void runExport("parents", t("reportsHubUi.parentsCsv"), () =>
                    downloadParentsReport(),
                  )
                }
              >
                {busy === "parents" ? t("reportsHubUi.preparing") : t("reportsHubUi.parentsCsv")}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="rpt-hub__section" aria-labelledby="rpt-section-staff">
        <header className="rpt-hub__section-head">
          <h2 id="rpt-section-staff" className="rpt-hub__section-title">
            {t("reportsHubUi.sectionStaff")}
          </h2>
          <p className="rpt-hub__section-sub">{t("reportsHubUi.sectionStaffSub")}</p>
        </header>
        <div className="rpt-hub__grid">
          <article className="rpt-hub__card" aria-labelledby="rpt-staff-att">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="id-card" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-staff-att" className="rpt-hub__card-title">
                  {t("reportsHubUi.staffAttendanceTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.staffAttendanceSub")}</p>
                <p className="rpt-hub__card-meta">{periodValue}</p>
              </div>
            </header>
            <div className="rpt-hub__actions">
              <button
                type="button"
                className="rpt-hub__btn"
                disabled={!rangeReady || busy != null}
                onClick={() =>
                  void runExport(
                    "staff-attendance",
                    t("reportsHubUi.staffAttendanceTitle"),
                    () => downloadStaffAttendanceCsv({ from, to }),
                  )
                }
              >
                {busy === "staff-attendance"
                  ? t("reportsHubUi.preparing")
                  : t("reportsHubUi.downloadCsv")}
              </button>
            </div>
          </article>

          <article className="rpt-hub__card" aria-labelledby="rpt-staff-pay">
            <header className="rpt-hub__card-head">
              <span className="rpt-hub__card-icon" aria-hidden>
                <DashIcon name="fees" className="dash-icon--sm" />
              </span>
              <div>
                <h3 id="rpt-staff-pay" className="rpt-hub__card-title">
                  {t("reportsHubUi.staffPayrollTitle")}
                </h3>
                <p className="rpt-hub__card-sub">{t("reportsHubUi.staffPayrollSub")}</p>
                <p className="rpt-hub__card-meta">{periodValue}</p>
              </div>
            </header>
            <div className="rpt-hub__actions">
              <button
                type="button"
                className="rpt-hub__btn"
                disabled={!rangeReady || busy != null}
                onClick={() =>
                  void runExport("staff-payroll", t("reportsHubUi.staffPayrollTitle"), () =>
                    downloadStaffPayrollCsv({ from, to }),
                  )
                }
              >
                {busy === "staff-payroll"
                  ? t("reportsHubUi.preparing")
                  : t("reportsHubUi.downloadCsv")}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="rpt-hub__section" aria-labelledby="rpt-section-more">
        <header className="rpt-hub__section-head">
          <h2 id="rpt-section-more" className="rpt-hub__section-title">
            {t("reportsHubUi.sectionMore")}
          </h2>
          <p className="rpt-hub__section-sub">{t("reportsHubUi.sectionMoreSub")}</p>
        </header>
        <div className="rpt-hub__links">
          <Link href="/admin/report-cards" className="rpt-hub__link">
            <span className="rpt-hub__link-icon" aria-hidden>
              <DashIcon name="report-card" className="dash-icon--sm" />
            </span>
            <span>
              <strong>{t("reportsHubUi.linkReportCards")}</strong>
              <span>{t("reportsHubUi.linkReportCardsSub")}</span>
            </span>
            <DashIcon name="chevron" className="dash-icon--xs rpt-hub__link-arrow" />
          </Link>
          <Link href="/admin/results" className="rpt-hub__link">
            <span className="rpt-hub__link-icon" aria-hidden>
              <DashIcon name="results" className="dash-icon--sm" />
            </span>
            <span>
              <strong>{t("reportsHubUi.linkResults")}</strong>
              <span>{t("reportsHubUi.linkResultsSub")}</span>
            </span>
            <DashIcon name="chevron" className="dash-icon--xs rpt-hub__link-arrow" />
          </Link>
          <Link href="/admin/finance" className="rpt-hub__link">
            <span className="rpt-hub__link-icon" aria-hidden>
              <DashIcon name="finance" className="dash-icon--sm" />
            </span>
            <span>
              <strong>{t("reportsHubUi.linkFinance")}</strong>
              <span>{t("reportsHubUi.linkFinanceSub")}</span>
            </span>
            <DashIcon name="chevron" className="dash-icon--xs rpt-hub__link-arrow" />
          </Link>
          <Link href="/admin/staff-attendance" className="rpt-hub__link">
            <span className="rpt-hub__link-icon" aria-hidden>
              <DashIcon name="attendance" className="dash-icon--sm" />
            </span>
            <span>
              <strong>{t("reportsHubUi.linkStaffAtt")}</strong>
              <span>{t("reportsHubUi.linkStaffAttSub")}</span>
            </span>
            <DashIcon name="chevron" className="dash-icon--xs rpt-hub__link-arrow" />
          </Link>
          <Link href="/admin/payroll" className="rpt-hub__link">
            <span className="rpt-hub__link-icon" aria-hidden>
              <DashIcon name="fees" className="dash-icon--sm" />
            </span>
            <span>
              <strong>{t("reportsHubUi.linkPayroll")}</strong>
              <span>{t("reportsHubUi.linkPayrollSub")}</span>
            </span>
            <DashIcon name="chevron" className="dash-icon--xs rpt-hub__link-arrow" />
          </Link>
        </div>
      </section>
    </div>
  );
}
