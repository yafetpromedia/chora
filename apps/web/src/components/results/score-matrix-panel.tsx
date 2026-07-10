"use client";

import Link from "next/link";
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

const ALL = "__all__";

const WORKFLOW_LABELS: Record<ResultWorkflowStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

function heroTitle(
  cs: ClassSubject | undefined,
  gradeName: string,
  subjectId: string,
  subjectName: string | null,
  sectionId: string,
  sectionName: string | null,
) {
  if (subjectId === ALL && sectionId === ALL) {
    return `${gradeName} — All subjects · All sections`;
  }
  if (subjectId === ALL) {
    const section = sectionName ? ` · ${sectionName}` : "";
    return `${gradeName}${section} — All subjects`;
  }
  if (sectionId === ALL) {
    return `${gradeName} — ${subjectName ?? "Subject"} · All sections`;
  }
  if (!cs) return "Enter scores";
  const section = cs.section ? ` · ${cs.section.name}` : "";
  return `${cs.grade.name}${section} — ${cs.subject.name}`;
}

function sectionKey(cs: ClassSubject) {
  return cs.section?.id ?? "";
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
  const [toolbarReady, setToolbarReady] = useState(false);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [termId, setTermId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [matrix, setMatrix] = useState<ScoreMatrix | null>(null);
  const [aggregatedSheets, setAggregatedSheets] = useState<
    { classSubject: ClassSubject; matrix: ScoreMatrix }[]
  >([]);
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
    setToolbarReady(true);
  }, []);

  useEffect(() => {
    void Promise.all([listTerms(), listClassSubjects()])
      .then(([t, cs]) => {
        setTerms(t);
        setClassSubjects(cs);
        const curTerm = t.find((x) => x.isCurrent) ?? t[0];
        if (curTerm) setTermId(curTerm.id);

        const initial =
          initialClassSubjectId && cs.some((c) => c.id === initialClassSubjectId)
            ? cs.find((c) => c.id === initialClassSubjectId)!
            : cs[0];

        if (initial) {
          setGradeId(initial.grade.id);
          setSubjectId(initial.subject.id);
          setSectionId(sectionKey(initial));
          setClassSubjectId(initial.id);
        }
      })
      .catch(() => setError("Could not load classes or terms"))
      .finally(() => setBooting(false));
  }, [initialClassSubjectId]);

  const grades = useMemo(() => {
    const map = new Map<string, string>();
    for (const cs of classSubjects) {
      if (!map.has(cs.grade.id)) map.set(cs.grade.id, cs.grade.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [classSubjects]);

  const subjectsForGrade = useMemo(() => {
    const map = new Map<string, string>();
    for (const cs of classSubjects.filter((c) => c.grade.id === gradeId)) {
      if (!map.has(cs.subject.id)) map.set(cs.subject.id, cs.subject.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [classSubjects, gradeId]);

  const sectionsForFilter = useMemo(() => {
    const map = new Map<string, string>();
    for (const cs of classSubjects.filter((c) => {
      if (c.grade.id !== gradeId) return false;
      if (subjectId !== ALL && c.subject.id !== subjectId) return false;
      return true;
    })) {
      const key = sectionKey(cs);
      if (!map.has(key)) map.set(key, cs.section?.name ?? "—");
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [classSubjects, gradeId, subjectId]);

  const hasSections = sectionsForFilter.some((s) => s.id !== "");

  const activeClassSubjects = useMemo(
    () =>
      classSubjects.filter((c) => {
        if (c.grade.id !== gradeId) return false;
        if (subjectId !== ALL && c.subject.id !== subjectId) return false;
        if (sectionId !== ALL && sectionKey(c) !== sectionId) return false;
        return true;
      }),
    [classSubjects, gradeId, subjectId, sectionId],
  );

  const isAggregated = subjectId === ALL || sectionId === ALL;

  function syncClassSubject(
    grade: string,
    subject: string,
    section: string,
  ) {
    const match = classSubjects.find(
      (c) =>
        c.grade.id === grade &&
        c.subject.id === subject &&
        sectionKey(c) === section,
    );
    setClassSubjectId(match?.id ?? "");
  }

  function selectGrade(id: string) {
    setGradeId(id);
    const gradeSubjects = classSubjects.filter((c) => c.grade.id === id);
    const first = gradeSubjects[0];
    if (!first) {
      setSubjectId("");
      setSectionId("");
      setClassSubjectId("");
      return;
    }
    const nextSubject = first.subject.id;
    setSubjectId(nextSubject);
    const match = gradeSubjects.find((c) => c.subject.id === nextSubject) ?? first;
    const nextSection = sectionKey(match);
    setSectionId(nextSection);
    syncClassSubject(id, nextSubject, nextSection);
  }

  function selectSubject(id: string) {
    setSubjectId(id);
    if (id === ALL || sectionId === ALL) {
      setClassSubjectId("");
      return;
    }
    syncClassSubject(gradeId, id, sectionId);
  }

  function selectSection(id: string) {
    setSectionId(id);
    if (id === ALL || subjectId === ALL) {
      setClassSubjectId("");
      return;
    }
    syncClassSubject(gradeId, subjectId, id);
  }

  const controlsDisabled = booting;

  const loadAggregated = useCallback(async () => {
    if (!termId || activeClassSubjects.length === 0) return;
    setLoading(true);
    setError("");
    setSaved(false);
    setMatrix(null);
    try {
      const results = await Promise.all(
        activeClassSubjects.map(async (cs) => ({
          classSubject: cs,
          matrix: await getScoreMatrix(termId, cs.id),
        })),
      );
      setAggregatedSheets(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load scores");
      setAggregatedSheets([]);
    } finally {
      setLoading(false);
    }
  }, [termId, activeClassSubjects]);

  const loadMatrix = useCallback(async () => {
    if (!termId || !classSubjectId) return;
    setLoading(true);
    setError("");
    setSaved(false);
    setAggregatedSheets([]);
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
    if (booting || !termId) return;
    if (isAggregated && activeClassSubjects.length > 0) void loadAggregated();
    else if (!isAggregated && classSubjectId) void loadMatrix();
    else {
      setMatrix(null);
      setAggregatedSheets([]);
    }
  }, [
    booting,
    termId,
    classSubjectId,
    isAggregated,
    activeClassSubjects,
    loadMatrix,
    loadAggregated,
  ]);

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
  const selectedGrade = grades.find((g) => g.id === gradeId);
  const selectedSubjectName =
    subjectId === ALL
      ? null
      : subjectsForGrade.find((s) => s.id === subjectId)?.name ?? null;
  const selectedSectionName =
    sectionId === ALL
      ? null
      : sectionsForFilter.find((s) => s.id === sectionId)?.name ?? null;

  const displayMatrix = isAggregated ? null : matrix;

  const hasSheet = isAggregated
    ? aggregatedSheets.some(
        (s) => s.matrix.assessments.length > 0 && s.matrix.students.length > 0,
      )
    : !!(matrix && matrix.assessments.length > 0 && matrix.students.length > 0);

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

  function sheetRowAverage(sheet: ScoreMatrix, studentProfileId: string) {
    let weighted = 0;
    let totalWeight = 0;
    for (const a of sheet.assessments) {
      const student = sheet.students.find((s) => s.studentProfileId === studentProfileId);
      const saved = student?.scores.find((s) => s.assessmentId === a.id);
      const score = saved?.score ?? null;
      if (score != null && a.maxScore > 0) {
        const pct = (score / a.maxScore) * 100;
        weighted += pct * a.weightPercent;
        totalWeight += a.weightPercent;
      }
    }
    if (totalWeight === 0) return null;
    return Math.round(weighted / totalWeight);
  }

  function renderReadonlyScoreCell(score: number | null, maxScore: number) {
    const hasValue = score != null;
    return (
      <span
        className={`res-scores-readonly${hasValue ? " res-scores-readonly--filled" : ""}`}
      >
        {hasValue ? (
          <>
            <strong>{score}</strong>
            <span className="res-scores-readonly__max">/{maxScore}</span>
          </>
        ) : (
          "—"
        )}
      </span>
    );
  }

  function renderScoreSheetTable(sheet: ScoreMatrix, readOnly: boolean) {
    return (
      <>
        <div className="res-scores-sheet__table">
          <table className="res-scores-table">
            <thead>
              <tr>
                <th className="res-scores-table__student-col">Student</th>
                {sheet.assessments.map((a) => (
                  <th key={a.id}>
                    <span className="res-scores-table__col-name">{a.name}</span>
                    <span className="res-scores-table__col-meta">
                      /{a.maxScore} · {a.weightPercent}%
                    </span>
                  </th>
                ))}
                <th className="res-scores-table__avg-col">Avg</th>
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((st) => {
                const avg = readOnly
                  ? sheetRowAverage(sheet, st.studentProfileId)
                  : studentRowAverage(st.studentProfileId);
                return (
                  <tr key={st.studentProfileId}>
                    <td className="res-scores-table__student">
                      <span className="res-scores-table__avatar" aria-hidden>
                        {studentInitials(st.name)}
                      </span>
                      <span className="res-scores-table__student-name">{st.name}</span>
                    </td>
                    {sheet.assessments.map((a) => {
                      const saved = st.scores.find((s) => s.assessmentId === a.id);
                      return (
                        <td key={a.id} className="res-scores-table__cell">
                          {readOnly ? (
                            renderReadonlyScoreCell(saved?.score ?? null, a.maxScore)
                          ) : (
                            renderScoreCell(st.studentProfileId, a.id, a.maxScore)
                          )}
                        </td>
                      );
                    })}
                    <td className="res-scores-table__avg">
                      {avg != null ? `${avg}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="res-scores-sheet__mobile">
          {sheet.students.map((st) => {
            const avg = readOnly
              ? sheetRowAverage(sheet, st.studentProfileId)
              : studentRowAverage(st.studentProfileId);
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
                  {sheet.assessments.map((a) => {
                    const saved = st.scores.find((s) => s.assessmentId === a.id);
                    return (
                      <label key={a.id} className="res-scores-row-card__field">
                        <span>
                          {a.name} <em>/{a.maxScore}</em>
                        </span>
                        {readOnly ? (
                          renderReadonlyScoreCell(saved?.score ?? null, a.maxScore)
                        ) : (
                          renderScoreCell(st.studentProfileId, a.id, a.maxScore)
                        )}
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  }

  const { filledScores, totalCells, completionPct } = useMemo(() => {
    const sources = isAggregated
      ? aggregatedSheets.map((s) => s.matrix)
      : matrix
        ? [matrix]
        : [];
    if (sources.length === 0) return { filledScores: 0, totalCells: 0, completionPct: 0 };
    let total = 0;
    let filled = 0;
    for (const m of sources) {
      total += m.students.length * m.assessments.length;
      for (const st of m.students) {
        filled += st.scores.filter((sc) => sc.score != null).length;
      }
    }
    return {
      filledScores: filled,
      totalCells: total,
      completionPct: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }, [isAggregated, aggregatedSheets, matrix]);

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

      <div className="res-scores-head res-scores-head--modern">
        {toolbarReady ? (
        <div className="res-scores-filters res-scores-toolbar res-scores-toolbar--quad">
          <label className="res-scores-field">
            <span>Term</span>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={controlsDisabled}
            >
              {terms.length === 0 ? <option value="">No terms</option> : null}
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="res-scores-field">
            <span>Grade</span>
            <select
              value={gradeId}
              onChange={(e) => selectGrade(e.target.value)}
              disabled={controlsDisabled || grades.length === 0}
            >
              {grades.length === 0 ? <option value="">No grades</option> : null}
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="res-scores-field res-scores-field--wide">
            <span>Subject</span>
            <select
              value={subjectId}
              onChange={(e) => selectSubject(e.target.value)}
              disabled={controlsDisabled || subjectsForGrade.length === 0}
            >
              <option value={ALL}>All subjects</option>
              {subjectsForGrade.length === 0 ? (
                <option value="">No subjects assigned</option>
              ) : null}
              {subjectsForGrade.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {hasSections ? (
            <label className="res-scores-field res-scores-field--section">
              <span>Section</span>
              <select
                value={sectionId}
                onChange={(e) => selectSection(e.target.value)}
                disabled={controlsDisabled}
              >
                <option value={ALL}>All sections</option>
                {sectionsForFilter
                  .filter((s) => s.id !== "")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
        </div>
        ) : (
        <div
          className="res-scores-toolbar res-scores-toolbar--quad res-scores-toolbar--placeholder"
          aria-hidden
        >
          <label className="res-scores-field">
            <span>Term</span>
            <select disabled defaultValue="">
              <option value="">Loading…</option>
            </select>
          </label>
          <label className="res-scores-field">
            <span>Grade</span>
            <select disabled defaultValue="">
              <option value="">Loading…</option>
            </select>
          </label>
          <label className="res-scores-field res-scores-field--wide">
            <span>Subject</span>
            <select disabled defaultValue="">
              <option value="">Loading…</option>
            </select>
          </label>
          <label className="res-scores-field res-scores-field--section">
            <span>Section</span>
            <select disabled defaultValue="">
              <option value="">Loading…</option>
            </select>
          </label>
        </div>
        )}

        <div className="res-scores-context">
          <div className="res-scores-context__main">
            <div className="res-scores-context__title-row">
              <h2 className="res-scores-context__title">
                {heroTitle(
                  selectedCs,
                  selectedGrade?.name ?? "Grade",
                  subjectId,
                  selectedSubjectName,
                  sectionId,
                  selectedSectionName,
                )}
                {!canEditScores && selectedCs ? " (view)" : ""}
              </h2>
              {workflowStatus && !isAggregated ? (
                <span
                  className={`res-scores-workflow-pill res-scores-workflow-pill--${workflowStatus.toLowerCase()}`}
                >
                  {WORKFLOW_LABELS[workflowStatus]}
                </span>
              ) : null}
            </div>
            <p className="res-scores-context__meta">
              {selectedTerm?.name ?? "Select term"}
              {matrix?.template ? ` · ${matrix.template.name}` : ""}
              {viewOnlyHomeroom ? " · View only (homeroom)" : ""}
            </p>
          </div>
          <div className="res-scores-context__metrics">
            <div className="res-metric-pill">
              <strong>
                {isAggregated
                  ? aggregatedSheets.reduce((n, s) => n + s.matrix.students.length, 0)
                  : (displayMatrix?.students.length ?? 0)}
              </strong>
              <span>Students</span>
            </div>
            <div className="res-metric-pill">
              <strong>
                {isAggregated
                  ? activeClassSubjects.length
                  : (displayMatrix?.assessments.length ?? 0)}
              </strong>
              <span>{isAggregated ? "Classes" : "Components"}</span>
            </div>
            <div className="res-metric-pill res-metric-pill--accent">
              <strong>{completionPct}%</strong>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {isAggregated || viewOnlyHomeroom || (!isAggregated && statusInfo) ? (
          <div className="res-scores-head__insights">
            {isAggregated ? (
              <div className="res-scores-insight res-scores-insight--info">
                <span className="res-scores-insight__icon" aria-hidden>
                  ℹ
                </span>
                <div>
                  <strong>Overview mode</strong>
                  <p>
                    Showing scores across{" "}
                    {subjectId === ALL
                      ? "all subjects"
                      : subjectsForGrade.find((s) => s.id === subjectId)?.name}
                    {sectionId === ALL
                      ? " and all sections"
                      : sectionsForFilter.find((s) => s.id === sectionId)?.name
                        ? ` in ${sectionsForFilter.find((s) => s.id === sectionId)?.name}`
                        : ""}
                    . Pick a specific subject and section to enter or edit scores.
                  </p>
                </div>
              </div>
            ) : null}
            {viewOnlyHomeroom ? (
              <div className="res-scores-insight res-scores-insight--info">
                <span className="res-scores-insight__icon" aria-hidden>
                  👁
                </span>
                <div>
                  <strong>View only</strong>
                  <p>
                    As homeroom teacher you can review scores for your class. Only the assigned
                    subject teacher
                    {selectedCs?.teacher
                      ? ` (${selectedCs.teacher.firstName} ${selectedCs.teacher.lastName})`
                      : ""}{" "}
                    can enter or change marks.
                  </p>
                </div>
              </div>
            ) : null}
            {statusInfo && !viewOnlyHomeroom && !isAggregated ? (
              <div className={`res-scores-insight res-scores-insight--${statusInfo.tone}`}>
                <span className="res-scores-insight__icon" aria-hidden>
                  {statusInfo.tone === "success" ? "✓" : "ℹ"}
                </span>
                <div>
                  <strong>{statusInfo.title}</strong>
                  <p>{statusInfo.body}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {booting || loading ? (
        <div className="res-scores-loading">
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>Loading score sheet…</p>
        </div>
      ) : classSubjects.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--lg" />
          </div>
          <h3>No classes assigned</h3>
          <p>Link grade, section, subject, and teacher before score entry.</p>
          {role === "admin" || role === "staff" ? (
            <Link href="/admin/subjects/assign" className="res-scores-btn res-scores-btn--primary">
              Assign subjects
            </Link>
          ) : null}
        </div>
      ) : !isAggregated && matrix && matrix.assessments.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--lg" />
          </div>
          <h3>No grading components</h3>
          <p>Assign an assessment template to this class to unlock the score grid.</p>
          {role === "admin" || role === "staff" ? (
            <Link href="/admin/results/templates" className="res-scores-btn res-scores-btn--primary">
              Assessment templates
            </Link>
          ) : null}
        </div>
      ) : !isAggregated && matrix && matrix.students.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--lg" />
          </div>
          <h3>No students in this class</h3>
          <p>
            Enroll learners in {selectedCs?.grade.name ?? "this grade"}
            {selectedCs?.section ? ` · ${selectedCs.section.name}` : ""} before entering scores.
          </p>
          <Link href="/admin/students" className="res-scores-btn res-scores-btn--primary">
            Go to students
          </Link>
        </div>
      ) : hasSheet ? (
        isAggregated ? (
          <div className="res-scores-aggregate">
            <div className="res-scores-sheet__head res-scores-sheet__head--aggregate">
              <div>
                <h3 className="res-scores-sheet__title">Score overview</h3>
                <p className="res-scores-sheet__meta">
                  {filledScores} of {totalCells} entered across {aggregatedSheets.length} class
                  {aggregatedSheets.length === 1 ? "" : "es"}
                </p>
              </div>
            </div>
            <div className="res-scores-progress">
              <div className="res-scores-progress__bar">
                <span style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            {aggregatedSheets.map(({ classSubject: cs, matrix: sheet }) => {
              if (sheet.assessments.length === 0 || sheet.students.length === 0) return null;
              const sectionLabel = cs.section?.name ? ` · ${cs.section.name}` : "";
              const sheetFilled = sheet.students.reduce(
                (sum, st) => sum + st.scores.filter((sc) => sc.score != null).length,
                0,
              );
              const sheetTotal = sheet.students.length * sheet.assessments.length;
              return (
                <section key={cs.id} className="res-scores-sheet res-scores-sheet--group">
                  <div className="res-scores-sheet__head">
                    <div>
                      <h3 className="res-scores-sheet__title">
                        {cs.subject.name}
                        {sectionLabel}
                      </h3>
                      <p className="res-scores-sheet__meta">
                        {sheetFilled} of {sheetTotal} entered
                        {sheet.workflow?.status ? (
                          <> · {WORKFLOW_LABELS[sheet.workflow.status as ResultWorkflowStatus]}</>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {renderScoreSheetTable(sheet, true)}
                </section>
              );
            })}
          </div>
        ) : (
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
                {matrix!.assessments.map((a) => {
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

          {renderScoreSheetTable(matrix!, false)}
        </section>
        )
      ) : null}
    </div>
  );
}
