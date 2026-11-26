"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/use-client-snapshot";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import type { GradeWithSections } from "@/lib/api";
import { listGrades } from "@/lib/school-setup";
import {
  getScoreMatrix,
  listClassSubjects,
  listTerms,
  publishResultWorkflow,
  reopenResultWorkflow,
  saveScoreMatrix,
  setAssessmentEntryLock,
  type AcademicTerm,
  type ClassSubject,
  type ResultWorkflowStatus,
  type ScoreMatrix,
} from "@/lib/results";
import { subjectCompactLabel } from "@/lib/subject-label";

type Props = {
  role: "admin" | "teacher" | "staff";
  initialClassSubjectId?: string | null;
};

const ALL = "__all__";

type MatrixT = (key: string, vars?: Record<string, string | number>) => string;

function workflowDisplay(
  status: ResultWorkflowStatus,
  t: MatrixT,
): {
  label: string;
  pill: "working" | "published";
} {
  if (status === "PUBLISHED") {
    return { label: t("scoreMatrixUi.workflowPublished"), pill: "published" };
  }
  return { label: t("scoreMatrixUi.workflowWorking"), pill: "working" };
}

function heroTitle(
  cs: ClassSubject | undefined,
  gradeName: string,
  subjectId: string,
  subjectName: string | null,
  sectionId: string,
  sectionName: string | null,
  t: MatrixT,
) {
  if (subjectId === ALL && sectionId === ALL) {
    return t("scoreMatrixUi.heroAllSubjectsAllSections", { grade: gradeName });
  }
  if (subjectId === ALL) {
    const section = sectionName ? ` · ${sectionName}` : "";
    return t("scoreMatrixUi.heroAllSubjects", { grade: gradeName, section });
  }
  if (sectionId === ALL) {
    return t("scoreMatrixUi.heroSubjectAllSections", {
      grade: gradeName,
      subject: subjectName ?? t("scoreMatrixUi.heroSubjectFallback"),
    });
  }
  if (!cs) return t("scoreMatrixUi.heroEnterScores");
  const section = cs.section ? ` · ${cs.section.name}` : "";
  return `${cs.grade.name}${section} — ${subjectCompactLabel(cs.subject)}`;
}

function sectionKey(cs: ClassSubject) {
  return cs.section?.id ?? "";
}

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function StudentFace({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        className={`${className ?? ""} res-scores-face res-scores-face--photo`.trim()}
        src={photoUrl}
        alt=""
      />
    );
  }
  return (
    <span className={`${className ?? ""} res-scores-face`.trim()} aria-hidden>
      {studentInitials(name)}
    </span>
  );
}

function statusMessage(
  status: ResultWorkflowStatus,
  role: Props["role"],
  hasOpenComponents: boolean,
  t: MatrixT,
) {
  if (status === "PUBLISHED") {
    return {
      title: t("scoreMatrixUi.statusPubTitle"),
      body:
        role === "teacher"
          ? t("scoreMatrixUi.statusPubBodyTeacher")
          : t("scoreMatrixUi.statusPubBodyAdmin"),
      tone: "success" as const,
    };
  }

  if (role === "teacher") {
    return {
      title: hasOpenComponents
        ? t("scoreMatrixUi.statusOpenTitle")
        : t("scoreMatrixUi.statusLockedTitle"),
      body: hasOpenComponents
        ? t("scoreMatrixUi.statusOpenBody")
        : t("scoreMatrixUi.statusLockedBody"),
      tone: "info" as const,
    };
  }

  return {
    title: t("scoreMatrixUi.statusWorkingTitle"),
    body: t("scoreMatrixUi.statusWorkingBody"),
    tone: "info" as const,
  };
}

/** Raw sum of component scores (not weighted %). */
function rowPointsTotal(
  studentProfileId: string,
  assessments: ScoreMatrix["assessments"],
  getScore: (studentProfileId: string, assessmentId: string) => number | null,
) {
  let sum = 0;
  let hasScore = false;
  for (const a of assessments) {
    const score = getScore(studentProfileId, a.id);
    if (score != null && !Number.isNaN(score)) {
      sum += score;
      hasScore = true;
    }
  }
  return hasScore ? sum : null;
}

function rowMaxPoints(assessments: ScoreMatrix["assessments"]) {
  return assessments.reduce((n, a) => n + (a.maxScore > 0 ? a.maxScore : 0), 0);
}

/** Weighted subject % for averages / rank. */
function rowWeightedAverage(
  studentProfileId: string,
  assessments: ScoreMatrix["assessments"],
  getScore: (studentProfileId: string, assessmentId: string) => number | null,
) {
  let weighted = 0;
  let totalWeight = 0;
  for (const a of assessments) {
    const score = getScore(studentProfileId, a.id);
    if (score != null && !Number.isNaN(score) && a.maxScore > 0) {
      weighted += (score / a.maxScore) * 100 * a.weightPercent;
      totalWeight += a.weightPercent;
    }
  }
  if (totalWeight === 0) return null;
  return Math.round((weighted / totalWeight) * 10) / 10;
}

function formatPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** Live subjects avg when this sheet's weighted % changes vs the saved subject total. */
function adjustedSubjectsAverage(
  summary: NonNullable<ScoreMatrix["students"][number]["summary"]> | undefined,
  liveSubjectAverage: number | null,
) {
  if (!summary) return liveSubjectAverage;
  const saved = summary.subjectTotal;
  const subjectsAvg = summary.subjectsAverage;
  const count = summary.subjectCount;

  if (liveSubjectAverage == null) {
    if (saved == null || subjectsAvg == null || count <= 1) {
      return count <= 1 ? null : subjectsAvg;
    }
    const nextCount = count - 1;
    if (nextCount <= 0) return null;
    return Math.round(((subjectsAvg * count - saved) / nextCount) * 10) / 10;
  }

  if (subjectsAvg == null || count === 0) return liveSubjectAverage;
  if (saved == null) {
    return (
      Math.round(((subjectsAvg * count + liveSubjectAverage) / (count + 1)) * 10) / 10
    );
  }
  return (
    Math.round((subjectsAvg + (liveSubjectAverage - saved) / count) * 10) / 10
  );
}

function rankByValue(values: { id: string; value: number | null }[], id: string) {
  const ranked = values
    .filter((v): v is { id: string; value: number } => v.value != null)
    .sort((a, b) => b.value - a.value);
  const index = ranked.findIndex((v) => v.id === id);
  if (index < 0) return null;
  let rank = 1;
  for (let i = 1; i <= index; i++) {
    if (ranked[i].value !== ranked[i - 1].value) rank = i + 1;
  }
  return rank;
}

