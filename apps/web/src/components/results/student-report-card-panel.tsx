"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getMyReportCard,
  getMyReportCardStatus,
  listTerms,
  openMyReportCardPrint,
  type AcademicTerm,
  type ReportCard,
} from "@/lib/results";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function StudentReportCardPanel() {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [termId, setTermId] = useState("");
  const [reportPublished, setReportPublished] = useState<boolean | null>(null);
  const [report, setReport] = useState<ReportCard | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const currentTerm = terms.find((t) => t.id === termId);

  useEffect(() => {
    void listTerms()
      .then((available) => {
        setTerms(available);
        const current = available.find((t) => t.isCurrent) ?? available[0];
        if (current) setTermId(current.id);
      })
      .catch((err) => setReportError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  const loadReport = useCallback(async () => {
    if (!termId) return;
    setReportError("");
    setReportLoading(true);
    setReport(null);
    setReportPublished(null);
    try {
      const status = await getMyReportCardStatus(termId);
      setReportPublished(status.published);
      if (status.published) {
        setReport(await getMyReportCard(termId));
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to load report card");
      setReportPublished(false);
    } finally {
      setReportLoading(false);
    }
  }, [termId]);

  useEffect(() => {
    if (loading || !termId) return;
    void loadReport();
  }, [loading, termId, loadReport]);

  return (
    <div className="stu-res stu-res--report-page">
      <section className="stu-res__panel stu-res__panel--report" aria-label="Report card">
        <header className="stu-res__hero stu-res__hero--report">
          <div>
            <p className="stu-res__eyebrow">Official document</p>
            <h2 className="stu-res__hero-title">Term report card</h2>
            <p className="stu-res__hero-sub">
              Your final report is published once per term or year, after teachers submit
              scores and the school approves them. This is your official academic summary.
            </p>
          </div>
          {reportPublished ? (
            <span className="stu-res__status stu-res__status--published">Published</span>
          ) : reportPublished === false ? (
            <span className="stu-res__status stu-res__status--locked">
              <LockIcon className="stu-res__status-icon" />
              Not published
            </span>
          ) : null}
        </header>

        <div className="stu-res__report-controls">
          <label className="stu-res__field">
            <span>Academic period</span>
            <select
              className="stu-res__select"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={loading || terms.length === 0}
            >
              {terms.length === 0 ? (
                <option value="">No terms</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} — {term.academicYear.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="stu-res__report-actions">
            <button
              type="button"
              className="stu-res__btn stu-res__btn--primary"
              onClick={() => void loadReport()}
              disabled={!termId || reportLoading}
            >
              {reportLoading ? "Loading…" : "Refresh report card"}
            </button>
            {reportPublished && termId ? (
              <button
                type="button"
                className="stu-res__btn stu-res__btn--ghost"
                onClick={() => openMyReportCardPrint(termId)}
              >
                Print / PDF
              </button>
            ) : null}
          </div>
        </div>

        {reportError ? <p className="stu-res__alert stu-res__alert--error">{reportError}</p> : null}

        {reportLoading ? (
          <div className="stu-res__loading">
            <span className="stu-res__spinner" aria-hidden />
            <p>Checking report card status…</p>
          </div>
        ) : reportPublished === false ? (
          <div className="stu-res__empty stu-res__empty--report">
            <LockIcon className="stu-res__empty-icon" />
            <h3>Report card not ready</h3>
            <p>
              {currentTerm
                ? `Your ${currentTerm.name} report card has not been published yet.`
                : "Your report card has not been published yet."}{" "}
              The school releases this at the end of the term after all subjects are approved.
            </p>
            <p className="stu-res__empty-note">
              For day-to-day marks, see{" "}
              <Link href="/student/results" className="stu-res__inline-link">
                Results
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
                <span>Overall</span>
                <strong>
                  {report.overallAverage ?? "—"}%
                  {report.overallLetter ? ` (${report.overallLetter})` : ""}
                </strong>
              </div>
              {report.rank ? (
                <div className="stu-res__report-kpi">
                  <span>Class rank</span>
                  <strong>
                    {report.rank} / {report.classSize}
                  </strong>
                </div>
              ) : null}
              {report.attendance?.rate != null ? (
                <div className="stu-res__report-kpi">
                  <span>Attendance</span>
                  <strong>{report.attendance.rate}%</strong>
                </div>
              ) : null}
            </div>

            <table className="stu-res__report-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Average</th>
                  <th>Grade</th>
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
                    <h4>Teacher comment</h4>
                    <p>{report.teacherComment}</p>
                  </div>
                ) : null}
                {report.principalComment ? (
                  <div>
                    <h4>Principal comment</h4>
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
