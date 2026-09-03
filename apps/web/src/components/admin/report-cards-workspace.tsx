"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { ReportCardCommentsPanel } from "@/components/results/report-card-comments-panel";
import {
  ResultsStudentPicker,
  type ResultsStudentOption,
} from "@/components/results/results-student-picker";
import { AppToast } from "@/components/ui/app-toast";
import type { StudentRecord } from "@/lib/api";
import {
  getReportCard,
  getReportCardPublishStatus,
  listTerms,
  openReportCardPrint,
  publishReportCardsForStudent,
  type AcademicTerm,
  type ReportCard,
  type ReportCardPrintMode,
  type ReportCardPublishStatus,
} from "@/lib/results";

type Props = {
  students: StudentRecord[];
  onError?: (message: string) => void;
};

export function ReportCardsWorkspace({ students, onError }: Props) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [printMode, setPrintMode] = useState<ReportCardPrintMode>("term");
  const [viewStudentId, setViewStudentId] = useState("");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [publishStatus, setPublishStatus] = useState<ReportCardPublishStatus | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const setErr = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  useEffect(() => {
    setLoading(true);
    void listTerms()
      .then((t) => {
        setTerms(t);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId((prev) => prev || current.id);
        if (students[0]) setViewStudentId((prev) => prev || students[0].id);
      })
      .catch((err) => {
        setErr(err instanceof Error ? err.message : "Could not load report cards workspace");
      })
      .finally(() => setLoading(false));
  }, [setErr, students]);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms.find((t) => t.id === termId);
  const selectedStudent = students.find((s) => s.id === viewStudentId);

  const studentOptions = useMemo<ResultsStudentOption[]>(
    () =>
      students.map((s) => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        grade: s.grade.name,
        gradeId: s.grade.id,
        section: s.section?.name ?? null,
        sectionId: s.section?.id ?? null,
        studentId: s.user.externalRef,
        photoUrl: s.photoUrl,
      })),
    [students],
  );

  const heroStats = useMemo(
    () => [
      { label: "Students", value: loading ? "—" : students.length },
      { label: "Terms", value: loading ? "—" : terms.length },
      {
        label: "Ready to print",
        value: loading ? "—" : report ? "1 loaded" : "—",
        accent: !!report,
      },
    ],
    [loading, students.length, terms.length, report],
  );

  function scoreToneClass(score: number) {
    if (score >= 85) return "rc-preview-bar--excellent";
    if (score >= 70) return "rc-preview-bar--good";
    if (score >= 50) return "rc-preview-bar--fair";
    return "rc-preview-bar--low";
  }

  function studentInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  function onSelectionChange(studentId: string, nextTermId: string) {
    setViewStudentId(studentId);
    setTermId(nextTermId);
    setReport(null);
    setPublishStatus(null);
    setSuccess("");
  }

  async function refreshPublishStatus(studentId: string, nextTermId: string) {
    if (!studentId || !nextTermId) {
      setPublishStatus(null);
      return;
    }
    try {
      setPublishStatus(await getReportCardPublishStatus(studentId, nextTermId));
    } catch {
      setPublishStatus(null);
    }
  }

  useEffect(() => {
    if (!viewStudentId || !termId) return;
    void refreshPublishStatus(viewStudentId, termId);
  }, [viewStudentId, termId]);

  async function onPreviewReport() {
    if (!viewStudentId || !termId) return;
    setPreviewBusy(true);
    setError("");
    try {
      setReport(await getReportCard(viewStudentId, termId));
      await refreshPublishStatus(viewStudentId, termId);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not load report card");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function onPublishReportCards() {
    if (!viewStudentId || !termId || !selectedStudent) return;
    const gradeLabel = `${selectedStudent.grade.name}${
      selectedStudent.section ? ` · ${selectedStudent.section.name}` : ""
    }`;
    if (
      !window.confirm(
        `Publish report cards for ${gradeLabel} in this term?\n\nStudents and parents will be able to open the official report card. This publishes all subject sheets for the class.`,
      )
    ) {
      return;
    }
    setPublishBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await publishReportCardsForStudent(viewStudentId, termId);
      await refreshPublishStatus(viewStudentId, termId);
      setSuccess(
        result.published > 0
          ? `Published ${result.published} subject sheet${result.published === 1 ? "" : "s"} for ${gradeLabel}. Families can open the report card now.`
          : `Report cards already published for ${gradeLabel}.`,
      );
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not publish report cards");
    } finally {
      setPublishBusy(false);
    }
  }

  return (
    <div className="acad-page acad-page--results rc-v2">
      <AcademicsHero
        title="Report cards"
        subtitle={
          selectedStudent
            ? `Preview, comment, and print the official booklet for ${selectedStudent.user.firstName} ${selectedStudent.user.lastName}.`
            : "Preview student report cards, add teacher comments, and print the official booklet for families."
        }
        stats={heroStats}
        badges={
          <>
            {currentTerm ? (
              <AcademicsBadge variant="live">{currentTerm.name}</AcademicsBadge>
            ) : (
              <AcademicsBadge variant="muted">No current term</AcademicsBadge>
            )}
            {selectedStudent ? (
              <span className="rc-v2__hero-badge">
                {selectedStudent.grade.name}
                {selectedStudent.section ? ` · ${selectedStudent.section.name}` : ""}
              </span>
            ) : null}
          </>
        }
      />

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

      <div className="rc-v2__toolbar">
        <div className="rc-v2__student-pick">
          <ResultsStudentPicker
            students={studentOptions}
            value={viewStudentId}
            onChange={(id) => onSelectionChange(id, termId)}
            disabled={loading || students.length === 0}
          />
        </div>
        <label className="rc-v2__field">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <span>Term</span>
          <select
            value={termId}
            onChange={(e) => onSelectionChange(viewStudentId, e.target.value)}
            disabled={loading || terms.length === 0}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="rc-v2__field rc-v2__field--mode" role="group" aria-label="Report type">
          <span>Report type</span>
          <div className="rc-v2__mode-toggle">
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "term" ? " is-active" : ""}`}
              aria-pressed={printMode === "term"}
              onClick={() => setPrintMode("term")}
            >
              Term
            </button>
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "annual" ? " is-active" : ""}`}
              aria-pressed={printMode === "annual"}
              onClick={() => setPrintMode("annual")}
            >
              Year-end
            </button>
          </div>
        </div>
        <div className="rc-v2__toolbar-actions">
          {publishStatus ? (
            <span
              className={`rc-v2__publish-pill${
                publishStatus.published ? " is-live" : ""
              }`}
            >
              {publishStatus.published
                ? "Visible to families"
                : `${publishStatus.publishedCount}/${publishStatus.total} sheets published`}
            </span>
          ) : null}
          <button
            type="button"
            className="rc-v2__btn rc-v2__btn--primary"
            disabled={previewBusy || !viewStudentId || !termId}
            onClick={() => void onPreviewReport()}
          >
            {previewBusy ? "Loading…" : "Load preview"}
          </button>
          {viewStudentId && termId ? (
            <button
              type="button"
              className="rc-v2__btn rc-v2__btn--accent"
              disabled={
                publishBusy ||
                !publishStatus?.canPublish ||
                publishStatus.published
              }
              onClick={() => void onPublishReportCards()}
              title="Publish all subject sheets for this student's class so families can open the report card"
            >
              {publishBusy
                ? "Publishing…"
                : publishStatus?.published
                  ? "Published"
                  : "Publish to families"}
            </button>
          ) : null}
          {viewStudentId && termId ? (
            <button
              type="button"
              className="rc-v2__btn rc-v2__btn--ghost"
              onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
            >
              Print / PDF
            </button>
          ) : null}
        </div>
      </div>

      <div className="rc-v2__grid">
        <section className="rc-v2__card" aria-label="Report card preview">
          <header className="rc-v2__card-head">
            <span className="rc-v2__card-icon" aria-hidden>
              <DashIcon name="report-card" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="rc-v2__card-title">Preview &amp; print</h3>
              <p className="rc-v2__card-sub">
                {printMode === "annual"
                  ? "Year-end report with full-year scores and promotion stamp when available."
                  : "Term report for the selected period — one page for families."}
              </p>
            </div>
          </header>

          {report ? (
            <div className="rc-booklet">
              <p className="rc-booklet__hint">
                {printMode === "annual"
                  ? "A4 landscape · year-end summary + results grid · promotion stamp when recorded"
                  : "A4 landscape · single-page term report · school header from Settings"}
              </p>

              <div className="rc-booklet__pages">
                <article className="rc-booklet__page" aria-label="Front page preview">
                  <header className="rc-booklet__brand">
                    {report.school.logoUrl ? (
                      <img src={report.school.logoUrl} alt="" className="rc-booklet__logo" />
                    ) : (
                      <span className="rc-booklet__logo rc-booklet__logo--fallback" aria-hidden>
                        {report.school.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="rc-booklet__doc">Student report card</p>
                      <h4>{report.school.name}</h4>
                      <p>
                        {report.term.academicYear} · {report.term.name}
                      </p>
                    </div>
                    <span className="rc-booklet__side">Front</span>
                  </header>

                  <div className="rc-booklet__front">
                    <div className="rc-booklet__student">
                      <span className="rc-booklet__avatar" aria-hidden>
                        {studentInitials(report.student.name)}
                      </span>
                      <div>
                        <strong>{report.student.name}</strong>
                        <span>
                          {report.student.grade}
                          {report.student.section ? ` · ${report.student.section}` : ""}
                          {report.student.studentId ? ` · ${report.student.studentId}` : ""}
                        </span>
                      </div>
                    </div>

                    <div
                      className="rc-booklet__ring"
                      style={
                        report.overallAverage != null
                          ? ({ "--pct": `${report.overallAverage}%` } as CSSProperties)
                          : undefined
                      }
                    >
                      <strong>{report.overallAverage ?? "—"}%</strong>
                      <span>Overall{report.overallLetter ? ` · ${report.overallLetter}` : ""}</span>
                    </div>
                  </div>

                  <div className="rc-booklet__chips">
                    {report.rank != null ? (
                      <div>
                        <strong>
                          {report.rank}/{report.classSize}
                        </strong>
                        <span>Rank</span>
                      </div>
                    ) : null}
                    {report.attendance?.rate != null ? (
                      <div>
                        <strong>{report.attendance.rate}%</strong>
                        <span>Attendance</span>
                      </div>
                    ) : null}
                    <div>
                      <strong>{report.subjects.length}</strong>
                      <span>Subjects</span>
                    </div>
                  </div>

                  <ul className="rc-booklet__subjects">
                    {report.subjects.slice(0, 6).map((s) => (
                      <li key={s.subject}>
                        <span>{s.subject}</span>
                        <strong>
                          {s.average}% <em>{s.letter}</em>
                        </strong>
                        <i
                          className={scoreToneClass(s.average)}
                          style={{ width: `${Math.min(100, s.average)}%` }}
                        />
                      </li>
                    ))}
                  </ul>
                  {(report.teacherComment || report.principalComment) && (
                    <div className="rc-booklet__notes">
                      {report.teacherComment ? (
                        <p>
                          <strong>Teacher</strong> {report.teacherComment}
                        </p>
                      ) : null}
                      {report.principalComment ? (
                        <p>
                          <strong>Principal</strong> {report.principalComment}
                        </p>
                      ) : null}
                    </div>
                  )}
                </article>

                <article className="rc-booklet__page" aria-label="Back page preview">
                  <header className="rc-booklet__brand rc-booklet__brand--compact">
                    <div>
                      <p className="rc-booklet__doc">Detailed results</p>
                      <h4>{report.school.name}</h4>
                      <p>
                        {report.student.name} · year grid T1–T4 / S1–S2
                      </p>
                    </div>
                    <span className="rc-booklet__side">Back</span>
                  </header>
                  <div className="rc-booklet__table-wrap">
                    <table className="rc-booklet__table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Avg</th>
                          <th>Letter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.subjects.map((s) => (
                          <tr key={s.subject}>
                            <th scope="row">{s.subject}</th>
                            <td>{s.average}%</td>
                            <td>{s.letter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="rc-booklet__back-note">
                    Full print includes all terms, semester averages, cumulative totals, absent
                    days, conduct, rank, and remarks on the back of the landscape sheet.
                  </p>
                </article>
              </div>

              <div className="rc-booklet__actions">
                <button
                  type="button"
                  className="rc-v2__btn rc-v2__btn--primary"
                  onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
                >
                  Open print {printMode === "annual" ? "year-end" : "term"} report
                </button>
                <p>Print duplex · landscape A4 · customize header in Settings</p>
              </div>
            </div>
          ) : (
            <div className="rc-v2__empty">
              <span className="rc-v2__empty-icon" aria-hidden>
                <DashIcon name="report-card" className="dash-icon--lg" />
              </span>
              <h4>No preview loaded</h4>
              <p>Choose a student and term above, then load to review before printing.</p>
            </div>
          )}
        </section>

        <section className="rc-v2__card" aria-label="Report card comments">
          <ReportCardCommentsPanel
            terms={terms}
            students={students}
            defaultTermId={termId}
            defaultStudentId={viewStudentId}
            hideSelectors
            onError={setErr}
          />
        </section>
      </div>

      <p className="rc-v2__footer-hint">
        Scores must be published before report cards reflect final marks. Manage grading in{" "}
        <Link href="/admin/results" className="rc-v2__text-link">
          Results
        </Link>
        .
      </p>
    </div>
  );
}
