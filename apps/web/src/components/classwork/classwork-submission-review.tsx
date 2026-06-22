"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  gradeSubmission,
  type ClassworkAssignment,
  type ClassworkSubmission,
  type ClassworkType,
} from "@/lib/classwork";
import { openClassworkFile } from "@/lib/teacher-cards";

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

function formatSubmitted(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return <span className={`cw-status cw-status--${key}`}>{status}</span>;
}

const QUICK_PRESETS = [100, 90, 80, 70, 50, 0];

export function ClassworkSubmissionReview({
  assignment,
  submissions,
  mode,
  onGraded,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, DraftGrade>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const maxScore = assignment.maxScore ?? 100;

  useEffect(() => {
    const next: Record<string, DraftGrade> = {};
    for (const s of submissions) {
      next[s.id] = {
        score: s.score != null ? String(s.score) : "",
        feedback: s.feedback ?? "",
      };
    }
    setDrafts(next);
  }, [submissions]);

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
        setError(err instanceof Error ? err.message : "Grading failed");
      } finally {
        setSavingId(null);
      }
    },
    [assignment.id, onGraded],
  );

  const onSave = useCallback(
    async (submission: ClassworkSubmission) => {
      const draft = drafts[submission.id];
      if (!draft?.score.trim()) {
        setError("Enter a score before saving.");
        return;
      }
      const score = Number(draft.score);
      if (Number.isNaN(score) || score < 0 || score > maxScore) {
        setError(`Score must be between 0 and ${maxScore}.`);
        return;
      }
      await applyGrade(submission, score, draft.feedback);
    },
    [applyGrade, drafts, maxScore],
  );

  const label = mode === "WORKSHEET" ? "worksheet" : "assignment";

  return (
    <section className="cw-review">
      <header className="cw-review__head">
        <div>
          <h3 className="cw-review__title">Submission desk</h3>
          <p className="cw-review__sub">
            Grade each {label} instantly — scores save as you go.
          </p>
        </div>
        <div className="cw-review__max">
          <span>Out of</span>
          <strong>{maxScore}</strong>
        </div>
      </header>

      {error ? <p className="cw-alert cw-alert--error">{error}</p> : null}

      <div className="cw-review__stats">
        <div className="cw-review__stat">
          <strong>{stats.submitted}</strong>
          <span>Submitted</span>
        </div>
        <div className="cw-review__stat cw-review__stat--graded">
          <strong>{stats.graded}</strong>
          <span>Graded</span>
        </div>
        <div className="cw-review__stat">
          <strong>{stats.pending}</strong>
          <span>Waiting</span>
        </div>
        <div className="cw-review__stat cw-review__stat--avg">
          <strong>{stats.classAvg != null ? stats.classAvg : "—"}</strong>
          <span>Class avg</span>
        </div>
      </div>

      <div className="cw-review__progress">
        <div className="cw-review__progress-track">
          <div className="cw-review__progress-fill" style={{ width: `${stats.pct}%` }} />
        </div>
        <span className="cw-review__progress-label">
          {stats.graded}/{stats.total} graded
        </span>
      </div>

      {submissions.length === 0 ? (
        <p className="cw-empty__sub">No students enrolled for this class.</p>
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
                  <StatusBadge status={s.status} />
                </div>

                {submittedLabel ? (
                  <p className="cw-review__time">Submitted {submittedLabel}</p>
                ) : (
                  <p className="cw-review__time cw-review__time--muted">Not submitted yet</p>
                )}

                {s.note ? <p className="cw-review__note">{s.note}</p> : null}

                <div className="cw-review__file-row">
                  {s.fileUrl ? (
                    <button
                      type="button"
                      className="cw-review__file-btn"
                      onClick={() => void openClassworkFile(s.fileUrl!)}
                    >
                      View {s.fileName ?? "submission"}
                    </button>
                  ) : (
                    <span className="cw-review__no-file">No file attached</span>
                  )}
                </div>

                {canGrade ? (
                  <div className="cw-review__grade">
                    <div className="cw-review__score-row">
                      <label className="cw-review__score-field">
                        <span>Score</span>
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
                        <div className="cw-review__score-pill" aria-label="Saved score">
                          {Math.round((s.score / maxScore) * 100)}%
                        </div>
                      ) : null}
                    </div>

                    <div className="cw-review__quick">
                      {QUICK_PRESETS.map((pct) => {
                        const val = Math.round((pct / 100) * maxScore);
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
                            {pct === 100 ? "Full" : pct === 0 ? "Zero" : `${pct}%`}
                          </button>
                        );
                      })}
                    </div>

                    <label className="cw-review__feedback">
                      <span>Feedback (optional)</span>
                      <textarea
                        rows={2}
                        value={draft.feedback}
                        onChange={(e) =>
                          updateDraft(s.id, { feedback: e.target.value })
                        }
                        placeholder="Short note for the student…"
                      />
                    </label>

                    <button
                      type="button"
                      className={`cw-review__save${justSaved ? " cw-review__save--ok" : ""}`}
                      disabled={isSaving}
                      onClick={() => void onSave(s)}
                    >
                      {isSaving ? "Saving…" : justSaved ? "Saved ✓" : "Save grade"}
                    </button>
                  </div>
                ) : (
                  <p className="cw-review__await">Waiting for student to submit.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
