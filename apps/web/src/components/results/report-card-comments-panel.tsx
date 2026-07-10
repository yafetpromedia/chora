"use client";

import { useCallback, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { StudentRecord } from "@/lib/api";
import { draftReportComment } from "@/lib/ai";
import {
  getReportCard,
  upsertTermReport,
  type AcademicTerm,
  type ReportCard,
} from "@/lib/results";

type Props = {
  terms: AcademicTerm[];
  students: StudentRecord[];
  defaultTermId?: string;
  defaultStudentId?: string;
  hideSelectors?: boolean;
  onError?: (message: string) => void;
};

function reportContext(report: ReportCard): string {
  const lines = [
    `Student: ${report.student.name}`,
    `Grade: ${report.student.grade}${report.student.section ? ` · ${report.student.section}` : ""}`,
    `Term: ${report.term.name} (${report.term.academicYear})`,
    report.overallAverage != null
      ? `Overall: ${report.overallAverage}%${report.overallLetter ? ` (${report.overallLetter})` : ""}`
      : null,
    report.rank != null ? `Class rank: ${report.rank} of ${report.classSize}` : null,
    report.attendance.rate != null
      ? `Attendance: ${report.attendance.rate}%`
      : null,
    "",
    "Subjects:",
    ...report.subjects.map(
      (s) =>
        `- ${s.subject}: ${s.average}% (${s.letter})` +
        (s.assessments.length
          ? ` — ${s.assessments.map((a) => `${a.name} ${a.score}/${a.maxScore}`).join(", ")}`
          : ""),
    ),
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function ReportCardCommentsPanel({
  terms,
  students,
  defaultTermId,
  defaultStudentId,
  hideSelectors = false,
  onError,
}: Props) {
  const [termId, setTermId] = useState(defaultTermId ?? "");
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<"teacher" | "principal" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (defaultTermId) setTermId(defaultTermId);
  }, [defaultTermId]);

  useEffect(() => {
    if (defaultStudentId) setStudentId(defaultStudentId);
  }, [defaultStudentId]);

  const loadReport = useCallback(async () => {
    if (!studentId || !termId) return;
    setLoading(true);
    setError("");
    setSaved("");
    try {
      const card = await getReportCard(studentId, termId);
      setReport(card);
      setTeacherComment(card.teacherComment ?? "");
      setPrincipalComment(card.principalComment ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load report";
      setError(message);
      onError?.(message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, termId, onError]);

  useEffect(() => {
    if (studentId && termId) void loadReport();
  }, [studentId, termId, loadReport]);

  async function onSave() {
    if (!studentId || !termId) return;
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await upsertTermReport(studentId, termId, {
        teacherComment,
        principalComment,
      });
      setSaved("Comments saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onAiDraft(kind: "teacher" | "principal") {
    if (!report) {
      setError("Load a report card first.");
      return;
    }
    setAiBusy(kind);
    setError("");
    try {
      const res = await draftReportComment({
        kind,
        context: reportContext(report),
        studentName: report.student.name,
        termName: report.term.name,
      });
      if (kind === "teacher") setTeacherComment(res.content);
      else setPrincipalComment(res.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className="rc-v2__comments">
      <header className="rc-v2__card-head rc-v2__card-head--row">
        <span className="rc-v2__card-icon rc-v2__card-icon--ai" aria-hidden>
          <DashIcon name="profile" className="dash-icon--sm" />
        </span>
        <div>
          <h3 className="rc-v2__card-title">Teacher &amp; principal comments</h3>
          <p className="rc-v2__card-sub">
            Remarks appear on printed report cards when scores are published.
          </p>
        </div>
        <span className="rc-v2__ai-badge">Powered by AI</span>
      </header>

      {!hideSelectors ? (
        <div className="rc-v2__toolbar rc-v2__toolbar--inline">
          <label className="rc-v2__field rc-v2__field--wide">
            <span>Student</span>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} — {s.grade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="rc-v2__field">
            <span>Term</span>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.academicYear.name})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="rc-v2__loading">
          <span className="rc-v2__loading-spinner" aria-hidden />
          <p>Loading comments…</p>
        </div>
      ) : null}

      {report ? (
        <div className="ai-report-comments__grid">
          <label className="ai-report-comments__field">
            <span className="ai-report-comments__label-row">
              <span>Teacher comment</span>
              <button
                type="button"
                className="ai-inline-btn"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("teacher")}
              >
                {aiBusy === "teacher" ? "Drafting…" : "Draft with AI"}
              </button>
            </span>
            <textarea
              className="res-v2__textarea"
              rows={4}
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Homeroom or class teacher remark…"
            />
          </label>
          <label className="ai-report-comments__field">
            <span className="ai-report-comments__label-row">
              <span>Principal comment</span>
              <button
                type="button"
                className="ai-inline-btn"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("principal")}
              >
                {aiBusy === "principal" ? "Drafting…" : "Draft with AI"}
              </button>
            </span>
            <textarea
              className="res-v2__textarea"
              rows={4}
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              placeholder="Principal or academic director remark…"
            />
          </label>
        </div>
      ) : !loading && studentId && termId ? (
        <div className="rc-v2__empty rc-v2__empty--inline">
          <p>Comments load automatically for the selected student and term.</p>
        </div>
      ) : null}

      {error ? <p className="rc-v2__alert rc-v2__alert--err">{error}</p> : null}
      {saved ? <p className="rc-v2__alert rc-v2__alert--ok">{saved}</p> : null}

      {report ? (
        <div className="rc-v2__comments-foot">
          <button
            type="button"
            className="rc-v2__btn rc-v2__btn--primary"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save comments"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
