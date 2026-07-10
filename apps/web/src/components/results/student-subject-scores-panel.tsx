"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { StudentSectionBanner } from "@/components/student/student-section-banner";
import {
  getScoreMatrix,
  getStudentSubjectMatrix,
  listClassSubjects,
  listTerms,
  saveStudentSubjectMatrix,
  type AcademicTerm,
  type ClassSubject,
  type StudentSubjectMatrix,
} from "@/lib/results";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type StudentOption = {
  id: string;
  name: string;
  grade?: string;
};

type Props = {
  role: "admin" | "teacher" | "staff" | "student" | "parent";
  students?: StudentOption[];
  defaultTermId?: string;
  defaultStudentId?: string;
  readOnly?: boolean;
  hideStudentPicker?: boolean;
  loadStudentsFromClasses?: boolean;
  initialClassSubjectId?: string | null;
};

type DraftKey = `${string}:${string}`;

function draftKey(classSubjectId: string, assessmentId: string): DraftKey {
  return `${classSubjectId}:${assessmentId}`;
}

function classLabel(cs: ClassSubject) {
  return `${cs.grade.name}${cs.section ? ` · ${cs.section.name}` : ""} — ${cs.subject.name}`;
}

function subjectRowTotal(
  subject: StudentSubjectMatrix["subjects"][number],
  draft: Record<DraftKey, number>,
  getSavedScore: (
    classSubjectId: string,
    assessmentId: string,
  ) => number | null,
) {
  let weighted = 0;
  let totalWeight = 0;
  for (const cell of subject.cells) {
    if (!cell.assessmentId || !cell.maxScore) continue;
    const fromDraft = draft[draftKey(subject.classSubjectId, cell.assessmentId)];
    const score =
      fromDraft != null && !Number.isNaN(fromDraft)
        ? fromDraft
        : getSavedScore(subject.classSubjectId, cell.assessmentId);
    if (score != null && cell.weightPercent) {
      weighted += (score / cell.maxScore) * 100 * cell.weightPercent;
      totalWeight += cell.weightPercent;
    }
  }
  if (totalWeight === 0) return null;
  return Math.round((weighted / totalWeight) * 10) / 10;
}

