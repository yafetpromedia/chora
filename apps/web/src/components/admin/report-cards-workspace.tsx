"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { ReportCardCommentsPanel } from "@/components/results/report-card-comments-panel";
import type { StudentRecord } from "@/lib/api";
import {
  getReportCard,
  listTerms,
  openReportCardPrint,
  type AcademicTerm,
  type ReportCard,
} from "@/lib/results";

type Props = {
  students: StudentRecord[];
  onError?: (message: string) => void;
};

export function ReportCardsWorkspace({ students, onError }: Props) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [viewStudentId, setViewStudentId] = useState("");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState("");

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
  }

  async function onPreviewReport() {
    if (!viewStudentId || !termId) return;
    setPreviewBusy(true);
    setError("");
    try {
      setReport(await getReportCard(viewStudentId, termId));
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not load report card");
    } finally {
      setPreviewBusy(false);
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

      {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}

      <div className="rc-v2__toolbar">
        <label className="rc-v2__field rc-v2__field--wide">
          <DashIcon name="students" className="dash-icon--sm" />
          <span>Student</span>
          <select
            value={viewStudentId}
            onChange={(e) => onSelectionChange(e.target.value, termId)}
            disabled={loading || students.length === 0}
          >
            {students.length === 0 ? (
              <option value="">No students enrolled</option>
            ) : null}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} — {s.grade.name}
              </option>
            ))}
          </select>
        </label>
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
        <div className="rc-v2__toolbar-actions">
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
              className="rc-v2__btn rc-v2__btn--ghost"
              onClick={() => openReportCardPrint(viewStudentId, termId)}
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
                Review scores and rankings before sending the family booklet.
              </p>
            </div>
          </header>

          {report ? (
            <div className="rc-preview">
              <div className="rc-preview__hero">
                <div className="rc-preview__identity">
                  <span className="rc-preview__avatar" aria-hidden>
                    {studentInitials(report.student.name)}
                  </span>
                  <div>
                    <h4>{report.student.name}</h4>
                    <p>
                      {report.student.grade}
                      {report.student.section ? ` · ${report.student.section}` : ""} ·{" "}
                      {report.term.name}
                    </p>
                  </div>
                </div>
                <div
                  className="rc-preview__ring"
                  style={
                    report.overallAverage != null
                      ? ({ "--pct": `${report.overallAverage}%` } as CSSProperties)
                      : undefined
                  }
                >
                  <strong>{report.overallAverage ?? "—"}%</strong>
                  <span>Overall</span>
                  {report.overallLetter ? <em>{report.overallLetter}</em> : null}
                </div>
              </div>

              <div className="rc-preview__chips">
                {report.rank ? (
                  <div className="rc-preview__chip">
                    <strong>
                      {report.rank}/{report.classSize}
                    </strong>
                    <span>Class rank</span>
                  </div>
                ) : null}
                {report.attendance?.rate != null ? (
                  <div className="rc-preview__chip">
                    <strong>{report.attendance.rate}%</strong>
                    <span>Attendance</span>
                  </div>
                ) : null}
                <div className="rc-preview__chip rc-preview__chip--accent">
                  <strong>{report.subjects.length}</strong>
                  <span>Subjects</span>
                </div>
              </div>

              <div className="rc-preview__subjects">
                {report.subjects.map((s) => (
                  <article key={s.subject} className="rc-preview__subject">
                    <div className="rc-preview__subject-head">
                      <strong>{s.subject}</strong>
                      <span>
                        {s.average}% <em>{s.letter}</em>
                      </span>
                    </div>
                    <div className={`rc-preview__bar ${scoreToneClass(s.average)}`}>
                      <i style={{ width: `${Math.min(100, s.average)}%` }} />
                    </div>
                  </article>
                ))}
              </div>

              <div className="rc-preview__actions">
                <button
                  type="button"
                  className="rc-v2__btn rc-v2__btn--primary"
                  onClick={() => openReportCardPrint(viewStudentId, termId)}
                >
                  Open print booklet
                </button>
                <p>Landscape duplex print · official 2-page report card</p>
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
