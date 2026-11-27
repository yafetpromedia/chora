"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { StudentSectionBanner } from "@/components/student/student-section-banner";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  createScoreCorrection,
  getScoreMatrix,
  getStudentSubjectMatrix,
  listClassSubjects,
  listTerms,
  saveStudentSubjectMatrix,
  type AcademicTerm,
  type ClassSubject,
  type StudentSubjectMatrix,
} from "@/lib/results";
import { AppToast } from "@/components/ui/app-toast";
import { MyScoreReportsPanel } from "@/components/results/my-score-reports-panel";
import {
  ResultsStudentPicker,
  type ResultsStudentOption,
} from "@/components/results/results-student-picker";
import { useLocale } from "@/components/i18n/locale-provider";
import { subjectCompactLabel } from "@/lib/subject-label";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type StudentOption = ResultsStudentOption;

type Props = {
  role: "admin" | "teacher" | "staff" | "student" | "parent";
  students?: StudentOption[];
  defaultTermId?: string;
  defaultStudentId?: string;
  /** Parent/student portal: explicit child when role is parent (or multi-account). */
  portalStudentProfileId?: string;
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
  portalStudentProfileId,
  readOnly = false,
  hideStudentPicker = false,
  loadStudentsFromClasses = false,
  initialClassSubjectId,
}: Props) {
  const { t, tn } = useLocale();
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
  const [reportTarget, setReportTarget] = useState<{
    assessmentId: string;
    assessmentName: string;
    subjectName: string;
    score: number | null;
    maxScore: number | null;
  } | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportFlash, setReportFlash] = useState("");
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  const students = studentsProp.length > 0 ? studentsProp : loadedStudents;
  const showStudentPicker = !hideStudentPicker && !isPortalView && students.length > 0;
  const showClassPicker = loadStudentsFromClasses && classSubjects.length > 0;

  useEffect(() => {
    void listTerms()
      .then((termsList) => {
        setTerms(termsList);
        if (!termId) {
          const current =
            defaultTermId ?? termsList.find((x) => x.isCurrent)?.id ?? termsList[0]?.id ?? "";
          if (current) setTermId(current);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.loadTermsFailed")),
      );
  }, [defaultTermId, termId]);

  useEffect(() => {
    if (!loadStudentsFromClasses || studentsProp.length > 0) return;
    void listClassSubjects()
      .then((cs) => {
        setClassSubjects(cs);
        const match =
          initialClassSubjectId && cs.some((c) => c.id === initialClassSubjectId)
            ? initialClassSubjectId
            : "";
        setClassSubjectId(match);
      })
      .catch(() => setError(t("studentSubjectScoresUi.loadClassesFailed")));
  }, [loadStudentsFromClasses, studentsProp.length, initialClassSubjectId]);

  const [prevDefaultStudentId, setPrevDefaultStudentId] = useState(defaultStudentId);
  if (defaultStudentId !== prevDefaultStudentId) {
    setPrevDefaultStudentId(defaultStudentId);
    if (defaultStudentId) setStudentId(defaultStudentId);
  }

  const rosterSources = useMemo<ClassSubject[]>(() => {
    if (!loadStudentsFromClasses || studentsProp.length > 0 || !termId) {
      return [];
    }
    if (classSubjectId && classSubjects.some((c) => c.id === classSubjectId)) {
      return classSubjects.filter((c) => c.id === classSubjectId);
    }
    // One roster fetch per grade+section (not per subject)
    const seen = new Set<string>();
    const sources: ClassSubject[] = [];
    for (const cs of classSubjects) {
      const key = `${cs.grade.id}:${cs.section?.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(cs);
    }
    return sources;
  }, [loadStudentsFromClasses, studentsProp.length, termId, classSubjectId, classSubjects]);

  const [prevRosterSources, setPrevRosterSources] = useState(rosterSources);
  if (rosterSources !== prevRosterSources) {
    setPrevRosterSources(rosterSources);
    if (rosterSources.length > 0) setLoadingStudents(true);
  }

  useEffect(() => {
    const sources = rosterSources;
    if (sources.length === 0) return;

    void Promise.all(sources.map((cs) => getScoreMatrix(termId, cs.id)))
      .then((matrices) => {
        const byId = new Map<string, StudentOption>();
        for (let i = 0; i < matrices.length; i++) {
          const cs = sources[i];
          const data = matrices[i];
          for (const s of data.students) {
            if (byId.has(s.studentProfileId)) continue;
            byId.set(s.studentProfileId, {
              id: s.studentProfileId,
              name: s.name,
              grade: cs.grade.name,
              gradeId: cs.grade.id,
              section: cs.section?.name ?? null,
              sectionId: cs.section?.id ?? null,
              studentId: s.studentId ?? null,
              photoUrl: s.photoUrl ?? null,
            });
          }
        }
        const next = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
        setLoadedStudents(next);
        setStudentId((current) => {
          if (current && next.some((s) => s.id === current)) return current;
          return next[0]?.id ?? "";
        });
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.loadStudentsFailed")),
      )
      .finally(() => setLoadingStudents(false));
  }, [rosterSources, termId]);

  const loadMatrix = useCallback(async () => {
    if (!termId) return;
    if (!isPortalView && !studentId) return;
    if (role === "parent" && !portalStudentProfileId) return;

    setLoading(true);
    setError("");
    try {
      const data = await getStudentSubjectMatrix(
        termId,
        isPortalView
          ? portalStudentProfileId || undefined
          : studentId,
      );
      setMatrix(data);
      setDraft({});
      setSaved(false);
      if (isPortalView) setStudentId(data.student.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.loadScoresFailed"));
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [termId, studentId, isPortalView, role, portalStudentProfileId]);

  const matrixEligible =
    Boolean(termId) &&
    (isPortalView || Boolean(studentId)) &&
    !(role === "parent" && !portalStudentProfileId);
  const matrixKey = matrixEligible
    ? `${termId}|${studentId}|${String(isPortalView)}|${role}|${portalStudentProfileId ?? ""}`
    : "";
  const [prevMatrixKey, setPrevMatrixKey] = useState("");
  if (matrixKey !== prevMatrixKey) {
    setPrevMatrixKey(matrixKey);
    if (matrixKey) {
      setLoading(true);
      setError("");
    }
  }

  useEffect(() => {
    if (!matrixEligible) return;
    void (async () => {
      try {
        const data = await getStudentSubjectMatrix(
          termId,
          isPortalView ? portalStudentProfileId || undefined : studentId,
        );
        setMatrix(data);
        setDraft({});
        setSaved(false);
        if (isPortalView) setStudentId(data.student.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.loadScoresFailed"));
        setMatrix(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [matrixEligible, termId, studentId, isPortalView, portalStudentProfileId]);

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
      setError(t("studentSubjectScoresUi.enterBeforeSave"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveStudentSubjectMatrix({ termId, studentProfileId: studentId, entries });
      setSaved(true);
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function submitScoreReport() {
    if (!reportTarget || !matrix) return;
    if (reportMessage.trim().length < 3) {
      setError(t("studentSubjectScoresUi.reportTooShort"));
      return;
    }
    setReportBusy(true);
    setError("");
    try {
      await createScoreCorrection({
        assessmentId: reportTarget.assessmentId,
        studentProfileId: matrix.student.id,
        message: reportMessage.trim(),
      });
      setReportFlash(t("studentSubjectScoresUi.reportSent"));
      setReportTarget(null);
      setReportMessage("");
      setReportsRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentSubjectScoresUi.sendReportFailed"));
    } finally {
      setReportBusy(false);
    }
  }

  const selectedTerm = terms.find((term) => term.id === termId);
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
    const publishedSubjects = matrix.subjects.filter(
      (s) => s.workflowStatus === "PUBLISHED",
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
      publishedSubjects,
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
          eyebrow={selectedTerm?.name ?? matrix?.term.name ?? t("studentSubjectScoresUi.termScores")}
          title={
            role === "parent"
              ? t("studentSubjectScoresUi.childResults")
              : t("studentSubjectScoresUi.myResults")
          }
          subtitle={
            role === "parent"
              ? portalStats && portalStats.publishedSubjects > 0
                ? t(
                    portalStats.publishedSubjects === 1
                      ? "studentSubjectScoresUi.parentPubSubOne"
                      : "studentSubjectScoresUi.parentPubSub",
                    { count: portalStats.publishedSubjects },
                  )
                : t("studentSubjectScoresUi.parentDefaultSub")
              : t("studentSubjectScoresUi.myResultsSub")
          }
          icon={<DashIcon name="results" className="dash-icon--sm" />}
          stats={
            portalStats
              ? [
                  {
                    value: portalStats.average ?? "—",
                    label: t("studentSubjectScoresUi.average"),
                  },
                  { value: portalStats.subjects, label: t("studentSubjectScoresUi.subjects") },
                  {
                    value: portalStats.publishedSubjects,
                    label: t("studentSubjectScoresUi.published"),
                  },
                ]
              : [
                  { value: "—", label: t("studentSubjectScoresUi.average") },
                  { value: 0, label: t("studentSubjectScoresUi.subjects") },
                  { value: 0, label: t("studentSubjectScoresUi.published") },
                ]
          }
        />
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast
        message={saved ? t("studentSubjectScoresUi.scoresSaved") : ""}
        tone="success"
        onDismiss={() => setSaved(false)}
      />

      {!isPortalView ? (
        <div className="res-scores-head res-scores-head--modern">
          <div className="res-scores-context res-scores-context--hero">
            <div className="res-scores-context__main">
              <div className="res-scores-context__brand">
                <span className="res-scores-context__chip">{t("studentSubjectScoresUi.byStudentChip")}</span>
              </div>
              <h2 className="res-scores-context__title">
                {selectedStudent?.name ?? matrix?.student.name ?? t("studentSubjectScoresUi.titleFallback")}
              </h2>
              <p className="res-scores-context__meta">
                {selectedTerm?.name ?? t("scoreMatrixUi.selectTerm")}
                {matrix?.student.grade
                  ? ` · ${matrix.student.grade}`
                  : selectedStudent?.grade
                    ? ` · ${selectedStudent.grade}`
                    : ""}
                {matrix?.student.section
                  ? ` · ${matrix.student.section}`
                  : selectedStudent?.section
                    ? ` · ${selectedStudent.section}`
                    : ""}
                {matrix?.student.studentId
                  ? `${t("studentSubjectScoresUi.idPrefix")}${matrix.student.studentId}`
                  : selectedStudent?.studentId
                    ? `${t("studentSubjectScoresUi.idPrefix")}${selectedStudent.studentId}`
                    : ""}
                {t("studentSubjectScoresUi.oneRowPerSubject")}
              </p>
            </div>
            <div className="res-scores-context__metrics">
              <div className="res-metric-pill">
                <strong>{matrix?.subjects.length ?? 0}</strong>
                <span>{t("studentSubjectScoresUi.subjects")}</span>
              </div>
              <div className="res-metric-pill">
                <strong>{matrix?.columns.length ?? 0}</strong>
                <span>{t("studentSubjectScoresUi.components")}</span>
              </div>
              <div className="res-metric-pill res-metric-pill--accent">
                <strong>{completionPct}%</strong>
                <span>{t("studentSubjectScoresUi.complete")}</span>
              </div>
            </div>
          </div>

          <div className="res-scores-filters res-scores-toolbar res-scores-toolbar--triple">
            <label className="res-scores-field">
              <span>{t("scoreMatrixUi.term")}</span>
              <select value={termId} onChange={(e) => setTermId(e.target.value)}>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                    {term.isCurrent ? t("scoreMatrixUi.currentTerm") : ""}
                  </option>
                ))}
              </select>
            </label>
            {showClassPicker ? (
              <label className="res-scores-field res-scores-field--wide">
                <span>{t("studentSubjectScoresUi.rosterFrom")}</span>
                <select
                  value={classSubjectId}
                  onChange={(e) => setClassSubjectId(e.target.value)}
                  disabled={controlsDisabled}
                >
                  <option value="">{t("studentSubjectScoresUi.allMyClasses")}</option>
                  {classSubjects.map((c) => (
                    <option key={c.id} value={c.id}>
                      {classLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {showStudentPicker ? (
              <ResultsStudentPicker
                students={students}
                value={studentId}
                onChange={setStudentId}
                disabled={controlsDisabled}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {loading || loadingStudents ? (
        <div className="res-scores-loading">
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>
            {isPortalView
              ? t("studentSubjectScoresUi.loadingPortal")
              : t("studentSubjectScoresUi.loadingTeacher")}
          </p>
        </div>
      ) : !isPortalView && !studentId ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>{t("studentSubjectScoresUi.pickStudentTitle")}</h3>
          <p>{t("studentSubjectScoresUi.pickStudentBody")}</p>
        </div>
      ) : !matrix ? null : matrix.subjects.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>{t("studentSubjectScoresUi.noSubjectsTitle")}</h3>
          <p>{t("studentSubjectScoresUi.noSubjectsBody")}</p>
        </div>
      ) : matrix.columns.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <h3>{t("studentSubjectScoresUi.noComponentsTitle")}</h3>
          <p>{t("studentSubjectScoresUi.noComponentsBody")}</p>
        </div>
      ) : isPortalView && portalStats?.released === 0 ? (
        <div className="res-portal-empty">
          <p className="res-portal-empty__eyebrow">{selectedTerm?.name ?? matrix.term.name}</p>
          <h3>{t("studentSubjectScoresUi.noScoresTitle")}</h3>
          <p>{t("studentSubjectScoresUi.noScoresBody")}</p>
          <label className="res-portal-term">
            <span>{t("scoreMatrixUi.term")}</span>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {term.isCurrent ? t("scoreMatrixUi.currentTerm") : ""}
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
                    <span>{t("scoreMatrixUi.term")}</span>
                    <select value={termId} onChange={(e) => setTermId(e.target.value)}>
                      {terms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                          {term.isCurrent ? t("scoreMatrixUi.currentTerm") : ""}
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
                        <span>{t("studentSubjectScoresUi.average")}</span>
                      </div>
                    ) : null}
                    <div className="res-portal-stat">
                      <strong>{portalStats.subjects}</strong>
                      <span>{t("studentSubjectScoresUi.subjects")}</span>
                    </div>
                    <div className="res-portal-stat">
                      <strong>{portalStats.publishedSubjects}</strong>
                      <span>{t("studentSubjectScoresUi.published")}</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div>
                  <h3 className="res-subject-sheet__title">
                    {t("studentSubjectScoresUi.scoreGrid", {
                      term: selectedTerm?.name ?? matrix.term.name,
                    })}
                  </h3>
                  <p className="res-subject-sheet__meta">
                    {t("studentSubjectScoresUi.enteredOf", {
                      filled: stats.filled,
                      total: stats.total,
                    })}
                  </p>
                </div>
                <div
                  className="res-subject-legend"
                  aria-label={t("studentSubjectScoresUi.legendAria")}
                >
                  <span className="res-subject-legend__item res-subject-legend__item--committed">
                    {t("studentSubjectScoresUi.committed")}
                  </span>
                  {canEdit ? (
                    <span className="res-subject-legend__item res-subject-legend__item--temp">
                      {t("studentSubjectScoresUi.temp")}
                    </span>
                  ) : null}
                  <span className="res-subject-legend__item res-subject-legend__item--missing">
                    {t("studentSubjectScoresUi.missing")}
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
                <p className="res-scores-progress__label">
                  {t("studentSubjectScoresUi.percentComplete", { pct: completionPct })}
                </p>
              </div>
              <div className="res-subject-sheet__actions">
                {hasDraft ? (
                  <button
                    type="button"
                    className="res-scores-btn res-scores-btn--primary"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? t("common.saving") : t("studentSubjectScoresUi.saveChanges")}
                  </button>
                ) : (
                  <p className="res-subject-sheet__progress">{t("studentSubjectScoresUi.allSaved")}</p>
                )}
              </div>
            </>
          ) : null}

          <div className="res-subject-sheet__table-wrap">
            <table className="res-subject-table">
              <thead>
                <tr>
                  <th className="res-subject-table__subject-col">{t("studentSubjectScoresUi.colSubject")}</th>
                  {matrix.columns.map((col) => (
                    <th key={col.key}>
                      <span className="res-subject-table__col-name">{col.name}</span>
                    </th>
                  ))}
                  <th className="res-subject-table__total-col">{t("studentSubjectScoresUi.colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.subjects.map((subject) => {
                  const total = subjectRowTotal(subject, draft, getSavedScore);
                  const isPublished = subject.workflowStatus === "PUBLISHED";
                  return (
                    <tr key={subject.classSubjectId}>
                      <th scope="row" className="res-subject-table__subject">
                        <span
                          className="res-subject-table__subject-name"
                          title={subject.subject}
                        >
                          {subjectCompactLabel({ name: subject.subject })}
                        </span>
                        {isPortalView ? (
                          <span
                            className={`res-scores-workflow-pill res-scores-workflow-pill--${
                              isPublished ? "published" : "draft"
                            }`}
                            title={
                              isPublished
                                ? t("studentSubjectScoresUi.publishedTitle")
                                : t("studentSubjectScoresUi.draftTitle")
                            }
                          >
                            {isPublished
                              ? t("studentSubjectScoresUi.publishedPill")
                              : t("studentSubjectScoresUi.inProgress")}
                          </span>
                        ) : null}
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
                            <div className="res-subject-cell-stack">
                              <span
                                className={`res-subject-pill${
                                  isCommitted
                                    ? " res-subject-pill--committed"
                                    : pendingClass
                                }`}
                              >
                                {isPending ? "·" : value}
                              </span>
                              {isPortalView && isPublished && cell.assessmentId ? (
                                <button
                                  type="button"
                                  className="res-subject-report-btn"
                                  title={t("studentSubjectScoresUi.reportTitle")}
                                  onClick={() => {
                                    const col = matrix.columns.find(
                                      (c) => c.key === cell.columnKey,
                                    );
                                    setReportFlash("");
                                    setReportMessage("");
                                    setReportTarget({
                                      assessmentId: cell.assessmentId!,
                                      assessmentName: col?.name ?? t("studentSubjectScoresUi.componentFallback"),
                                      subjectName: subject.subject,
                                      score: value,
                                      maxScore: cell.maxScore,
                                    });
                                  }}
                                >
                                  {t("studentSubjectScoresUi.reportBtn")}
                                </button>
                              ) : null}
                            </div>
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
            <p className="res-subject-sheet__hint">{t("studentSubjectScoresUi.teacherHint")}</p>
          ) : (
            <p className="res-subject-sheet__hint">{t("studentSubjectScoresUi.portalHint")}</p>
          )}
        </section>
      )}

      {isPortalView && termId ? (
        <MyScoreReportsPanel
          termId={termId}
          refreshKey={reportsRefreshKey}
          role={role === "parent" ? "parent" : "student"}
          studentProfileId={
            role === "parent" ? (portalStudentProfileId ?? studentId) : undefined
          }
        />
      ) : null}

      {reportFlash ? (
        <AppToast
          message={reportFlash}
          tone="success"
          onDismiss={() => setReportFlash("")}
        />
      ) : null}

      {reportTarget ? (
        <div className="res-correction-drawer" role="dialog" aria-modal="true">
          <div className="res-correction-drawer__panel">
            <header className="res-correction-drawer__head">
              <div>
                <h3>{t("studentSubjectScoresUi.reportDrawerTitle")}</h3>
                <p>
                  {reportTarget.subjectName} · {reportTarget.assessmentName}
                  {reportTarget.score != null
                    ? reportTarget.maxScore != null
                      ? t("studentSubjectScoresUi.reportShowingMax", {
                          score: reportTarget.score,
                          max: reportTarget.maxScore,
                        })
                      : t("studentSubjectScoresUi.reportShowing", {
                          score: reportTarget.score,
                        })
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="res-approvals__btn res-approvals__btn--sm"
                onClick={() => setReportTarget(null)}
              >
                {t("common.cancel")}
              </button>
            </header>
            <label className="res-correction-drawer__field">
              <span>{t("studentSubjectScoresUi.whatWrong")}</span>
              <textarea
                rows={4}
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder={t("studentSubjectScoresUi.reportPlaceholder")}
              />
            </label>
            <div className="res-correction-drawer__actions">
              <button
                type="button"
                className="res-approvals__btn res-approvals__btn--primary"
                disabled={reportBusy}
                onClick={() => void submitScoreReport()}
              >
                {reportBusy ? t("studentSubjectScoresUi.sending") : t("studentSubjectScoresUi.sendReport")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
