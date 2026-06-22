"use client";

import { useCallback, useEffect, useState } from "react";
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
      setError(err instanceof Error ? err.message : "Could not load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, termId]);

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
    <section className="ai-report-comments att-admin-section">
      <div className="ai-report-comments__head">
        <div>
          <h2 className="setup-panel-label">Report card comments</h2>
          <p className="tch-meta">
            Teacher and principal remarks appear on printed report cards when published.
          </p>
        </div>
        <span className="lib-ai-badge">Powered by AI</span>
      </div>

      <div className="att-filters">
        <label className="att-field att-field--wide">
          <span>Student</span>
          <select
            className="auth-input auth-input--login auth-input--login-plain"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.firstName} {s.user.lastName} — {s.grade.name}
              </option>
            ))}
          </select>
        </label>
        <label className="att-field">
          <span>Term</span>
          <select
            className="auth-input auth-input--login auth-input--login-plain"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <option value="">Select term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.academicYear.name})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p className="setup-hint">Loading report…</p> : null}

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
              className="auth-input auth-input--login auth-input--login-plain dash-textarea"
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
              className="auth-input auth-input--login auth-input--login-plain dash-textarea"
              rows={4}
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              placeholder="Principal or academic director remark…"
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {saved ? <p className="setup-hint">{saved}</p> : null}

      {report ? (
        <div className="setup-actions-row">
          <button
            type="button"
            className="auth-page-submit"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save comments"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
