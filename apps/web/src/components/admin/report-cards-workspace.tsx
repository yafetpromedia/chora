"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsBreadcrumb,
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
    <div className="acad-page acad-page--results res-v2">
      <AcademicsBreadcrumb
        items={[
          { label: "Academics", href: "/admin/academics" },
          { label: "Report cards" },
        ]}
      />

      <AcademicsHero
        chip="Generation & preparation"
        title="Report cards"
        subtitle="Preview student report cards, add teacher comments, and print the official booklet for families."
        stats={heroStats}
        badges={
          <>
            {currentTerm ? (
              <AcademicsBadge variant="live">Current: {currentTerm.name}</AcademicsBadge>
            ) : (
              <AcademicsBadge variant="muted">No current term</AcademicsBadge>
            )}
          </>
        }
      />

      {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}

      <section className="res-v2__block res-v2__preview" aria-label="Report card preview">
        <header className="res-v2__block-head">
          <div>
            <p className="res-v2__block-eyebrow">Generate</p>
            <h3 className="res-v2__block-title">Preview &amp; print</h3>
            <p className="res-v2__block-sub">
              Load a student report, then print or save as PDF for the family booklet.
            </p>
          </div>
        </header>

        <div className="res-v2__toolbar">
          <label className="res-scores-field res-scores-field--wide">
            <span>Student</span>
            <select
              value={viewStudentId}
              onChange={(e) => {
                setViewStudentId(e.target.value);
                setReport(null);
              }}
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
          <label className="res-scores-field">
            <span>Term</span>
            <select
              value={termId}
              onChange={(e) => {
                setTermId(e.target.value);
                setReport(null);
              }}
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
          <div className="res-v2__toolbar-actions">
            <button
              type="button"
              className="res-scores-btn res-scores-btn--primary"
              disabled={previewBusy || !viewStudentId || !termId}
              onClick={() => void onPreviewReport()}
            >
              {previewBusy ? "Loading…" : "Load preview"}
            </button>
            {viewStudentId && termId ? (
              <button
                type="button"
                className="res-scores-btn res-scores-btn--secondary"
                onClick={() => openReportCardPrint(viewStudentId, termId)}
              >
                Print / PDF
              </button>
            ) : null}
          </div>
        </div>

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
                    {report.student.section ? ` · ${report.student.section}` : ""} · {report.term.name}
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
                {report.overallLetter ? (
                  <em>{report.overallLetter}</em>
                ) : null}
              </div>
            </div>

            <div className="rc-preview__chips">
              {report.rank ? (
                <div className="rc-preview__chip">
                  <strong>{report.rank}/{report.classSize}</strong>
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
                className="res-scores-btn res-scores-btn--primary"
                onClick={() => openReportCardPrint(viewStudentId, termId)}
              >
                Open print booklet
              </button>
              <p>Landscape duplex print · official 2-page report card</p>
            </div>
          </div>
        ) : (
          <div className="res-v2__empty">
            <DashIcon name="results" className="dash-icon--lg" />
            <h4>No preview loaded</h4>
            <p>Choose a student and term, then load to review before printing.</p>
          </div>
        )}
      </section>

      <section className="res-v2__panel" aria-label="Report card comments">
        <ReportCardCommentsPanel
          terms={terms}
          students={students}
          defaultTermId={termId}
          defaultStudentId={viewStudentId}
          onError={setErr}
        />
      </section>

      <p className="res-v2__footer-hint">
        Scores must be published before report cards reflect final marks. Manage grading in{" "}
        <Link href="/admin/results" className="res-v2__text-link">
          Results
        </Link>
        .
      </p>
    </div>
  );
}
