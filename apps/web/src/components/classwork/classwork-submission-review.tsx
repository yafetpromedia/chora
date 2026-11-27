"use client";

import { useCallback, useMemo, useState } from "react";
import {
  gradeSubmission,
  type ClassworkAssignment,
  type ClassworkSubmission,
  type ClassworkType,
} from "@/lib/classwork";
import { openClassworkFile } from "@/lib/teacher-cards";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  assignment: ClassworkAssignment;
  submissions: ClassworkSubmission[];
  mode: ClassworkType;
  onGraded: () => void;
};

type DraftGrade = {
  score: string;
  feedback: string;
};

function studentInitial(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

const STATUS_KEYS: Record<string, string> = {
  PENDING: "classworkUi.statusPending",
  SUBMITTED: "classworkUi.statusSubmitted",
  GRADED: "classworkUi.statusGraded",
  LATE: "classworkUi.statusLate",
  DRAFT: "classworkUi.statusDraft",
  PUBLISHED: "classworkUi.statusPublished",
  CLOSED: "classworkUi.statusClosed",
};

function draftsFromSubmissions(
  submissions: Props["submissions"],
): Record<string, DraftGrade> {
  const next: Record<string, DraftGrade> = {};
  for (const s of submissions) {
    next[s.id] = {
      score: s.score != null ? String(s.score) : "",
      feedback: s.feedback ?? "",
    };
  }
  return next;
}

const QUICK_PRESETS = [100, 90, 80, 70, 50, 0];

export function ClassworkSubmissionReview({
  assignment,
  submissions,
  mode,
  onGraded,
}: Props) {
  const { t, locale } = useLocale();
  const dateLocale = locale === "am" ? "am-ET" : undefined;
  const [drafts, setDrafts] = useState<Record<string, DraftGrade>>(() =>
    draftsFromSubmissions(submissions),
  );
  const [prevSubmissions, setPrevSubmissions] = useState(submissions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const maxScore = assignment.maxScore;

  if (prevSubmissions !== submissions) {
    setPrevSubmissions(submissions);
    setDrafts(draftsFromSubmissions(submissions));
  }

  const formatSubmitted = useCallback(
    (iso: string | null) => {
      if (!iso) return null;
      try {
        return new Date(iso).toLocaleString(dateLocale, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return null;
      }
    },
    [dateLocale],
  );

  function statusLabel(status: string) {
    const key = STATUS_KEYS[status] ?? STATUS_KEYS.PENDING;
    return t(key);
  }

  const stats = useMemo(() => {
    const submitted = submissions.filter((s) => s.status !== "PENDING").length;
    const graded = submissions.filter(
      (s) => s.status === "GRADED" || s.score != null,
    ).length;
    const pending = submissions.length - submitted;
    const scored = submissions.filter((s) => s.score != null);
    const classAvg =
      scored.length > 0
        ? Math.round(
            (scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) *
              10,
          ) / 10
        : null;
    const pct =
      submissions.length > 0
        ? Math.round((graded / submissions.length) * 100)
        : 0;
    return { submitted, graded, pending, classAvg, pct, total: submissions.length };
  }, [submissions]);

  const updateDraft = useCallback(
    (id: string, patch: Partial<DraftGrade>) => {
      setDrafts((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    [],
  );

  const applyGrade = useCallback(
    async (submission: ClassworkSubmission, score: number, feedback?: string) => {
      setError("");
      setSavingId(submission.id);
      setSavedId(null);
      try {
        await gradeSubmission(assignment.id, submission.id, {
          score,
          feedback: feedback?.trim() || undefined,
        });
        setSavedId(submission.id);
        onGraded();
        setTimeout(() => setSavedId((cur) => (cur === submission.id ? null : cur)), 2000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("classworkSubmissionReviewUi.gradingFailed"),
        );
      } finally {
        setSavingId(null);
      }
    },
    [assignment.id, onGraded, t],
  );

  const onSave = useCallback(
    async (submission: ClassworkSubmission) => {
      const draft = drafts[submission.id];
      if (!draft?.score.trim()) {
        setError(t("classworkSubmissionReviewUi.scoreRequired"));
        return;
      }
      const score = Number(draft.score);
      if (Number.isNaN(score) || score < 0 || score > maxScore) {
        setError(t("classworkSubmissionReviewUi.scoreRange", { max: maxScore }));
        return;
      }
      await applyGrade(submission, score, draft.feedback);
    },
    [applyGrade, drafts, maxScore, t],
  );

  const subKey =
    mode === "WORKSHEET"
      ? "classworkSubmissionReviewUi.subWorksheet"
      : "classworkSubmissionReviewUi.subAssignment";

  return (
    <section className="cw-review">
      <header className="cw-review__head">
        <div>
          <h3 className="cw-review__title">{t("classworkSubmissionReviewUi.title")}</h3>
          <p className="cw-review__sub">{t(subKey)}</p>
        </div>
        <div className="cw-review__max">
          <span>{t("classworkSubmissionReviewUi.outOf")}</span>
          <strong>{maxScore}</strong>
        </div>
      </header>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <div className="cw-review__stats">
        <div className="cw-review__stat">
          <strong>{stats.submitted}</strong>
          <span>{t("classworkSubmissionReviewUi.statSubmitted")}</span>
        </div>
        <div className="cw-review__stat cw-review__stat--graded">
          <strong>{stats.graded}</strong>
          <span>{t("classworkSubmissionReviewUi.statGraded")}</span>
        </div>
        <div className="cw-review__stat">
          <strong>{stats.pending}</strong>
          <span>{t("classworkSubmissionReviewUi.statWaiting")}</span>
        </div>
        <div className="cw-review__stat cw-review__stat--avg">
          <strong>{stats.classAvg != null ? stats.classAvg : "—"}</strong>
          <span>{t("classworkSubmissionReviewUi.statClassAvg")}</span>
        </div>
      </div>

      <div className="cw-review__progress">
        <div className="cw-review__progress-track">
          <div className="cw-review__progress-fill" style={{ width: `${stats.pct}%` }} />
        </div>
        <span className="cw-review__progress-label">
          {t("classworkSubmissionReviewUi.progressGraded", {
            graded: stats.graded,
            total: stats.total,
          })}
        </span>
      </div>

      {submissions.length === 0 ? (
        <p className="cw-empty__sub">{t("classworkSubmissionReviewUi.noStudents")}</p>
      ) : (
        <ul className="cw-review__grid">
          {submissions.map((s) => {
            const draft = drafts[s.id] ?? { score: "", feedback: "" };
            const canGrade = s.status !== "PENDING";
            const isSaving = savingId === s.id;
            const justSaved = savedId === s.id;
            const submittedLabel = formatSubmitted(s.submittedAt);

            return (
              <li
                key={s.id}
                className={`cw-review__card${s.status === "GRADED" ? " cw-review__card--graded" : ""}${!canGrade ? " cw-review__card--pending" : ""}`}
              >
                <div className="cw-review__card-top">
                  <div className="cw-review__identity">
                    <span className="cw-review__avatar" aria-hidden>
                      {studentInitial(s.studentName)}
                    </span>
                    <div>
                      <p className="cw-review__name">{s.studentName}</p>
                      {s.studentId ? (
                        <p className="cw-review__id">{s.studentId}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className={`cw-status cw-status--${s.status.toLowerCase()}`}>
                    {statusLabel(s.status)}
                  </span>
                </div>

                {submittedLabel ? (
                  <p className="cw-review__time">
                    {t("classworkSubmissionReviewUi.submittedAt", { when: submittedLabel })}
                  </p>
                ) : (
                  <p className="cw-review__time cw-review__time--muted">
                    {t("classworkSubmissionReviewUi.notSubmitted")}
                  </p>
                )}

                {s.note ? <p className="cw-review__note">{s.note}</p> : null}

                <div className="cw-review__file-row">
                  {s.fileUrl ? (
                    <button
                      type="button"
                      className="cw-review__file-btn"
                      onClick={() => void openClassworkFile(s.fileUrl!)}
                    >
                      {t("classworkSubmissionReviewUi.viewFile", {
                        name: s.fileName ?? t("classworkSubmissionReviewUi.submissionFallback"),
                      })}
                    </button>
                  ) : (
                    <span className="cw-review__no-file">
                      {t("classworkSubmissionReviewUi.noFile")}
                    </span>
                  )}
                </div>

                {canGrade ? (
                  <div className="cw-review__grade">
                    <div className="cw-review__score-row">
                      <label className="cw-review__score-field">
                        <span>{t("classworkSubmissionReviewUi.score")}</span>
                        <div className="cw-review__score-input-wrap">
                          <input
                            type="number"
                            min={0}
                            max={maxScore}
                            value={draft.score}
                            onChange={(e) =>
                              updateDraft(s.id, { score: e.target.value })
                            }
                            placeholder="0"
                          />
                          <span className="cw-review__score-max">/ {maxScore}</span>
                        </div>
                      </label>
                      {s.score != null && s.status === "GRADED" ? (
                        <div
                          className="cw-review__score-pill"
                          aria-label={t("classworkSubmissionReviewUi.savedScoreAria")}
                        >
                          {Math.round((s.score / maxScore) * 100)}%
                        </div>
                      ) : null}
                    </div>

                    <div className="cw-review__quick">
                      {QUICK_PRESETS.map((pct) => {
                        const val = Math.round((pct / 100) * maxScore);
                        const quickLabel =
                          pct === 100
                            ? t("classworkSubmissionReviewUi.quickFull")
                            : pct === 0
                              ? t("classworkSubmissionReviewUi.quickZero")
                              : t("classworkSubmissionReviewUi.quickPct", { pct });
                        return (
                          <button
                            key={pct}
                            type="button"
                            className="cw-review__quick-btn"
                            disabled={isSaving}
                            onClick={() => {
                              updateDraft(s.id, { score: String(val) });
                              void applyGrade(s, val, draft.feedback);
                            }}
                          >
                            {quickLabel}
                          </button>
                        );
                      })}
                    </div>

                    <label className="cw-review__feedback">
                      <span>{t("classworkSubmissionReviewUi.feedbackOptional")}</span>
                      <textarea
                        rows={2}
                        value={draft.feedback}
                        onChange={(e) =>
                          updateDraft(s.id, { feedback: e.target.value })
                        }
                        placeholder={t("classworkSubmissionReviewUi.feedbackPlaceholder")}
                      />
                    </label>

                    <button
                      type="button"
                      className={`cw-review__save${justSaved ? " cw-review__save--ok" : ""}`}
                      disabled={isSaving}
                      onClick={() => void onSave(s)}
                    >
                      {isSaving
                        ? t("common.saving")
                        : justSaved
                          ? t("classworkSubmissionReviewUi.savedOk")
                          : t("classworkSubmissionReviewUi.saveGrade")}
                    </button>
                  </div>
                ) : (
                  <p className="cw-review__await">
                    {t("classworkSubmissionReviewUi.awaitingSubmit")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}