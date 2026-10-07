"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  ResultsStudentPicker,
  type ResultsStudentOption,
} from "@/components/results/results-student-picker";
import { AppToast } from "@/components/ui/app-toast";
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
    <div className="rc-comments">
      <header className="rc-comments__head">
        <span className="rc-comments__icon" aria-hidden>
          <DashIcon name="profile" className="dash-icon--sm" />
        </span>
        <div className="rc-comments__titles">
          <h3>Teacher &amp; principal comments</h3>
          <p>Remarks print on the report card back page when scores are published.</p>
        </div>
        <span className="rc-comments__badge">General remarks</span>
      </header>

      {!hideSelectors ? (
        <div className="rc-v2__toolbar rc-v2__toolbar--inline">
          <div className="rc-v2__student-pick">
            <ResultsStudentPicker
              students={studentOptions}
              value={studentId}
              onChange={setStudentId}
              disabled={students.length === 0}
            />
          </div>
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
        <div className="rc-comments__grid">
          <label className="rc-comments__field">
            <span className="rc-comments__label-row">
              <span>Teacher comment</span>
              <button
                type="button"
                className="rc-comments__ai"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("teacher")}
              >
                {aiBusy === "teacher" ? "Drafting…" : "Draft with AI"}
              </button>
            </span>
            <textarea
              rows={7}
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Homeroom or class teacher remark…"
            />
          </label>
          <label className="rc-comments__field">
            <span className="rc-comments__label-row">
              <span>Principal comment</span>
              <button
                type="button"
                className="rc-comments__ai"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("principal")}
              >
                {aiBusy === "principal" ? "Drafting…" : "Draft with AI"}
              </button>
            </span>
            <textarea
              rows={7}
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

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      {report ? (
        <div className="rc-comments__foot">
          <p>Saved remarks appear under General Remarks on the printed card.</p>
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