export function ScoreMatrixPanel({ role, initialClassSubjectId }: Props) {
  const { t } = useLocale();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [schoolGrades, setSchoolGrades] = useState<GradeWithSections[]>([]);
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
  /** Set only in useEffect — starts false on server and client (hydration-safe). */
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  /** Avoid SSR/client mismatch on select `disabled` (React can serialize true as null). */
  const filtersInteractive = useHydrated();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [lockToggleBusy, setLockToggleBusy] = useState<string | null>(null);
  const [lockScope, setLockScope] = useState<"this" | "all">("this");
  const [error, setError] = useState("");
  const [statsTarget, setStatsTarget] = useState<{
    studentProfileId: string;
    classSubjectId: string;
  } | null>(null);

  const workflowStatus: ResultWorkflowStatus | null =
    matrix?.workflow?.status ?? null;
  const workflowFullyLocked = workflowStatus === "PUBLISHED";
  const canEditScores =
    role === "admin" || role === "staff" || (matrix?.canEditScores ?? true);
  const viewOnlyHomeroom = role === "teacher" && matrix != null && !canEditScores;
  const isSchoolAdmin = role === "admin" || role === "staff";

  useEffect(() => {
    void Promise.all([
      listTerms(),
      listClassSubjects(),
      isSchoolAdmin ? listGrades() : Promise.resolve([] as GradeWithSections[]),
    ])
      .then(([termRows, cs, allGrades]) => {
        setTerms(termRows);
        setClassSubjects(cs);
        setSchoolGrades(allGrades);
        const curTerm = termRows.find((x) => x.isCurrent) ?? termRows[0];
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
        } else if (allGrades[0]) {
          setGradeId(allGrades[0].id);
          setSubjectId("");
          setSectionId("");
          setClassSubjectId("");
        }
      })
      .catch(() => setError(t("scoreMatrixUi.loadClassesTermsFailed")))
      .finally(() => setFiltersLoaded(true));
  }, [initialClassSubjectId, isSchoolAdmin, t]);

  // Only set after mount so SSR HTML and the first client render both omit `disabled`.
  const filterSelectDisabled = filtersInteractive ? !filtersLoaded : undefined;

  const grades = useMemo(() => {
    if (isSchoolAdmin && schoolGrades.length > 0) {
      return schoolGrades.map((g) => ({ id: g.id, name: g.name }));
    }
    const map = new Map<string, string>();
    for (const cs of classSubjects) {
      if (!map.has(cs.grade.id)) map.set(cs.grade.id, cs.grade.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [classSubjects, isSchoolAdmin, schoolGrades]);

  const subjectsForGrade = useMemo(() => {
    const map = new Map<string, { name: string; code?: string | null }>();
    for (const cs of classSubjects.filter((c) => c.grade.id === gradeId)) {
      if (!map.has(cs.subject.id)) {
        map.set(cs.subject.id, {
          name: cs.subject.name,
          code: cs.subject.code ?? null,
        });
      }
    }
    return [...map.entries()].map(([id, value]) => ({
      id,
      name: value.name,
      code: value.code,
    }));
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
      setSubjectId(ALL);
      setSectionId(ALL);
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

  const loadMatrix = useCallback(async () => {
    if (!termId || !classSubjectId) return;
    setLoading(true);
    setError("");
    setSuccess("");
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
      setError(err instanceof Error ? err.message : t("scoreMatrixUi.loadScoresFailed"));
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, [termId, classSubjectId]);

  // Reset sheet state when the loaded sheet selection changes (adjusted during render).
  const [prevLoadDeps, setPrevLoadDeps] = useState<{
    termId: string;
    classSubjectId: string;
    isAggregated: boolean;
    activeClassSubjects: ClassSubject[];
  } | null>(null);
  if (
    prevLoadDeps === null ||
    prevLoadDeps.termId !== termId ||
    prevLoadDeps.classSubjectId !== classSubjectId ||
    prevLoadDeps.isAggregated !== isAggregated ||
    prevLoadDeps.activeClassSubjects !== activeClassSubjects
  ) {
    setPrevLoadDeps({ termId, classSubjectId, isAggregated, activeClassSubjects });
    if (termId) {
      if (isAggregated && activeClassSubjects.length > 0) {
        setLoading(true);
        setError("");
        setSuccess("");
        setMatrix(null);
      } else if (!isAggregated && classSubjectId) {
        setLoading(true);
        setError("");
        setSuccess("");
        setAggregatedSheets([]);
      } else {
        setMatrix(null);
        setAggregatedSheets([]);
      }
    }
  }

  useEffect(() => {
    if (!termId) return;
    if (isAggregated && activeClassSubjects.length > 0) {
      void (async () => {
        try {
          const results = await Promise.all(
            activeClassSubjects.map(async (cs) => ({
              classSubject: cs,
              matrix: await getScoreMatrix(termId, cs.id),
            })),
          );
          setAggregatedSheets(results);
        } catch (err) {
          setError(err instanceof Error ? err.message : t("scoreMatrixUi.loadScoresFailed"));
          setAggregatedSheets([]);
        } finally {
          setLoading(false);
        }
      })();
    } else if (!isAggregated && classSubjectId) {
      void (async () => {
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
          setError(err instanceof Error ? err.message : t("scoreMatrixUi.loadScoresFailed"));
          setMatrix(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [termId, classSubjectId, isAggregated, activeClassSubjects]);

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

  async function toggleAssessmentLock(assessmentId: string, open: boolean) {
    const name =
      matrix?.assessments.find((a) => a.id === assessmentId)?.name ??
        t("scoreMatrixUi.componentFallback");
    setLockToggleBusy(assessmentId);
    setError("");
    setSuccess("");
    try {
      const result = await setAssessmentEntryLock(assessmentId, !open, lockScope);
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
      if (lockScope === "all") {
        setSuccess(
          open
            ? t("scoreMatrixUi.lockOpenAll", {
                name,
                count: result.updatedCount,
              })
            : t("scoreMatrixUi.lockClosedAll", {
                name,
                count: result.updatedCount,
              }),
        );
      } else {
        setSuccess(
          open
            ? t("scoreMatrixUi.lockOpenClass", { name })
            : t("scoreMatrixUi.lockClosedClass", { name }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreMatrixUi.lockUpdateFailed"));
    } finally {
      setLockToggleBusy(null);
    }
  }

  function setCell(studentProfileId: string, assessmentId: string, value: string) {
    if (isCellLocked(assessmentId)) return;
    const maxScore =
      matrix?.assessments.find((a) => a.id === assessmentId)?.maxScore ?? null;
    const num = value === "" ? NaN : Number(value);
    setDraft((prev) => {
      const row = { ...(prev[studentProfileId] ?? {}) };
      if (Number.isNaN(num)) {
        delete row[assessmentId];
      } else if (num < 0) {
        row[assessmentId] = 0;
      } else if (maxScore != null && num > maxScore) {
        row[assessmentId] = maxScore;
      } else {
        row[assessmentId] = num;
      }
      return { ...prev, [studentProfileId]: row };
    });
    setSuccess("");
  }

  async function onWorkflowAction(action: "publish" | "reopen") {
    if (!termId || !classSubjectId) return;
    setWorkflowBusy(true);
    setError("");
    setSuccess("");
    try {
      if (action === "publish") await publishResultWorkflow(termId, classSubjectId);
      else await reopenResultWorkflow(termId, classSubjectId);
      await loadMatrix();
      setSuccess(
        action === "publish"
          ? t("scoreMatrixUi.resultsPublished")
          : t("scoreMatrixUi.scoreSheetReopened"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreMatrixUi.workflowActionFailed"));
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
      setError(t("scoreMatrixUi.saveAtLeastOne"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveScoreMatrix({ termId, classSubjectId, entries });
      await loadMatrix();
      setSuccess(
        entries.length === 1
          ? t("scoreMatrixUi.saveSuccessOne")
          : t("scoreMatrixUi.saveSuccessMany", { count: entries.length }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreMatrixUi.saveFailed"));
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

  function sheetGetScore(sheet: ScoreMatrix, studentProfileId: string, assessmentId: string) {
    const student = sheet.students.find((s) => s.studentProfileId === studentProfileId);
    return student?.scores.find((s) => s.assessmentId === assessmentId)?.score ?? null;
  }

  function sheetStudentMetrics(sheet: ScoreMatrix, readOnly: boolean) {
    const maxPoints = rowMaxPoints(sheet.assessments);
    const rows = sheet.students.map((st) => {
      const getScore = readOnly
        ? (id: string, assessmentId: string) => sheetGetScore(sheet, id, assessmentId)
        : getScoreValue;
      const pointsTotal = rowPointsTotal(st.studentProfileId, sheet.assessments, getScore);
      const subjectAverage = rowWeightedAverage(
        st.studentProfileId,
        sheet.assessments,
        getScore,
      );
      const subjectsAvg = readOnly
        ? (st.summary?.subjectsAverage ?? null)
        : adjustedSubjectsAverage(st.summary, subjectAverage);
      return {
        id: st.studentProfileId,
        name: st.name,
        photoUrl: st.photoUrl ?? null,
        pointsTotal,
        maxPoints,
        subjectAverage,
        subjectsAvg,
        termsAvg: st.summary?.termsAverage ?? null,
        classSize: st.summary?.classSize ?? sheet.students.length,
      };
    });
    const rankBySubjects = rows.map((r) => ({ id: r.id, value: r.subjectsAvg }));
    return rows.map((r) => ({
      ...r,
      rank: rankByValue(rankBySubjects, r.id),
    }));
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
    const metricsById = new Map(
      sheetStudentMetrics(sheet, readOnly).map((m) => [m.id, m] as const),
    );
    const sheetKey = sheet.classSubject.id;
    const maxPoints = rowMaxPoints(sheet.assessments);
    const showStudentView =
      role !== "teacher" || Boolean(sheet.isHomeroomClass);

    function openStats(studentProfileId: string) {
      setStatsTarget({ studentProfileId, classSubjectId: sheetKey });
    }

    return (
      <>
        <div className="res-scores-sheet__table">
          <table className="res-scores-table">
            <thead>
              <tr>
                <th className="res-scores-table__student-col">
                  {t("scoreMatrixUi.studentCol")}
                </th>
                {sheet.assessments.map((a) => (
                  <th key={a.id}>
                    <span className="res-scores-table__col-name">{a.name}</span>
                    <span className="res-scores-table__col-meta">
                      /{a.maxScore} · {a.weightPercent}%
                    </span>
                  </th>
                ))}
                <th className="res-scores-table__avg-col">
                  <span className="res-scores-table__col-name">
                    {t("scoreMatrixUi.totalCol")}
                  </span>
                  <span className="res-scores-table__col-meta">
                    {t("scoreMatrixUi.sumMeta", { max: maxPoints })}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((st) => {
                const metrics = metricsById.get(st.studentProfileId);
                const points = metrics?.pointsTotal ?? null;
                return (
                  <tr key={st.studentProfileId}>
                    <td className="res-scores-table__student">
                      <div className="res-scores-table__student-row">
                        <StudentFace
                          name={st.name}
                          photoUrl={st.photoUrl}
                          className="res-scores-table__avatar"
                        />
                        <span className="res-scores-table__student-name">{st.name}</span>
                        {showStudentView ? (
                          <button
                            type="button"
                            className="res-scores-table__view-btn"
                            onClick={() => openStats(st.studentProfileId)}
                            aria-label={t("scoreMatrixUi.viewSummaryFor", {
                              name: st.name,
                            })}
                            title={t("scoreMatrixUi.viewSummary")}
                          >
                            <DashIcon name="eye" className="dash-icon--sm" />
                            <span>{t("scoreMatrixUi.view")}</span>
                          </button>
                        ) : null}
                      </div>
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
                      {points != null ? (
                        <>
                          <strong>{points}</strong>
                          <span className="res-scores-table__total-max">/{maxPoints}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="res-scores-sheet__mobile">
          {sheet.students.map((st) => {
            const metrics = metricsById.get(st.studentProfileId);
            const points = metrics?.pointsTotal ?? null;
            return (
              <article key={st.studentProfileId} className="res-scores-row-card">
                <header className="res-scores-row-card__head">
                  <div className="res-scores-table__student-row">
                    <StudentFace
                      name={st.name}
                      photoUrl={st.photoUrl}
                      className="res-scores-table__avatar"
                    />
                    <div className="res-scores-row-card__identity">
                      <h4>{st.name}</h4>
                      <p>
                        {points != null
                          ? t("scoreMatrixUi.totalPoints", {
                              points,
                              max: maxPoints,
                            })
                          : t("scoreMatrixUi.noScoresYet")}
                      </p>
                    </div>
                    {showStudentView ? (
                      <button
                        type="button"
                        className="res-scores-table__view-btn"
                        onClick={() => openStats(st.studentProfileId)}
                        aria-label={t("scoreMatrixUi.viewSummaryFor", {
                          name: st.name,
                        })}
                        title={t("scoreMatrixUi.viewSummary")}
                      >
                        <DashIcon name="eye" className="dash-icon--sm" />
                        <span>View</span>
                      </button>
                    ) : null}
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
        for (const a of m.assessments) {
          const fromDraft = draft[st.studentProfileId]?.[a.id];
          const hasDraft = fromDraft != null && !Number.isNaN(fromDraft);
          const saved = st.scores.find((sc) => sc.assessmentId === a.id)?.score;
          if (hasDraft || saved != null) filled += 1;
        }
      }
    }
    return {
      filledScores: filled,
      totalCells: total,
      completionPct: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }, [isAggregated, aggregatedSheets, matrix, draft]);

  const lockedComponents =
    matrix?.assessments.filter((a) => a.entryLocked).map((a) => a.name) ?? [];
  const openComponents =
    matrix?.assessments.filter((a) => !a.entryLocked).map((a) => a.name) ?? [];

  const statusInfo = workflowStatus
    ? statusMessage(workflowStatus, role, openComponents.length > 0, t)
    : null;

  const canPublish =
    (role === "admin" || role === "staff") &&
    !!workflowStatus &&
    workflowStatus !== "PUBLISHED" &&
    filledScores > 0;

  const canReopen =
    (role === "admin" || role === "staff") && workflowStatus === "PUBLISHED";

  const workflowUi = workflowStatus ? workflowDisplay(workflowStatus, t) : null;

  const statsSheet = statsTarget
    ? isAggregated
      ? aggregatedSheets.find((s) => s.matrix.classSubject.id === statsTarget.classSubjectId)
          ?.matrix ?? null
      : matrix?.classSubject.id === statsTarget.classSubjectId
        ? matrix
        : null
    : null;
  const statsReadOnly = !statsSheet || statsSheet !== matrix || viewOnlyHomeroom;
  const statsMetrics =
    statsSheet && statsTarget
      ? sheetStudentMetrics(statsSheet, statsReadOnly).find(
          (m) => m.id === statsTarget.studentProfileId,
        ) ?? null
      : null;
  const statsComponents =
    statsSheet && statsTarget
      ? statsSheet.assessments.map((a) => {
          const score = statsReadOnly
            ? sheetGetScore(statsSheet, statsTarget.studentProfileId, a.id)
            : getScoreValue(statsTarget.studentProfileId, a.id);
          const pct =
            score != null && a.maxScore > 0
              ? Math.round((score / a.maxScore) * 1000) / 10
              : null;
          return { ...a, score, pct };
        })
      : [];
  const statsFilled = statsComponents.filter((c) => c.score != null).length;
  const statsTotalPct =
    statsMetrics?.maxPoints && statsMetrics.pointsTotal != null
      ? Math.round((statsMetrics.pointsTotal / statsMetrics.maxPoints) * 1000) / 10
      : null;

  const statsModal =
    statsTarget && statsMetrics && statsSheet ? (
      <div
        className="res-scores-stats"
        role="dialog"
        aria-modal="true"
        aria-labelledby="res-scores-stats-title"
      >
        <button
          type="button"
          className="res-scores-stats__backdrop"
          aria-label={t("scoreMatrixUi.close")}
          onClick={() => setStatsTarget(null)}
        />
        <div className="res-scores-stats__panel">
          <header className="res-scores-stats__hero">
            <div className="res-scores-stats__hero-main">
              <StudentFace
                name={statsMetrics.name}
                photoUrl={statsMetrics.photoUrl}
                className="res-scores-stats__avatar"
              />
              <div className="res-scores-stats__who">
                <p className="res-scores-stats__eyebrow">
                  {t("scoreMatrixUi.studentSummary")}
                </p>
                <h3 id="res-scores-stats-title" className="res-scores-stats__name">
                  {statsMetrics.name}
                </h3>
                <p className="res-scores-stats__meta">
                  {statsSheet.classSubject.subject}
                  {statsSheet.classSubject.grade
                    ? ` · ${statsSheet.classSubject.grade}${
                        statsSheet.classSubject.section
                          ? ` ${statsSheet.classSubject.section}`
                          : ""
                      }`
                    : ""}
                  {selectedTerm ? ` · ${selectedTerm.name}` : ""}
                  {t("scoreMatrixUi.componentsCount", {
                    filled: statsFilled,
                    total: statsComponents.length,
                  })}
                </p>
              </div>
            </div>

            <div className="res-scores-stats__kpis">
              <div className="res-scores-stats__kpi">
                <p className="res-scores-stats__kpi-label">{t("scoreMatrixUi.kpiTotal")}</p>
                <p className="res-scores-stats__kpi-value">
                  {statsMetrics.pointsTotal != null
                    ? statsMetrics.pointsTotal
                    : "—"}
                  <span className="res-scores-stats__kpi-suffix">
                    /{statsMetrics.maxPoints}
                  </span>
                </p>
              </div>
              <div className="res-scores-stats__kpi">
                <p className="res-scores-stats__kpi-label">
                  {t("scoreMatrixUi.kpiSubjectAvg")}
                </p>
                <p className="res-scores-stats__kpi-value">
                  {formatPct(statsMetrics.subjectAverage)}
                </p>
              </div>
              <div className="res-scores-stats__kpi res-scores-stats__kpi--rank">
                <p className="res-scores-stats__kpi-label">
                  {t("scoreMatrixUi.kpiClassRank")}
                </p>
                <p className="res-scores-stats__kpi-value">
                  {statsMetrics.rank != null ? `#${statsMetrics.rank}` : "—"}
                </p>
                <p className="res-scores-stats__kpi-note">
                  {t("scoreMatrixUi.kpiOfClass", { size: statsMetrics.classSize })}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="res-scores-stats__close"
              aria-label={t("scoreMatrixUi.close")}
              onClick={() => setStatsTarget(null)}
            >
              ×
            </button>
          </header>

          <div className="res-scores-stats__body">
            <section className="res-scores-stats__block">
              <div className="res-scores-stats__block-head">
                <h4 className="res-scores-stats__block-title">
                  {t("scoreMatrixUi.blockComponentScores")}
                </h4>
                <p className="res-scores-stats__block-sub">
                  {statsTotalPct != null
                    ? t("scoreMatrixUi.pctOfPoints", { pct: statsTotalPct })
                    : t("scoreMatrixUi.noScoresEntered")}
                </p>
              </div>
              <div className="res-scores-stats__track" aria-hidden>
                <i
                  style={{
                    width: `${Math.min(100, statsTotalPct ?? 0)}%`,
                  }}
                />
              </div>
              <ul className="res-scores-stats__comps">
                {statsComponents.map((c) => (
                  <li key={c.id} className="res-scores-stats__comp">
                    <div className="res-scores-stats__comp-row">
                      <div>
                        <p className="res-scores-stats__comp-name">{c.name}</p>
                        <p className="res-scores-stats__comp-weight">
                          {t("scoreMatrixUi.weightPercent", { pct: c.weightPercent })}
                        </p>
                      </div>
                      <p className="res-scores-stats__comp-score">
                        {c.score != null ? c.score : "—"}
                        <span>/{c.maxScore}</span>
                      </p>
                    </div>
                    <div
                      className="res-scores-stats__track res-scores-stats__track--sm"
                      aria-hidden
                    >
                      <i style={{ width: `${Math.min(100, c.pct ?? 0)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="res-scores-stats__block">
              <div className="res-scores-stats__block-head">
                <h4 className="res-scores-stats__block-title">
                  {t("scoreMatrixUi.blockAverages")}
                </h4>
                <p className="res-scores-stats__block-sub">
                  {t("scoreMatrixUi.blockAveragesSub")}
                </p>
              </div>
              <ul className="res-scores-stats__avgs">
                <li className="res-scores-stats__avg">
                  <div>
                    <p className="res-scores-stats__avg-name">
                      {t("scoreMatrixUi.subjectsAverage")}
                    </p>
                    <p className="res-scores-stats__avg-desc">
                      {t("scoreMatrixUi.subjectsAverageSub")}
                    </p>
                  </div>
                  <div className="res-scores-stats__avg-right">
                    <p className="res-scores-stats__avg-pct">
                      {formatPct(statsMetrics.subjectsAvg)}
                    </p>
                    <div
                      className="res-scores-stats__track res-scores-stats__track--sm"
                      aria-hidden
                    >
                      <i
                        style={{
                          width: `${Math.min(100, statsMetrics.subjectsAvg ?? 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
                <li className="res-scores-stats__avg">
                  <div>
                    <p className="res-scores-stats__avg-name">
                      {t("scoreMatrixUi.termsAverage")}
                    </p>
                    <p className="res-scores-stats__avg-desc">
                      {t("scoreMatrixUi.termsAverageSub")}
                    </p>
                  </div>
                  <div className="res-scores-stats__avg-right">
                    <p className="res-scores-stats__avg-pct">
                      {formatPct(statsMetrics.termsAvg)}
                    </p>
                    <div
                      className="res-scores-stats__track res-scores-stats__track--sm"
                      aria-hidden
                    >
                      <i
                        style={{
                          width: `${Math.min(100, statsMetrics.termsAvg ?? 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
                <li className="res-scores-stats__avg">
                  <div>
                    <p className="res-scores-stats__avg-name">
                      {t("scoreMatrixUi.subjectAverage")}
                    </p>
                    <p className="res-scores-stats__avg-desc">
                      {t("scoreMatrixUi.subjectAverageSub")}
                    </p>
                  </div>
                  <div className="res-scores-stats__avg-right">
                    <p className="res-scores-stats__avg-pct">
                      {formatPct(statsMetrics.subjectAverage)}
                    </p>
                    <div
                      className="res-scores-stats__track res-scores-stats__track--sm"
                      aria-hidden
                    >
                      <i
                        style={{
                          width: `${Math.min(100, statsMetrics.subjectAverage ?? 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="res-scores">
      <AppToast
        message={error}
        tone="error"
        onDismiss={() => setError("")}
      />
      <AppToast
        message={success}
        tone="success"
        onDismiss={() => setSuccess("")}
      />

      {statsModal && filtersLoaded
        ? createPortal(statsModal, document.body)
        : null}

      <div className="res-scores-head res-scores-head--modern">
        <div className="res-scores-filters res-scores-toolbar res-scores-toolbar--quad">
          <label className="res-scores-field">
            <span>{t("scoreMatrixUi.term")}</span>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              {terms.length === 0 ? (
                <option value="">{t("scoreMatrixUi.loading")}</option>
              ) : null}
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {term.isCurrent ? t("scoreMatrixUi.currentTerm") : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="res-scores-field">
            <span>{t("scoreMatrixUi.grade")}</span>
            <select
              value={gradeId}
              onChange={(e) => selectGrade(e.target.value)}
              disabled={filterSelectDisabled}
              suppressHydrationWarning
            >
              {!filtersLoaded || grades.length === 0 ? (
                <option value="">{t("scoreMatrixUi.loading")}</option>
              ) : null}
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="res-scores-field res-scores-field--wide">
            <span>{t("scoreMatrixUi.subject")}</span>
            <select
              value={subjectId}
              onChange={(e) => selectSubject(e.target.value)}
              disabled={filterSelectDisabled}
              suppressHydrationWarning
            >
              <option value={ALL}>{t("scoreMatrixUi.allSubjects")}</option>
              {subjectsForGrade.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code} — ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </label>
          {hasSections ? (
            <label className="res-scores-field res-scores-field--section">
              <span>{t("scoreMatrixUi.section")}</span>
              <select
                value={sectionId}
                onChange={(e) => selectSection(e.target.value)}
              >
                <option value={ALL}>{t("scoreMatrixUi.allSections")}</option>
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

        <div className="res-scores-context res-scores-context--hero">
          <div className="res-scores-context__main">
            <div className="res-scores-context__brand">
              <span className="res-scores-context__chip">
                {t("scoreMatrixUi.chipScoreSheet")}
              </span>
              {workflowUi && !isAggregated ? (
                <span
                  className={`res-scores-workflow-pill res-scores-workflow-pill--${workflowUi.pill}`}
                >
                  {workflowUi.label}
                </span>
              ) : null}
            </div>
            <h2 className="res-scores-context__title">
              {heroTitle(
                selectedCs,
                selectedGrade?.name ?? t("scoreMatrixUi.heroGradeFallback"),
                subjectId,
                selectedSubjectName,
                sectionId,
                selectedSectionName,
                t,
              )}
              {!canEditScores && selectedCs ? t("scoreMatrixUi.heroViewSuffix") : ""}
            </h2>
            <p className="res-scores-context__meta">
              {selectedTerm?.name ?? t("scoreMatrixUi.selectTerm")}
              {matrix?.template ? ` · ${matrix.template.name}` : ""}
              {selectedCs?.subject?.name && selectedCs.subject.code
                ? ` · ${selectedCs.subject.name}`
                : ""}
              {viewOnlyHomeroom ? t("scoreMatrixUi.viewOnlyHomeroom") : ""}
            </p>
          </div>
          <div className="res-scores-context__metrics">
            <div className="res-metric-pill">
              <strong>
                {isAggregated
                  ? aggregatedSheets.reduce((n, s) => n + s.matrix.students.length, 0)
                  : (displayMatrix?.students.length ?? 0)}
              </strong>
              <span>{t("scoreMatrixUi.metricStudents")}</span>
            </div>
            <div className="res-metric-pill">
              <strong>
                {isAggregated
                  ? activeClassSubjects.length
                  : (displayMatrix?.assessments.length ?? 0)}
              </strong>
              <span>
                {isAggregated
                  ? t("scoreMatrixUi.metricClasses")
                  : t("scoreMatrixUi.metricComponents")}
              </span>
            </div>
            <div className="res-metric-pill res-metric-pill--accent">
              <strong>{completionPct}%</strong>
              <span>{t("scoreMatrixUi.metricComplete")}</span>
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
                  <strong>{t("scoreMatrixUi.overviewModeTitle")}</strong>
                  <p>
                    {t("scoreMatrixUi.overviewModeBody", {
                      subjects:
                        subjectId === ALL
                          ? t("scoreMatrixUi.overviewAllSubjects")
                          : (subjectsForGrade.find((s) => s.id === subjectId)?.name ??
                            ""),
                      sections:
                        sectionId === ALL
                          ? t("scoreMatrixUi.overviewAllSections")
                          : sectionsForFilter.find((s) => s.id === sectionId)?.name
                            ? t("scoreMatrixUi.overviewInSection", {
                                name:
                                  sectionsForFilter.find((s) => s.id === sectionId)
                                    ?.name ?? "",
                              })
                            : "",
                    })}
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
                  <strong>{t("scoreMatrixUi.viewOnlyTitle")}</strong>
                  <p>
                    {t("scoreMatrixUi.viewOnlyBody", {
                      teacher: selectedCs?.teacher
                        ? t("scoreMatrixUi.viewOnlyTeacher", {
                            name: `${selectedCs.teacher.firstName} ${selectedCs.teacher.lastName}`,
                          })
                        : "",
                    })}
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

      {!filtersLoaded || loading ? (
        <div className="res-scores-loading">
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>{t("scoreMatrixUi.loadingScoreSheet")}</p>
        </div>
      ) : classSubjects.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--lg" />
          </div>
          <h3>{t("scoreMatrixUi.noClassesTitle")}</h3>
          <p>{t("scoreMatrixUi.noClassesBody")}</p>
          {role === "admin" || role === "staff" ? (
            <Link href="/admin/subjects/assign" className="res-scores-btn res-scores-btn--primary">
              {t("scoreMatrixUi.assignSubjects")}
            </Link>
          ) : null}
        </div>
      ) : !isAggregated && matrix && matrix.assessments.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--lg" />
          </div>
          <h3>{t("scoreMatrixUi.noComponentsTitle")}</h3>
          <p>{t("scoreMatrixUi.noComponentsBody")}</p>
          {role === "admin" || role === "staff" ? (
            <Link href="/admin/results/templates" className="res-scores-btn res-scores-btn--primary">
              {t("scoreMatrixUi.assessmentTemplates")}
            </Link>
          ) : null}
        </div>
      ) : !isAggregated && matrix && matrix.students.length === 0 ? (
        <div className="res-scores-empty res-scores-empty--action">
          <div className="res-scores-empty__icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--lg" />
          </div>
          <h3>{t("scoreMatrixUi.noStudentsTitle")}</h3>
          <p>
            {t("scoreMatrixUi.noStudentsBody", {
              grade:
                selectedCs?.grade.name ?? t("scoreMatrixUi.noStudentsGradeFallback"),
              section: selectedCs?.section ? ` · ${selectedCs.section.name}` : "",
            })}
          </p>
          <Link href="/admin/students" className="res-scores-btn res-scores-btn--primary">
            {t("scoreMatrixUi.goToStudents")}
          </Link>
        </div>
      ) : hasSheet ? (
        isAggregated ? (
          <div className="res-scores-aggregate">
            <div className="res-scores-sheet__head res-scores-sheet__head--aggregate">
              <div>
                <h3 className="res-scores-sheet__title">
                  {t("scoreMatrixUi.scoreOverview")}
                </h3>
                <p className="res-scores-sheet__meta">
                  {aggregatedSheets.length === 1
                    ? t("scoreMatrixUi.enteredAcrossOne", {
                        filled: filledScores,
                        total: totalCells,
                      })
                    : t("scoreMatrixUi.enteredAcrossMany", {
                        filled: filledScores,
                        total: totalCells,
                        count: aggregatedSheets.length,
                      })}
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
                        {t("scoreMatrixUi.enteredOf", {
                          filled: sheetFilled,
                          total: sheetTotal,
                        })}
                        {sheet.workflow?.status ? (
                          <>
                            {" · "}
                            {
                              workflowDisplay(
                                sheet.workflow.status as ResultWorkflowStatus,
                                t,
                              ).label
                            }
                          </>
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
                <div className="res-scores-components__head-row">
                  <div>
                    <h3 className="res-scores-components__title">
                      {t("scoreMatrixUi.scoreComponentsTitle")}
                    </h3>
                    <p className="res-scores-components__hint">
                      {t("scoreMatrixUi.scoreComponentsHint")}
                    </p>
                  </div>
                  <div
                    className="res-scores-components__scope"
                    role="group"
                    aria-label={t("scoreMatrixUi.applyLockAria")}
                  >
                    <span className="res-scores-components__scope-label">
                      {t("scoreMatrixUi.applyTo")}
                    </span>
                    <button
                      type="button"
                      className={`res-scores-components__scope-btn${
                        lockScope === "this" ? " is-active" : ""
                      }`}
                      aria-pressed={lockScope === "this"}
                      onClick={() => setLockScope("this")}
                    >
                      {t("scoreMatrixUi.scopeThisClass")}
                    </button>
                    <button
                      type="button"
                      className={`res-scores-components__scope-btn${
                        lockScope === "all" ? " is-active" : ""
                      }`}
                      aria-pressed={lockScope === "all"}
                      onClick={() => setLockScope("all")}
                    >
                      {t("scoreMatrixUi.scopeAll")}
                    </button>
                  </div>
                </div>
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
                        {busy
                          ? "…"
                          : isOpen
                            ? t("scoreMatrixUi.openForEntry")
                            : t("scoreMatrixUi.lockedForEntry")}
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
                t("scoreMatrixUi.teacherNoteEdit", {
                  open: openComponents.join(", "),
                  locked: lockedComponents.join(", "),
                })
              ) : filledScores > 0 ? (
                filledScores === 1
                  ? t("scoreMatrixUi.teacherNoteAllLockedScoresOne")
                  : t("scoreMatrixUi.teacherNoteAllLockedScoresMany", {
                      count: filledScores,
                    })
              ) : (
                t("scoreMatrixUi.teacherNoteAllLocked")
              )}
            </p>
          ) : null}

          <div className="res-scores-sheet__head">
            <div>
              <h3 className="res-scores-sheet__title">
                {t("scoreMatrixUi.scoreSheetTitle")}
                {workflowFullyLocked ? (
                  <span className="res-scores-sheet__readonly">
                    {t("scoreMatrixUi.readOnly")}
                  </span>
                ) : null}
              </h3>
              <p className="res-scores-sheet__meta">
                {t("scoreMatrixUi.enteredOf", {
                  filled: filledScores,
                  total: totalCells,
                })}
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
                  {saving ? t("scoreMatrixUi.saving") : t("scoreMatrixUi.save")}
                </button>
              ) : null}
              {canPublish ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--primary"
                  disabled={workflowBusy}
                  onClick={() => void onWorkflowAction("publish")}
                >
                  {workflowBusy ? "…" : t("scoreMatrixUi.publish")}
                </button>
              ) : null}
              {canReopen ? (
                <button
                  type="button"
                  className="res-scores-btn res-scores-btn--ghost"
                  disabled={workflowBusy}
                  onClick={() => void onWorkflowAction("reopen")}
                >
                  {t("scoreMatrixUi.reopen")}
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
