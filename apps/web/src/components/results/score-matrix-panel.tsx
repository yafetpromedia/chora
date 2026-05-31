"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveResultWorkflow,
  getScoreMatrix,
  listClassSubjects,
  listTerms,
  publishResultWorkflow,
  reopenResultWorkflow,
  saveScoreMatrix,
  submitResultWorkflow,
  type AcademicTerm,
  type ClassSubject,
  type ResultWorkflowStatus,
  type ScoreMatrix,
} from "@/lib/results";

type Props = {
  role: "admin" | "teacher" | "staff";
};

export function ScoreMatrixPanel({ role }: Props) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [termId, setTermId] = useState("");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [matrix, setMatrix] = useState<ScoreMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [error, setError] = useState("");

  const workflowStatus: ResultWorkflowStatus | null =
    matrix?.workflow?.status ?? null;
  const locked =
    workflowStatus === "SUBMITTED" ||
    workflowStatus === "APPROVED" ||
    workflowStatus === "PUBLISHED";

  useEffect(() => {
    void Promise.all([listTerms(), listClassSubjects()])
      .then(([t, cs]) => {
        setTerms(t);
        setClassSubjects(cs);
        const cur = t.find((x) => x.isCurrent) ?? t[0];
        if (cur) setTermId(cur.id);
        if (cs[0]) setClassSubjectId(cs[0].id);
      })
      .catch(() => undefined);
  }, []);

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
          if (sc.score != null) {
            initial[st.studentProfileId][sc.assessmentId] = sc.score;
          }
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
    void loadMatrix();
  }, [loadMatrix]);

  function setCell(studentProfileId: string, assessmentId: string, value: string) {
    const num = value === "" ? NaN : Number(value);
    setDraft((prev) => {
      const row = { ...(prev[studentProfileId] ?? {}) };
      if (Number.isNaN(num)) {
        delete row[assessmentId];
      } else {
        row[assessmentId] = num;
      }
      return { ...prev, [studentProfileId]: row };
    });
    setSaved(false);
  }

  async function onWorkflowAction(
    action: "submit" | "approve" | "publish" | "reopen",
  ) {
    if (!termId || !classSubjectId) return;
    setWorkflowBusy(true);
    setError("");
    try {
      if (action === "submit") {
        await submitResultWorkflow(termId, classSubjectId);
      } else if (action === "approve") {
        await approveResultWorkflow(termId, classSubjectId);
      } else if (action === "publish") {
        await publishResultWorkflow(termId, classSubjectId);
      } else {
        await reopenResultWorkflow(termId, classSubjectId);
      }
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow action failed");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function onSave() {
    if (!matrix || !termId || !classSubjectId || locked) return;
    const entries: {
      studentProfileId: string;
      assessmentId: string;
      score: number;
    }[] = [];
    for (const st of matrix.students) {
      const row = draft[st.studentProfileId] ?? {};
      for (const a of matrix.assessments) {
        const score = row[a.id];
        if (score != null && !Number.isNaN(score)) {
          entries.push({
            studentProfileId: st.studentProfileId,
            assessmentId: a.id,
            score,
          });
        }
      }
    }
    if (entries.length === 0) {
      setError("Enter at least one score");
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

  return (
    <div className="att-page">
      {error ? <p className="att-toast att-toast--error">{error}</p> : null}
      {saved ? (
        <p className="att-toast" role="status">
          Scores saved. Report cards use weighted averages automatically.
        </p>
      ) : null}

      <div className="att-mark-toolbar">
        <div className="att-field">
          <span>Term</span>
          <select value={termId} onChange={(e) => setTermId(e.target.value)}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-field att-field--wide">
          <span>Class & subject</span>
          <select
            value={classSubjectId}
            onChange={(e) => setClassSubjectId(e.target.value)}
          >
            {classSubjects.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade.name}
                {c.section ? ` · ${c.section.name}` : ""} — {c.subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {workflowStatus ? (
        <div className="att-summary-block" style={{ marginBottom: "0.75rem" }}>
          <p className="setup-hint">
            Workflow: <strong>{workflowStatus}</strong>
            {matrix?.workflow?.submittedByName
              ? ` · submitted by ${matrix.workflow.submittedByName}`
              : ""}
            {matrix?.workflow?.approvedByName
              ? ` · approved by ${matrix.workflow.approvedByName}`
              : ""}
          </p>
          <div className="setup-actions-row">
            {workflowStatus === "DRAFT" && (role === "teacher" || role === "admin" || role === "staff") ? (
              <button
                type="button"
                className="auth-page-submit"
                disabled={workflowBusy}
                onClick={() => void onWorkflowAction("submit")}
              >
                Submit for approval
              </button>
            ) : null}
            {workflowStatus === "SUBMITTED" && (role === "admin" || role === "staff") ? (
              <>
                <button
                  type="button"
                  className="auth-page-submit"
                  disabled={workflowBusy}
                  onClick={() => void onWorkflowAction("approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="dash-copy-btn"
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
                className="auth-page-submit"
                disabled={workflowBusy}
                onClick={() => void onWorkflowAction("publish")}
              >
                Publish to parents
              </button>
            ) : null}
            {workflowStatus !== "DRAFT" && (role === "admin" || role === "staff") ? (
              <button
                type="button"
                className="dash-copy-btn"
                disabled={workflowBusy}
                onClick={() => void onWorkflowAction("reopen")}
              >
                Reopen (draft)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {locked ? (
        <p className="auth-alert">
          Scores are locked while status is {workflowStatus}. Academic office must reopen to edit.
        </p>
      ) : null}

      {matrix?.template ? (
        <p className="setup-hint">
          Assessment template: <strong>{matrix.template.name}</strong> (
          {matrix.template.components.map((c) => `${c.name} ${c.weightPercent}%`).join(" · ")})
        </p>
      ) : matrix ? (
        <p className="setup-hint">
          No template assigned for {selectedCs?.grade.name ?? "this class"}. Ask admin to set up
          assessment templates.
        </p>
      ) : null}

      {loading ? (
        <p className="setup-hint">Loading score sheet…</p>
      ) : matrix && matrix.assessments.length > 0 ? (
        <>
          <div className="res-matrix-wrap">
            <table className="res-matrix">
              <thead>
                <tr>
                  <th>Student</th>
                  {matrix.assessments.map((a) => (
                    <th key={a.id} title={`Weight ${a.weightPercent}%`}>
                      {a.name}
                      <span className="res-matrix__meta">/{a.maxScore}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.students.map((st) => (
                  <tr key={st.studentProfileId}>
                    <td className="res-matrix__name">{st.name}</td>
                    {matrix.assessments.map((a) => (
                      <td key={a.id}>
                        <input
                          type="number"
                          min={0}
                          max={a.maxScore}
                          className="res-matrix__input"
                          disabled={locked}
                          value={draft[st.studentProfileId]?.[a.id] ?? ""}
                          onChange={(e) =>
                            setCell(st.studentProfileId, a.id, e.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="att-save-bar">
            <button
              type="button"
              className="att-btn att-btn--primary"
              disabled={saving || locked}
              onClick={() => void onSave()}
            >
              {saving ? "Saving…" : "Save all scores"}
            </button>
          </div>
        </>
      ) : matrix ? (
        <p className="setup-hint">No assessment columns yet. Assign a template and sync.</p>
      ) : null}
    </div>
  );
}
