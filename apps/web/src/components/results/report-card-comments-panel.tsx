"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t } = useLocale();
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

  const [prevDefaultTermId, setPrevDefaultTermId] = useState(defaultTermId);
  if (defaultTermId !== prevDefaultTermId) {
    setPrevDefaultTermId(defaultTermId);
    if (defaultTermId) setTermId(defaultTermId);
  }

  const [prevDefaultStudentId, setPrevDefaultStudentId] = useState(defaultStudentId);
  if (defaultStudentId !== prevDefaultStudentId) {
    setPrevDefaultStudentId(defaultStudentId);
    if (defaultStudentId) setStudentId(defaultStudentId);
  }

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

  const reportKey = studentId && termId ? `${studentId}:${termId}` : "";
  const [prevReportKey, setPrevReportKey] = useState("");
  if (reportKey !== prevReportKey) {
    setPrevReportKey(reportKey);
    if (reportKey) {
      setLoading(true);
      setError("");
      setSaved("");
    }
  }

  useEffect(() => {
    if (!studentId || !termId) return;
    let cancelled = false;
    void (async () => {
      try {
        const card = await getReportCard(studentId, termId);
        if (cancelled) return;
        setReport(card);
        setTeacherComment(card.teacherComment ?? "");
        setPrincipalComment(card.principalComment ?? "");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : t("resultsUi.loadReportCommentsFailed");
        setError(message);
        onError?.(message);
        setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, termId, onError]);

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
      setSaved(t("resultsUi.commentsSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resultsUi.saveCommentsFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onAiDraft(kind: "teacher" | "principal") {
    if (!report) {
      setError(t("resultsUi.aiLoadFirst"));
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
      setError(err instanceof Error ? err.message : t("resultsUi.aiDraftFailed"));
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
          <h3>{t("resultsUi.rcxTitle")}</h3>
          <p>{t("resultsUi.rcxSub")}</p>
        </div>
        <span className="rc-comments__badge">{t("resultsUi.rcxBadge")}</span>
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
            <span>{t("resultsUi.term")}</span>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">{t("resultsUi.selectTerm")}</option>
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
          <p>{t("resultsUi.loadingComments")}</p>
        </div>
      ) : null}

      {report ? (
        <div className="rc-comments__grid">
          <label className="rc-comments__field">
            <span className="rc-comments__label-row">
              <span>{t("resultsUi.teacherComment")}</span>
              <button
                type="button"
                className="rc-comments__ai"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("teacher")}
              >
                {aiBusy === "teacher" ? t("resultsUi.drafting") : t("resultsUi.draftWithAi")}
              </button>
            </span>
            <textarea
              rows={7}
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder={t("resultsUi.teacherCommentPlaceholder")}
            />
          </label>
          <label className="rc-comments__field">
            <span className="rc-comments__label-row">
              <span>{t("resultsUi.principalComment")}</span>
              <button
                type="button"
                className="rc-comments__ai"
                disabled={aiBusy !== null}
                onClick={() => void onAiDraft("principal")}
              >
                {aiBusy === "principal" ? t("resultsUi.drafting") : t("resultsUi.draftWithAi")}
              </button>
            </span>
            <textarea
              rows={7}
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              placeholder={t("resultsUi.principalCommentPlaceholder")}
            />
          </label>
        </div>
      ) : !loading && studentId && termId ? (
        <div className="rc-v2__empty rc-v2__empty--inline">
          <p>{t("resultsUi.rcxEmptyHint")}</p>
        </div>
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      {report ? (
        <div className="rc-comments__foot">
          <p>{t("resultsUi.rcxFoot")}</p>
          <button
            type="button"
            className="rc-v2__btn rc-v2__btn--primary"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? t("common.saving") : t("resultsUi.saveComments")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
