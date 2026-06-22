"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  approveResultWorkflow,
  getScoreMatrix,
  listClassSubjects,
  listTerms,
  publishResultWorkflow,
  reopenResultWorkflow,
  saveScoreMatrix,
  setAssessmentEntryLock,
  submitResultWorkflow,
  type AcademicTerm,
  type ClassSubject,
  type ResultWorkflowStatus,
  type ScoreMatrix,
} from "@/lib/results";

type Props = {
  role: "admin" | "teacher" | "staff";
  initialClassSubjectId?: string | null;
};

const WORKFLOW_LABELS: Record<ResultWorkflowStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

function classLabel(cs: ClassSubject) {
  return `${cs.grade.name}${cs.section ? ` · ${cs.section.name}` : ""} — ${cs.subject.name}`;
}

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function formatWhen(iso: string | null) {
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

function statusMessage(
  status: ResultWorkflowStatus,
  workflow: ScoreMatrix["workflow"] | undefined,
  role: Props["role"],
) {
  const when = formatWhen(workflow?.submittedAt ?? null);
  const by = workflow?.submittedByName;
  switch (status) {
    case "SUBMITTED":
      return {
        title: "Waiting for academic office",
        body:
          role === "teacher"
            ? `Submitted${by ? ` by ${by}` : ""}${when ? ` on ${when}` : ""}. You can still edit unlocked components until academic office locks them.`
            : `Submitted${by ? ` by ${by}` : ""}${when ? ` on ${when}` : ""}. Approve or reopen to continue.`,
        tone: "info" as const,
      };
    case "APPROVED":
      return {
        title: "Approved — ready to publish",
        body:
          role === "teacher"
            ? "Approved for publishing. Unlocked components can still be edited until academic office locks them."
            : "Scores are locked. Academic office can publish to parents.",
        tone: "info" as const,
      };
    case "PUBLISHED":
      return {
        title: "Published to parents",
        body:
          role === "teacher"
            ? "This score sheet is final. Scores below are read-only and visible on report cards."
            : "This score sheet is final and visible on report cards.",
        tone: "success" as const,
      };
    default:
      return null;
  }
}

function rowAverage(
  studentProfileId: string,
  assessments: ScoreMatrix["assessments"],
  draft: Record<string, Record<string, number>>,
) {
  const row = draft[studentProfileId] ?? {};
  let weighted = 0;
  let totalWeight = 0;
  for (const a of assessments) {
    const score = row[a.id];
    if (score != null && !Number.isNaN(score) && a.maxScore > 0) {
      const pct = (score / a.maxScore) * 100;
      weighted += pct * a.weightPercent;
      totalWeight += a.weightPercent;
    }
  }
  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}

export function ScoreMatrixPanel({ role, initialClassSubjectId }: Props) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [termId, setTermId] = useState("");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [matrix, setMatrix] = useState<ScoreMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [lockToggleBusy, setLockToggleBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const workflowStatus: ResultWorkflowStatus | null =
    matrix?.workflow?.status ?? null;
  const workflowFullyLocked = workflowStatus === "PUBLISHED";
  const canEditScores =
    role === "admin" || role === "staff" || (matrix?.canEditScores ?? true);
  const viewOnlyHomeroom = role === "teacher" && matrix != null && !canEditScores;

  useEffect(() => {
    void Promise.all([listTerms(), listClassSubjects()])
      .then(([t, cs]) => {
        setTerms(t);
        setClassSubjects(cs);
        const curTerm = t.find((x) => x.isCurrent) ?? t[0];
        if (curTerm) setTermId(curTerm.id);
        const match =
          initialClassSubjectId && cs.some((c) => c.id === initialClassSubjectId)
            ? initialClassSubjectId
            : null;
        if (match) setClassSubjectId(match);
        else if (cs[0]) setClassSubjectId(cs[0].id);
      })
      .catch(() => setError("Could not load classes or terms"))
      .finally(() => setBooting(false));
  }, [initialClassSubjectId]);

  const loadMatrix = useCallback(async () => {
    if (!termId || !classSubjectId) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const data = await getScoreMatrix(termId, classSubjectId);
      setMatrix(data);
      const initial: Record<string, Record<string, number>> = {};
      for (const st of data.students) {
        initial[st.studentProfileId] = {};
        for (const sc of st.scores) {
          if (sc.score != null) initial[st.studentProfileId][sc.assessmentId] = sc.score;
        }
      }
      setDraft(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load scores");
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [termId, classSubjectId]);

  useEffect(() => {
    if (!booting && termId && classSubjectId) void loadMatrix();
  }, [booting, termId, classSubjectId, loadMatrix]);

  function isComponentEntryLocked(assessmentId: string) {
    if (role === "admin" || role === "staff") return false;
    const assessment = matrix?.assessments.find((a) => a.id === assessmentId);
    return assessment?.entryLocked ?? true;
  }

  function isCellLocked(assessmentId: string) {
    if (!canEditScores) return true;
    if (role === "admin" || role === "staff") {
      return workflowStatus === "PUBLISHED";
    }
    if (workflowFullyLocked) return true;
    return isComponentEntryLocked(assessmentId);
  }

  function getScoreValue(studentProfileId: string, assessmentId: string): number | null {
    const fromDraft = draft[studentProfileId]?.[assessmentId];
    if (fromDraft != null && !Number.isNaN(fromDraft)) return fromDraft;
    const student = matrix?.students.find((s) => s.studentProfileId === studentProfileId);
    const saved = student?.scores.find((s) => s.assessmentId === assessmentId);
    if (saved?.score != null) return saved.score;
    return null;
  }

  function studentRowAverage(studentProfileId: string) {
    if (!matrix) return null;
    let weighted = 0;
    let totalWeight = 0;
    for (const a of matrix.assessments) {
      const score = getScoreValue(studentProfileId, a.id);
      if (score != null && a.maxScore > 0) {
        const pct = (score / a.maxScore) * 100;
        weighted += pct * a.weightPercent;
        totalWeight += a.weightPercent;
      }
    }
    if (totalWeight === 0) return null;
    return Math.round(weighted / totalWeight);
  }

  async function toggleAssessmentLock(assessmentId: string, open: boolean) {
    setLockToggleBusy(assessmentId);
    setError("");
    try {
      await setAssessmentEntryLock(assessmentId, !open);
      setMatrix((prev) =>
        prev
          ? {
              ...prev,
              assessments: prev.assessments.map((a) =>
                a.id === assessmentId ? { ...a, entryLocked: !open } : a,
              ),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update component lock");
    } finally {
      setLockToggleBusy(null);
    }
  }

  function setCell(studentProfileId: string, assessmentId: string, value: string) {
    if (isCellLocked(assessmentId)) return;
    const num = value === "" ? NaN : Number(value);
    setDraft((prev) => {
      const row = { ...(prev[studentProfileId] ?? {}) };
      if (Number.isNaN(num)) delete row[assessmentId];
      else row[assessmentId] = num;
      return { ...prev, [studentProfileId]: row };
    });
    setSaved(false);
  }

  async function onWorkflowAction(action: "submit" | "approve" | "publish" | "reopen") {
    if (!termId || !classSubjectId) return;
    setWorkflowBusy(true);
    setError("");
    try {
      if (action === "submit") await submitResultWorkflow(termId, classSubjectId);
      else if (action === "approve") await approveResultWorkflow(termId, classSubjectId);
      else if (action === "publish") await publishResultWorkflow(termId, classSubjectId);
      else await reopenResultWorkflow(termId, classSubjectId);
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow action failed");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function onSave() {
    if (!matrix || !termId || !classSubjectId) return;
    const entries: { studentProfileId: string; assessmentId: string; score: number }[] = [];
    for (const st of matrix.students) {
      const row = draft[st.studentProfileId] ?? {};
      for (const a of matrix.assessments) {
        if (isCellLocked(a.id)) continue;
        const score = row[a.id];
        if (score != null && !Number.isNaN(score)) {
          entries.push({ studentProfileId: st.studentProfileId, assessmentId: a.id, score });
        }
      }
    }
    if (entries.length === 0) {
      setError("Enter at least one score before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveScoreMatrix({ termId, classSubjectId, entries });
      setSaved(true);
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedCs = classSubjects.find((c) => c.id === classSubjectId);
  const selectedTerm = terms.find((t) => t.id === termId);

  const { filledScores, totalCells, completionPct } = useMemo(() => {
    if (!matrix) return { filledScores: 0, totalCells: 0, completionPct: 0 };
    const total = matrix.students.length * matrix.assessments.length;
    const filled = matrix.students.reduce((sum, st) => {
      return (
        sum +
        matrix.assessments.filter(
          (a) => getScoreValue(st.studentProfileId, a.id) != null,
        ).length
      );
    }, 0);
    return {
      filledScores: filled,
      totalCells: total,
      completionPct: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }, [matrix, draft]);

  const canSubmit =
    canEditScores &&
    workflowStatus === "DRAFT" &&
    (role === "teacher" || role === "admin" || role === "staff");

  const hasEditableCells =
    matrix?.assessments.some((a) => !isCellLocked(a.id)) ?? false;

  function renderScoreCell(studentProfileId: string, assessmentId: string, maxScore: number) {
    const val = getScoreValue(studentProfileId, assessmentId);
    const hasValue = val != null;
    const cellLocked = isCellLocked(assessmentId);
    const componentLocked = isComponentEntryLocked(assessmentId);

    if (cellLocked) {
      return (
        <span
          className={`res-scores-readonly${hasValue ? " res-scores-readonly--filled" : ""}${
            componentLocked && hasValue ? " res-scores-readonly--locked-score" : ""
          }`}
          aria-label={
            hasValue
              ? `Saved score ${val} out of ${maxScore}${componentLocked ? " (locked)" : ""}`
              : `No score for max ${maxScore}`
          }
        >
          {hasValue ? (
            <>
              <strong>{val}</strong>
              <span className="res-scores-readonly__max">/{maxScore}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      );
    }

    return (
      <input
        type="number"
        min={0}
        max={maxScore}
        step="any"
        className={`res-scores-input${hasValue ? " res-scores-input--filled" : ""}`}
        placeholder="—"
        value={hasValue ? val : ""}
        onChange={(e) => setCell(studentProfileId, assessmentId, e.target.value)}
        aria-label={`Score out of ${maxScore}`}
      />
    );
  }

  const hasSheet =
    matrix && matrix.assessments.length > 0 && matrix.students.length > 0;

  const statusInfo = workflowStatus
    ? statusMessage(workflowStatus, matrix?.workflow, role)
    : null;

  const lockedComponents =
    matrix?.assessments.filter((a) => a.entryLocked).map((a) => a.name) ?? [];
  const openComponents =
    matrix?.assessments.filter((a) => !a.entryLocked).map((a) => a.name) ?? [];

  return (
    <div className="res-scores">
      {error ? (
        <div className="res-scores-alert res-scores-alert--error" role="alert">{error}</div>
      ) : null}
      {saved ? (
        <div className="res-scores-alert res-scores-alert--success" role="status">
          Scores saved successfully.
        </div>
      ) : null}

      <header className="res-scores-hero">
        <div className="res-scores-hero__main">
          <h2 className="res-scores-hero__title">
            {selectedCs ? classLabel(selectedCs) : canEditScores ? "Enter scores" : "View scores"}
          </h2>
          <p className="res-scores-hero__sub">
            {selectedTerm?.name ?? "Select term"}
            {matrix?.template ? ` · ${matrix.template.name}` : ""}
            {viewOnlyHomeroom ? " · View only (homeroom)" : ""}
          </p>
          {workflowStatus ? (
            <span
              className={`res-scores-workflow-pill res-scores-workflow-pill--${workflowStatus.toLowerCase()}`}
            >
              {WORKFLOW_LABELS[workflowStatus]}
            </span>
          ) : null}
        </div>
        <div className="res-scores-stats">
          <div className="res-scores-stat">
            <strong className="res-scores-stat__value">{matrix?.students.length ?? 0}</strong>
            <span className="res-scores-stat__label">Students</span>
          </div>
          <div className="res-scores-stat">
            <strong className="res-scores-stat__value">{matrix?.assessments.length ?? 0}</strong>
            <span className="res-scores-stat__label">Components</span>
          </div>
          <div className="res-scores-stat res-scores-stat--accent">
            <strong className="res-scores-stat__value">{completionPct}%</strong>
            <span className="res-scores-stat__label">Complete</span>
          </div>
        </div>
      </header>

      <div className="res-scores-toolbar">
        <label className="res-scores-field">
          <span>Term</span>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} disabled={booting}>
            {terms.length === 0 ? <option value="">No terms</option> : null}
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="res-scores-field res-scores-field--wide">
          <span>Class</span>
          <select
            value={classSubjectId}
            onChange={(e) => setClassSubjectId(e.target.value)}
            disabled={booting}
          >
            {classSubjects.length === 0 ? (
              <option value="">No classes assigned</option>
            ) : null}
            {classSubjects.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {viewOnlyHomeroom ? (
        <div className="res-scores-status res-scores-status--info">
          <strong>View only</strong>
          <p>
            As homeroom teacher you can review scores for your class. Only the assigned
            subject teacher{selectedCs?.teacher ? ` (${selectedCs.teacher.firstName} ${selectedCs.teacher.lastName})` : ""} can enter or change marks.
          </p>
        </div>
      ) : null}

      {statusInfo && !viewOnlyHomeroom ? (
        <div className={`res-scores-status res-scores-status--${statusInfo.tone}`}>
          <strong>{statusInfo.title}</strong>
          <p>{statusInfo.body}</p>
        </div>
      ) : null}

      {booting || loading ? (
        <div className="res-scores-loading">
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>Loading score sheet…</p>
        </div>
      ) : classSubjects.length === 0 ? (
        <div className="res-scores-empty">
          <DashIcon name="results" className="dash-icon--lg" />
          <h3>No classes assigned</h3>
          <p>Ask your admin to assign subject classes.</p>
        </div>
      ) : matrix && matrix.assessments.length === 0 ? (
        <div className="res-scores-empty">
          <DashIcon name="results" className="dash-icon--lg" />
          <h3>No grading components</h3>
          <p>Admin must assign an assessment template to this class.</p>
        </div>
      ) : matrix && matrix.students.length === 0 ? (
        <div className="res-scores-empty">
          <DashIcon name="students" className="dash-icon--lg" />
          <h3>No students enrolled</h3>
          <p>Add students to {selectedCs?.grade.name ?? "this grade"} first.</p>
        </div>
      ) : hasSheet ? (
        <section
          className={`res-scores-sheet${
            workflowFullyLocked || viewOnlyHomeroom ? " res-scores-sheet--locked" : ""
          }`}
        >
          {role === "admin" || role === "staff" ? (
            <div className="res-scores-components">
              <div className="res-scores-components__head">
                <h3 className="res-scores-components__title">Score components</h3>
                <p className="res-scores-components__hint">
                  Turn on a component to let teachers enter scores. Turn off to lock it.
                </p>
              </div>
              <div className="res-scores-components__toggles">
                {matrix.assessments.map((a) => {
                  const isOpen = !a.entryLocked;
                  const busy = lockToggleBusy === a.id;
                  return (
                    <label
                      key={a.id}
                      className={`res-scores-component-toggle${isOpen ? " res-scores-component-toggle--open" : ""}`}
                    >
                      <span className="res-scores-component-toggle__label">
                        <strong>{a.name}</strong>
                        <span>/{a.maxScore} · {a.weightPercent}%</span>
                      </span>
                      <span className="res-scores-component-toggle__switch">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={isOpen}
                          disabled={busy}
                          onChange={(e) =>
                            void toggleAssessmentLock(a.id, e.target.checked)
                          }
                        />
                        <span className="res-scores-component-toggle__track" aria-hidden />
                      </span>
                      <span className="res-scores-component-toggle__state">
                        {busy ? "…" : isOpen ? "Open" : "Locked"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {role === "teacher" && canEditScores && !workflowFullyLocked && lockedComponents.length > 0 ? (
            <p className="res-scores-components__teacher-note">
              {openComponents.length > 0 ? (
                <>
                  You can edit: <strong>{openComponents.join(", ")}</strong>. Locked components (
                  {lockedComponents.join(", ")}) still show any scores you already saved below.
                </>
              ) : filledScores > 0 ? (
                <>
                  All components are locked for editing. Your <strong>{filledScores} saved score
                  {filledScores === 1 ? "" : "s"}</strong> are shown below — ask academic office to
                  unlock to add or change more.
                </>
              ) : (
                <>
                  All components are locked. Ask academic office to unlock before entering scores.
                </>
              )}
            </p>
          ) : null}

          <div className="res-scores-sheet__head">
            <div>
              <h3 className="res-scores-sheet__title">
                Score sheet
                {workflowFullyLocked ? (
                  <span className="res-scores-sheet__readonly">Read only</span>
                ) : null}
              </h3>
              <p className="res-scores-sheet__meta">
                {filledScores} of {totalCells} entered
              </p>
            </div>
            <div className="res-scores-sheet__actions">
              {hasEditableCells ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--secondary"
                  disabled={saving}
                  onClick={() => void onSave()}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              ) : null}
              {canSubmit ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--primary"
                  disabled={workflowBusy || completionPct === 0}
                  onClick={() => void onWorkflowAction("submit")}
                >
                  {workflowBusy ? "…" : "Submit"}
                </button>
              ) : null}
              {workflowStatus === "SUBMITTED" && (role === "admin" || role === "staff") ? (
                <>
                  <button
                    type="button"
                    className="res-scores-btn res-scores-btn--primary"
                    disabled={workflowBusy}
                    onClick={() => void onWorkflowAction("approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="res-scores-btn res-scores-btn--ghost"
                    disabled={workflowBusy}
                    onClick={() => void onWorkflowAction("publish")}
                  >
                    Publish
                  </button>
                </>
              ) : null}
              {workflowStatus === "APPROVED" && (role === "admin" || role === "staff") ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--primary"
                  disabled={workflowBusy}
                  onClick={() => void onWorkflowAction("publish")}
                >
                  Publish
                </button>
              ) : null}
              {workflowStatus && workflowStatus !== "DRAFT" && (role === "admin" || role === "staff") ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--ghost"
                  disabled={workflowBusy}
                  onClick={() => void onWorkflowAction("reopen")}
                >
                  Reopen
                </button>
              ) : null}
            </div>
          </div>

          <div className="res-scores-progress">
            <div className="res-scores-progress__bar">
              <span style={{ width: `${completionPct}%` }} />
            </div>
          </div>

          {/* Desktop table */}
          <div className="res-scores-sheet__table">
            <table className="res-scores-table">
              <thead>
                <tr>
                  <th className="res-scores-table__student-col">Student</th>
                  {matrix.assessments.map((a) => (
                    <th
                      key={a.id}
                      className={
                        a.entryLocked && role === "teacher" ? "res-scores-table__col--locked" : ""
                      }
                    >
                      <span className="res-scores-table__col-name">
                        {a.name}
                        {a.entryLocked && role === "teacher" ? (
                          <span
                            className="res-scores-table__lock"
                            title="Locked for editing — saved scores still visible"
                          >
                            🔒
                          </span>
                        ) : null}
                      </span>
                      <span className="res-scores-table__col-meta">
                        /{a.maxScore} · {a.weightPercent}%
                      </span>
                    </th>
                  ))}
                  <th className="res-scores-table__avg-col">Avg</th>
                </tr>
              </thead>
              <tbody>
                {matrix.students.map((st) => {
                  const avg = studentRowAverage(st.studentProfileId);
                  return (
                    <tr key={st.studentProfileId}>
                      <td className="res-scores-table__student">
                        <span className="res-scores-table__avatar" aria-hidden>
                          {studentInitials(st.name)}
                        </span>
                        <span className="res-scores-table__student-name">{st.name}</span>
                      </td>
                      {matrix.assessments.map((a) => (
                        <td
                          key={a.id}
                          className={`res-scores-table__cell${
                            isComponentEntryLocked(a.id) && role === "teacher"
                              ? " res-scores-table__cell--locked"
                              : ""
                          }`}
                        >
                          {renderScoreCell(st.studentProfileId, a.id, a.maxScore)}
                        </td>
                      ))}
                      <td className="res-scores-table__avg">
                        {avg != null ? `${avg}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile only */}
          <div className="res-scores-sheet__mobile">
            {matrix.students.map((st) => {
              const avg = studentRowAverage(st.studentProfileId);
              return (
                <article key={st.studentProfileId} className="res-scores-row-card">
                  <header className="res-scores-row-card__head">
                    <span className="res-scores-table__avatar">{studentInitials(st.name)}</span>
                    <div>
                      <h4>{st.name}</h4>
                      <p>{avg != null ? `Average ${avg}%` : "No scores yet"}</p>
                    </div>
                  </header>
                  <div className="res-scores-row-card__grid">
                    {matrix.assessments.map((a) => (
                      <label key={a.id} className="res-scores-row-card__field">
                        <span>
                          {a.name} <em>/{a.maxScore}</em>
                        </span>
                        {renderScoreCell(st.studentProfileId, a.id, a.maxScore)}
                      </label>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
