"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useHydrated } from "@/lib/use-client-snapshot";
import {
  getMyReportCard,
  getMyReportCardStatus,
  listTerms,
  openMyReportCardPrint,
  type AcademicTerm,
  type ReportCard,
  type ReportCardPrintMode,
} from "@/lib/results";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type Props = {
  role?: "student" | "parent";
  studentProfileId?: string;
  resultsHref?: string;
};

export function StudentReportCardPanel({
  role = "student",
  studentProfileId,
  resultsHref,
}: Props) {
  const { t, tn } = useLocale();
  const hydrated = useHydrated();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [termId, setTermId] = useState("");
  const [printMode, setPrintMode] = useState<ReportCardPrintMode>("term");
  const [reportPublished, setReportPublished] = useState<boolean | null>(null);
  const [report, setReport] = useState<ReportCard | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const currentTerm = terms.find((t) => t.id === termId);
  const selectDisabled = !hydrated || loading || terms.length === 0;
  const refreshDisabled = !hydrated || !termId || reportLoading;
  const resolvedResultsHref =
    resultsHref ?? (role === "parent" ? "/parent/results" : "/student/results");
  const printBase = role === "parent" ? "/parent" : "/student";
  const waitingForChild = role === "parent" && !studentProfileId;

  useEffect(() => {
    void listTerms()
      .then((available) => {
        setTerms(available);
        const current = available.find((t) => t.isCurrent) ?? available[0];
        if (current) setTermId(current.id);
      })
      .catch((err) =>
        setReportError(err instanceof Error ? err.message : t("resultsUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadReport = useCallback(async () => {
    if (!termId) return;
    if (role === "parent" && !studentProfileId) return;
    setReportError("");
    setReportLoading(true);
    setReport(null);
    setReportPublished(null);
    try {
      const status = await getMyReportCardStatus(termId, studentProfileId);
      setReportPublished(status.published);
      if (status.published) {
        setReport(await getMyReportCard(termId, studentProfileId));
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : t("resultsUi.loadReportFailed"));
      setReportPublished(false);
    } finally {
      setReportLoading(false);
    }
  }, [termId, role, studentProfileId, t]);

  const autoLoad = hydrated && !loading && Boolean(termId) && !waitingForChild;
  const autoLoadKey = autoLoad ? `${termId}|${role}|${studentProfileId ?? ""}` : "";
  const [prevAutoLoadKey, setPrevAutoLoadKey] = useState("");
  if (autoLoadKey !== prevAutoLoadKey) {
    setPrevAutoLoadKey(autoLoadKey);
    if (autoLoadKey) {
      setReportError("");
      setReportLoading(true);
      setReport(null);
      setReportPublished(null);
    }
  }

  useEffect(() => {
    if (!autoLoad) return;
    void (async () => {
      try {
        const status = await getMyReportCardStatus(termId, studentProfileId);
        setReportPublished(status.published);
        if (status.published) {
          setReport(await getMyReportCard(termId, studentProfileId));
        }
      } catch (err) {
        setReportError(err instanceof Error ? err.message : t("resultsUi.loadReportFailed"));
        setReportPublished(false);
      } finally {
        setReportLoading(false);
      }
    })();
  }, [autoLoad, termId, studentProfileId]);

  return (
    <div className="stu-res stu-res--report-page">
      <section className="stu-res__panel stu-res__panel--report" aria-label={t("resultsUi.reportCardAria")}>
        <header className="stu-res__hero stu-res__hero--report">
          <div>
            <p className="stu-res__eyebrow">{t("resultsUi.officialDocument")}</p>
            <h2 className="stu-res__hero-title">
              {printMode === "annual"
                ? t("resultsUi.yearEndReportCard")
                : t("resultsUi.termReportCard")}
            </h2>
            <p className="stu-res__hero-sub">
              {printMode === "annual"
                ? role === "parent"
                  ? t("resultsUi.reportSubAnnualParent")
                  : t("resultsUi.reportSubAnnualStudent")
                : role === "parent"
                  ? t("resultsUi.reportSubTermParent")
                  : t("resultsUi.reportSubTermStudent")}
            </p>
          </div>
          {reportPublished ? (
            <span className="stu-res__status stu-res__status--published">{t("resultsUi.published")}</span>
          ) : reportPublished === false ? (
            <span className="stu-res__status stu-res__status--locked">
              <LockIcon className="stu-res__status-icon" />
              {t("resultsUi.notPublished")}
            </span>
          ) : null}
        </header>

        <div className="stu-res__report-controls">
          <label className="stu-res__field">
            <span>{t("resultsUi.academicPeriod")}</span>
            <select
              className="stu-res__select"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={selectDisabled}
            >
              {terms.length === 0 ? (
                <option value="">{t("resultsUi.noTerms")}</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} — {term.academicYear.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="stu-res__field" role="group" aria-label={t("resultsUi.reportTypeGroupAria")}>
            <span>{t("resultsUi.reportType")}</span>
            <div className="stu-res__mode-toggle">
              <button
                type="button"
                className={`stu-res__mode-btn${printMode === "term" ? " is-active" : ""}`}
                aria-pressed={printMode === "term"}
                onClick={() => setPrintMode("term")}
              >
                {t("resultsUi.modeTerm")}
              </button>
              <button
                type="button"
                className={`stu-res__mode-btn${printMode === "annual" ? " is-active" : ""}`}
                aria-pressed={printMode === "annual"}
                onClick={() => setPrintMode("annual")}
              >
                {t("resultsUi.modeYearEnd")}
              </button>
            </div>
          </div>
          <div className="stu-res__report-actions">
            <button
              type="button"
              className="stu-res__btn stu-res__btn--primary"
              onClick={() => void loadReport()}
              disabled={refreshDisabled || waitingForChild}
            >
              {reportLoading ? t("common.loading") : t("resultsUi.refreshReportCard")}
            </button>
            {reportPublished && termId ? (
              <button
                type="button"
                className="stu-res__btn stu-res__btn--ghost"
                onClick={() =>
                  openMyReportCardPrint(termId, printMode, {
                    studentProfileId,
                    basePath: printBase,
                  })
                }
              >
                {t("resultsUi.printPdf")}
              </button>
            ) : null}
          </div>
        </div>

        {reportError ? <p className="stu-res__alert stu-res__alert--error">{reportError}</p> : null}

        {waitingForChild ? (
          <div className="stu-res__loading">
            <span className="stu-res__spinner" aria-hidden />
            <p>{t("resultsUi.selectChildReport")}</p>
          </div>
        ) : reportLoading ? (
          <div className="stu-res__loading">
            <span className="stu-res__spinner" aria-hidden />
            <p>{t("resultsUi.checkingReport")}</p>
          </div>
        ) : reportPublished === false ? (
          <div className="stu-res__empty stu-res__empty--report">
            <LockIcon className="stu-res__empty-icon" />
            <h3>{t("resultsUi.reportNotReady")}</h3>
            <p>
              {currentTerm
                ? role === "parent"
                  ? t("resultsUi.reportNotPublishedTermParent", { term: currentTerm.name })
                  : t("resultsUi.reportNotPublishedTermStudent", { term: currentTerm.name })
                : role === "parent"
                  ? t("resultsUi.reportNotPublishedGenericParent")
                  : t("resultsUi.reportNotPublishedGenericStudent")}{" "}
              {t("resultsUi.reportReleaseNote")}
            </p>
            <p className="stu-res__empty-note">
              {t("resultsUi.forDayToDay")}{" "}
              <Link href={resolvedResultsHref} className="stu-res__inline-link">
                {tn("Results")}
              </Link>
              .
            </p>
          </div>
        ) : report ? (
          <article className="stu-res__report-card">
            <header className="stu-res__report-card-head">
              <div>
                <p className="stu-res__report-school">{report.school.name}</p>
                <h3 className="stu-res__report-student">{report.student.name}</h3>
                <p className="stu-res__report-class">
                  {report.student.grade}
                  {report.student.section ? ` · ${report.student.section}` : ""}
                </p>
              </div>
              <div className="stu-res__report-term">
                <span>{report.term.name}</span>
                <small>{report.term.academicYear}</small>
              </div>
            </header>

            <div className="stu-res__report-summary">
              <div className="stu-res__report-kpi">
                <span>{t("resultsUi.overall")}</span>
                <strong>
                  {report.overallAverage ?? "—"}%
                  {report.overallLetter ? ` (${report.overallLetter})` : ""}
                </strong>
              </div>
              {report.rank ? (
                <div className="stu-res__report-kpi">
                  <span>{t("resultsUi.classRank")}</span>
                  <strong>
                    {report.rank} / {report.classSize}
                  </strong>
                </div>
              ) : null}
              {report.attendance?.rate != null ? (
                <div className="stu-res__report-kpi">
                  <span>{t("resultsUi.attendance")}</span>
                  <strong>{report.attendance.rate}%</strong>
                </div>
              ) : null}
            </div>

            <table className="stu-res__report-table">
              <thead>
                <tr>
                  <th>{t("resultsUi.subjectCol")}</th>
                  <th>{t("resultsUi.averageCol")}</th>
                  <th>{t("resultsUi.gradeCol")}</th>
                </tr>
              </thead>
              <tbody>
                {report.subjects.map((subject) => (
                  <tr key={subject.subject}>
                    <td>{subject.subject}</td>
                    <td>{subject.average}%</td>
                    <td>{subject.letter}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {report.teacherComment || report.principalComment ? (
              <div className="stu-res__report-comments">
                {report.teacherComment ? (
                  <div>
                    <h4>{t("resultsUi.teacherComment")}</h4>
                    <p>{report.teacherComment}</p>
                  </div>
                ) : null}
                {report.principalComment ? (
                  <div>
                    <h4>{t("resultsUi.principalComment")}</h4>
                    <p>{report.principalComment}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}
      </section>
    </div>
  );
}