export function StudentSubjectScoresPanel({
  role,
  students: studentsProp = [],
  defaultTermId,
  defaultStudentId,
  readOnly = false,
  hideStudentPicker = false,
  loadStudentsFromClasses = false,
  initialClassSubjectId,
}: Props) {
  const hydrated = useHydrated();
  const isPortalView = role === "student" || role === "parent";
  const canEdit = !readOnly && !isPortalView;

  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [classSubjectId, setClassSubjectId] = useState("");
  const [loadedStudents, setLoadedStudents] = useState<StudentOption[]>([]);
  const [termId, setTermId] = useState(defaultTermId ?? "");
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [matrix, setMatrix] = useState<StudentSubjectMatrix | null>(null);
  const [draft, setDraft] = useState<Record<DraftKey, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const students = studentsProp.length > 0 ? studentsProp : loadedStudents;
  const showStudentPicker = !hideStudentPicker && !isPortalView && students.length > 0;
  const showClassPicker = loadStudentsFromClasses && classSubjects.length > 0;

  useEffect(() => {
    void listTerms()
      .then((t) => {
        setTerms(t);
        if (!termId) {
          const current = defaultTermId ?? t.find((x) => x.isCurrent)?.id ?? t[0]?.id ?? "";
          if (current) setTermId(current);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load terms"));
  }, [defaultTermId, termId]);

  useEffect(() => {
    if (!loadStudentsFromClasses || studentsProp.length > 0) return;
    void listClassSubjects()
      .then((cs) => {
        setClassSubjects(cs);
        const match =
          initialClassSubjectId && cs.some((c) => c.id === initialClassSubjectId)
            ? initialClassSubjectId
            : cs[0]?.id ?? "";
        if (match) setClassSubjectId(match);
      })
      .catch(() => setError("Could not load classes"));
  }, [loadStudentsFromClasses, studentsProp.length, initialClassSubjectId]);

  useEffect(() => {
    if (defaultStudentId) setStudentId(defaultStudentId);
  }, [defaultStudentId]);

  useEffect(() => {
    if (!loadStudentsFromClasses || studentsProp.length > 0 || !termId || !classSubjectId) {
      return;
    }
    setLoadingStudents(true);
    void getScoreMatrix(termId, classSubjectId)
      .then((data) => {
        const next = data.students.map((s) => ({
          id: s.studentProfileId,
          name: s.name,
        }));
        setLoadedStudents(next);
        setStudentId((current) => {
          if (current && next.some((s) => s.id === current)) return current;
          return next[0]?.id ?? "";
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load students"))
      .finally(() => setLoadingStudents(false));
  }, [loadStudentsFromClasses, studentsProp.length, termId, classSubjectId]);

  const loadMatrix = useCallback(async () => {
    if (!termId) return;
    if (!isPortalView && !studentId) return;

    setLoading(true);
    setError("");
    try {
      const data = await getStudentSubjectMatrix(
        termId,
        isPortalView ? undefined : studentId,
      );
      setMatrix(data);
      setDraft({});
      setSaved(false);
      if (isPortalView) setStudentId(data.student.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load scores");
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [termId, studentId, isPortalView]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  const getSavedScore = useCallback(
    (classSubjectId: string, assessmentId: string) => {
      const subject = matrix?.subjects.find((s) => s.classSubjectId === classSubjectId);
      const cell = subject?.cells.find((c) => c.assessmentId === assessmentId);
      return cell?.score ?? null;
    },
    [matrix],
  );

  function getCellValue(classSubjectId: string, assessmentId: string): number | null {
    const key = draftKey(classSubjectId, assessmentId);
    const fromDraft = draft[key];
    if (fromDraft != null && !Number.isNaN(fromDraft)) return fromDraft;
    return getSavedScore(classSubjectId, assessmentId);
  }

  function isDraftCell(classSubjectId: string, assessmentId: string) {
    const key = draftKey(classSubjectId, assessmentId);
    return draft[key] != null && !Number.isNaN(draft[key]);
  }

  function isCellEditable(
    subject: StudentSubjectMatrix["subjects"][number],
    cell: StudentSubjectMatrix["subjects"][number]["cells"][number],
  ) {
    if (!canEdit) return false;
    if (!cell.assessmentId) return false;
    if (subject.workflowStatus === "PUBLISHED") return false;
    if (role === "teacher" && (!subject.canEditScores || cell.entryLocked)) return false;
    return true;
  }

  function setCell(
    classSubjectId: string,
    assessmentId: string,
    value: string,
    maxScore: number,
  ) {
    const num = value === "" ? NaN : Number(value);
    if (!Number.isNaN(num) && (num < 0 || num > maxScore)) return;
    setDraft((prev) => {
      const key = draftKey(classSubjectId, assessmentId);
      const next = { ...prev };
      if (Number.isNaN(num)) delete next[key];
      else next[key] = num;
      return next;
    });
    setSaved(false);
  }

  async function onSave() {
    if (!matrix || !termId || !studentId || !canEdit) return;
    const entries: {
      classSubjectId: string;
      assessmentId: string;
      score: number;
    }[] = [];

    for (const subject of matrix.subjects) {
      if (!subject.canEditScores && role === "teacher") continue;
      for (const cell of subject.cells) {
        if (!cell.assessmentId || !isCellEditable(subject, cell)) continue;
        const key = draftKey(subject.classSubjectId, cell.assessmentId);
        const score = draft[key];
        if (score != null && !Number.isNaN(score)) {
          entries.push({
            classSubjectId: subject.classSubjectId,
            assessmentId: cell.assessmentId,
            score,
          });
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
      await saveStudentSubjectMatrix({ termId, studentProfileId: studentId, entries });
      setSaved(true);
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedTerm = terms.find((t) => t.id === termId);
  const selectedStudent = students.find((s) => s.id === studentId);
  const hasDraft = canEdit && Object.keys(draft).length > 0;

  const stats = useMemo(() => {
    if (!matrix) return { filled: 0, total: 0 };
    let filled = 0;
    let total = 0;
    for (const subject of matrix.subjects) {
      for (const cell of subject.cells) {
        if (!cell.assessmentId) continue;
        total += 1;
        if (getCellValue(subject.classSubjectId, cell.assessmentId) != null) {
          filled += 1;
        }
      }
    }
    return { filled, total };
  }, [matrix, draft, getSavedScore]);

  const portalStats = useMemo(() => {
    if (!matrix || !isPortalView) return null;
    const subjectTotals = matrix.subjects
      .map((s) => subjectRowTotal(s, draft, getSavedScore))
      .filter((t): t is number => t != null && t > 0);
    const subjectsWithScores = matrix.subjects.filter((s) =>
      s.cells.some(
        (c) => c.assessmentId && getCellValue(s.classSubjectId, c.assessmentId) != null,
      ),
    ).length;
    const average =
      subjectTotals.length > 0
        ? Math.round(
            (subjectTotals.reduce((sum, t) => sum + t, 0) / subjectTotals.length) * 10,
          ) / 10
        : null;
    return {
      released: stats.filled,
      subjects: subjectsWithScores,
      average,
    };
  }, [matrix, draft, getSavedScore, isPortalView, stats.filled]);

  const completionPct =
    stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;

  const controlsDisabled = !hydrated || loadingStudents;

  const rootClass = isPortalView
    ? "res-subject-scores res-subject-scores--portal"
    : "res-subject-scores res-subject-scores--teacher";

  return (
    <div className={rootClass}>
      {isPortalView ? (
        <StudentSectionBanner
          tone="results"
          eyebrow={selectedTerm?.name ?? matrix?.term.name ?? "Term scores"}
          title="My results"
          subtitle="Scores released by your teachers, organized by subject."
          icon="📊"
          stats={
            portalStats
              ? [
                  {
                    value: portalStats.average ?? "—",
                    label: "Average",
                  },
                  { value: portalStats.subjects, label: "Subjects" },
                  { value: portalStats.released, label: "Released" },
                ]
              : [
                  { value: "—", label: "Average" },
                  { value: 0, label: "Subjects" },
                  { value: 0, label: "Released" },
                ]
          }
        />
      ) : null}

      {error ? <p className="res-scores-alert res-scores-alert--error">{error}</p> : null}
      {saved ? (
        <p className="res-scores-alert res-scores-alert--success">Scores saved.</p>
      ) : null}

      {!isPortalView ? (
        <div className="res-scores-head res-scores-head--modern">
          <div className="res-scores-context">
            <div className="res-scores-context__main">
              <p className="res-scores-context__eyebrow">Individual view</p>
              <h2 className="res-scores-context__title">
                {selectedStudent?.name ?? matrix?.student.name ?? "Subject scores by student"}
              </h2>
              <p className="res-scores-context__meta">
                {selectedTerm?.name ?? "Select term"}
                {matrix?.student.grade ? ` · ${matrix.student.grade}` : ""}
                {matrix?.student.section ? ` · ${matrix.student.section}` : ""}
                {" · One row per subject"}
              </p>
            </div>
            <div className="res-scores-context__metrics">
              <div className="res-metric-pill">
                <strong>{matrix?.subjects.length ?? 0}</strong>
                <span>Subjects</span>
              </div>
              <div className="res-metric-pill">
                <strong>{matrix?.columns.length ?? 0}</strong>
                <span>Components</span>
              </div>
              <div className="res-metric-pill res-metric-pill--accent">
                <strong>{completionPct}%</strong>
                <span>Complete</span>
              </div>
            </div>
          </div>

          <div className="res-scores-filters res-scores-toolbar res-scores-toolbar--triple">
            <label className="res-scores-field">
              <span>Term</span>
              <select value={termId} onChange={(e) => setTermId(e.target.value)}>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isCurrent ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {showClassPicker ? (
              <label className="res-scores-field res-scores-field--wide">
                <span>Class</span>
                <select
                  value={classSubjectId}
                  onChange={(e) => setClassSubjectId(e.target.value)}
                  disabled={controlsDisabled}
                >
                  {classSubjects.map((c) => (
                    <option key={c.id} value={c.id}>
                      {classLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {showStudentPicker ? (
              <label className="res-scores-field res-scores-field--wide">
                <span>Student</span>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={controlsDisabled}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.grade ? ` — ${s.grade}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading || loadingStudents ? (
        <div className="res-scores-loading">
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>{isPortalView ? "Loading your scores…" : "Loading subject scores…"}</p>
        </div>
      ) : !isPortalView && !studentId ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>Select a student</h3>
          <p>Choose a student from the toolbar to view their subject score sheet.</p>
        </div>
      ) : !matrix ? null : matrix.subjects.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>No subjects assigned</h3>
          <p>Assign subjects to this grade before entering scores.</p>
        </div>
      ) : matrix.columns.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>No assessment components</h3>
          <p>Assign assessment templates to classes first.</p>
        </div>
      ) : isPortalView && portalStats?.released === 0 ? (
        <div className="res-portal-empty">
          <p className="res-portal-empty__eyebrow">{selectedTerm?.name ?? matrix.term.name}</p>
          <h3>No scores released yet</h3>
          <p>When your teacher posts marks, they&apos;ll show up here by subject.</p>
          <label className="res-portal-term">
            <span>Term</span>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <section
          className={`res-subject-sheet${
            isPortalView ? " res-subject-sheet--portal" : " res-subject-sheet--teacher"
          }`}
        >
          <header className="res-subject-sheet__head">
            {isPortalView ? (
              <>
                <div className="res-portal-head">
                  <label className="res-portal-term">
                    <span>Term</span>
                    <select value={termId} onChange={(e) => setTermId(e.target.value)}>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.isCurrent ? " (current)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {matrix.student.grade ? (
                    <span className="res-portal-grade">
                      {matrix.student.grade}
                      {matrix.student.section ? ` · ${matrix.student.section}` : ""}
                    </span>
                  ) : null}
                </div>
                {portalStats ? (
                  <div className="res-portal-stats">
                    {portalStats.average != null ? (
                      <div className="res-portal-stat res-portal-stat--accent">
                        <strong>{portalStats.average}%</strong>
                        <span>Average</span>
                      </div>
                    ) : null}
                    <div className="res-portal-stat">
                      <strong>{portalStats.subjects}</strong>
                      <span>Subjects</span>
                    </div>
                    <div className="res-portal-stat">
                      <strong>{portalStats.released}</strong>
                      <span>Released</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div>
                  <h3 className="res-subject-sheet__title">
                    Score grid — {selectedTerm?.name ?? matrix.term.name}
                  </h3>
                  <p className="res-subject-sheet__meta">
                    {stats.filled} of {stats.total} scores entered
                  </p>
                </div>
                <div className="res-subject-legend" aria-label="Score status legend">
                  <span className="res-subject-legend__item res-subject-legend__item--committed">
                    committed
                  </span>
                  {canEdit ? (
                    <span className="res-subject-legend__item res-subject-legend__item--temp">
                      temp
                    </span>
                  ) : null}
                  <span className="res-subject-legend__item res-subject-legend__item--missing">
                    missing
                  </span>
                </div>
              </>
            )}
          </header>

          {!isPortalView ? (
            <>
              <div className="res-scores-progress res-scores-progress--sheet">
                <div className="res-scores-progress__bar">
                  <span style={{ width: `${completionPct}%` }} />
                </div>
                <p className="res-scores-progress__label">{completionPct}% complete</p>
              </div>
              <div className="res-subject-sheet__actions">
                {hasDraft ? (
                  <button
                    type="button"
                    className="res-scores-btn res-scores-btn--primary"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                ) : (
                  <p className="res-subject-sheet__progress">All changes saved</p>
                )}
              </div>
            </>
          ) : null}

          <div className="res-subject-sheet__table-wrap">
            <table className="res-subject-table">
              <thead>
                <tr>
                  <th className="res-subject-table__subject-col">Subject</th>
                  {matrix.columns.map((col) => (
                    <th key={col.key}>
                      <span className="res-subject-table__col-name">{col.name}</span>
                    </th>
                  ))}
                  <th className="res-subject-table__total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.subjects.map((subject) => {
                  const total = subjectRowTotal(subject, draft, getSavedScore);
                  return (
                    <tr key={subject.classSubjectId}>
                      <th scope="row" className="res-subject-table__subject">
                        {subject.subject}
                      </th>
                      {subject.cells.map((cell) => {
                        if (!cell.assessmentId) {
                          return (
                            <td key={cell.columnKey} className="res-subject-table__cell">
                              <span
                                className={`res-subject-pill${
                                  isPortalView ? " res-subject-pill--pending" : " res-subject-pill--na"
                                }`}
                              >
                                ·
                              </span>
                            </td>
                          );
                        }

                        const value = getCellValue(
                          subject.classSubjectId,
                          cell.assessmentId,
                        );
                        const editable = isCellEditable(subject, cell);
                        const isTemp = isDraftCell(
                          subject.classSubjectId,
                          cell.assessmentId,
                        );
                        const isCommitted = value != null && !isTemp;
                        const isPending = value == null && !isTemp;
                        const pendingClass = isPortalView
                          ? " res-subject-pill--pending"
                          : " res-subject-pill--missing";

                        if (editable) {
                          return (
                            <td key={cell.columnKey} className="res-subject-table__cell">
                              <input
                                type="number"
                                min={0}
                                max={cell.maxScore ?? undefined}
                                className={`res-subject-pill res-subject-pill--input${
                                  isTemp
                                    ? " res-subject-pill--temp"
                                    : isCommitted
                                      ? " res-subject-pill--committed"
                                      : " res-subject-pill--missing"
                                }`}
                                value={value ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  setCell(
                                    subject.classSubjectId,
                                    cell.assessmentId!,
                                    e.target.value,
                                    cell.maxScore ?? 100,
                                  )
                                }
                              />
                            </td>
                          );
                        }

                        return (
                          <td key={cell.columnKey} className="res-subject-table__cell">
                            <span
                              className={`res-subject-pill${
                                isCommitted
                                  ? " res-subject-pill--committed"
                                  : pendingClass
                              }`}
                            >
                              {isPending ? "·" : value}
                            </span>
                          </td>
                        );
                      })}
                      <td className="res-subject-table__total">
                        <strong
                          className={
                            total == null || total === 0
                              ? "res-subject-table__total--empty"
                              : "res-subject-table__total--ok"
                          }
                        >
                          {total != null && total > 0 ? total : "—"}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isPortalView ? (
            <p className="res-subject-sheet__hint">
              Assessment columns come from each subject&apos;s template — configure them under{" "}
              <strong>Assessment templates</strong>. Different schools can use different component
              names and weights.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
