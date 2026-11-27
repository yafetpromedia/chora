"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AcademicsEmpty } from "@/components/academics/academics-ui";
import { AppToast } from "@/components/ui/app-toast";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listTeachers, type TeacherRecord } from "@/lib/teachers";
import {
  createClassSubject,
  deleteClassSubject,
  getOrEnsureCurrentAcademicYear,
  listClassSubjects,
  listClassSubjectsByGrade,
  listSubjects,
  updateClassSubject,
  type ClassSubject,
  type ClassSubjectAssignment,
  type Subject,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";

type AssignView = "class" | "teacher";

function displayName(t: TeacherRecord) {
  const parts = [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
  const raw = parts || t.name;
  return raw.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function assignClassHref(cs: ClassSubject, teacherId?: string) {
  const q = new URLSearchParams();
  q.set("gradeId", cs.grade.id);
  if (cs.section?.id) q.set("sectionId", cs.section.id);
  if (teacherId) q.set("teacherId", teacherId);
  return `/admin/subjects/assign?${q}`;
}

export function SubjectAssignmentContent() {
  const { t, tp, tn } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [allClassSubjects, setAllClassSubjects] = useState<ClassSubject[]>([]);
  const [view, setView] = useState<AssignView>("class");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [highlightTeacherId, setHighlightTeacherId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [addSubjectId, setAddSubjectId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    subjectName: string;
    classLabel: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const hasSections = (selectedGrade?.sections.length ?? 0) > 0;
  const assignedSubjectIds = new Set(assignments.map((a) => a.subject.id));
  const unassignedSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));

  const highlightTeacher = teachers.find((t) => t.userId === highlightTeacherId);
  const assignedCount = assignments.filter((a) => a.teacher?.id).length;

  const sectionSubjectCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!gradeId) return map;
    for (const cs of allClassSubjects) {
      if (cs.grade.id !== gradeId || !cs.section?.id) continue;
      map.set(cs.section.id, (map.get(cs.section.id) ?? 0) + 1);
    }
    return map;
  }, [allClassSubjects, gradeId]);

  const fetchAssignments = useCallback(async (): Promise<
    ClassSubjectAssignment[] | null
  > => {
    if (!gradeId) return null;
    if (hasSections && !sectionId) return [];
    return listClassSubjectsByGrade(gradeId, sectionId || undefined);
  }, [gradeId, sectionId, hasSections]);

  const loadAssignments = useCallback(async () => {
    const list = await fetchAssignments();
    if (list) setAssignments(list);
  }, [fetchAssignments]);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    const qpGrade = searchParams.get("gradeId") ?? "";
    const qpSection = searchParams.get("sectionId") ?? "";
    const qpTeacher = searchParams.get("teacherId") ?? "";

    void Promise.all([
      listGrades(),
      listSubjects(),
      listTeachers("teachers"),
      getOrEnsureCurrentAcademicYear(),
    ])
      .then(([g, sub, t, year]) => {
        setGrades(g);
        setSubjects(sub);
        setTeachers(t);
        setAcademicYearId(year.id);

        const pickGrade = qpGrade && g.some((x) => x.id === qpGrade) ? qpGrade : g[0]?.id ?? "";
        setGradeId(pickGrade);
        const grade = g.find((x) => x.id === pickGrade);
        const pickSection =
          qpSection && grade?.sections.some((s) => s.id === qpSection)
            ? qpSection
            : grade?.sections[0]?.id ?? "";
        setSectionId(pickSection);
        if (qpTeacher && t.some((x) => x.userId === qpTeacher)) {
          setHighlightTeacherId(qpTeacher);
          setView("teacher");
        }
        if (sub[0]) setAddSubjectId(sub[0].id);
        void listClassSubjects(year.id)
          .then(setAllClassSubjects)
          .catch(() => setAllClassSubjects([]));
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("subjectAssignUi.loadFailed")))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  useEffect(() => {
    if (!gradeId || loading) return;
    let cancelled = false;
    void fetchAssignments()
      .then((list) => {
        if (!cancelled && list) setAssignments(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("subjectAssignUi.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [gradeId, sectionId, loading, fetchAssignments]);

  function selectGrade(id: string) {
    setGradeId(id);
    const g = grades.find((x) => x.id === id);
    setSectionId(g?.sections[0]?.id ?? "");
    setSaved("");
  }

  function selectSection(id: string) {
    setSectionId(id);
    setSaved("");
  }

  async function onTeacherChange(classSubjectId: string, teacherId: string) {
    setError("");
    setSaved("");
    setBusyId(classSubjectId);
    try {
      await updateClassSubject(classSubjectId, {
        teacherId: teacherId || null,
      });
      setSaved(
        teacherId ? t("subjectAssignUi.teacherAssigned") : t("subjectAssignUi.teacherRemoved"),
      );
      await loadAssignments();
      if (academicYearId) {
        const all = await listClassSubjects(academicYearId);
        setAllClassSubjects(all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectAssignUi.saveFailed"));
    } finally {
      setBusyId("");
    }
  }

  function openRemoveDialog(classSubjectId: string, subjectName: string) {
    const gradeLabel = selectedGrade?.name ?? t("subjectAssignUi.thisClass");
    const sectionLabel = sectionId
      ? selectedGrade?.sections.find((s) => s.id === sectionId)?.name
      : null;
    const classLabel = sectionLabel
      ? `${gradeLabel} · ${sectionLabel}`
      : gradeLabel;

    setRemoveTarget({ id: classSubjectId, subjectName, classLabel });
  }

  async function confirmRemoveFromClass() {
    if (!removeTarget) return;

    setError("");
    setSaved("");
    setBusyId(removeTarget.id);
    try {
      await deleteClassSubject(removeTarget.id);
      setSaved(t("subjectAssignUi.removedFromClass", { name: removeTarget.subjectName }));
      setRemoveTarget(null);
      await loadAssignments();
      if (academicYearId) {
        const all = await listClassSubjects(academicYearId);
        setAllClassSubjects(all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectAssignUi.removeFailed"));
    } finally {
      setBusyId("");
    }
  }

  async function onWeeklySessionsChange(classSubjectId: string, weeklySessions: number) {
    setError("");
    setSaved("");
    try {
      await updateClassSubject(classSubjectId, { weeklySessions });
      setSaved(t("subjectAssignUi.saved"));
      await loadAssignments();
      if (academicYearId) {
        const all = await listClassSubjects(academicYearId);
        setAllClassSubjects(all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectAssignUi.saveFailed"));
    }
  }

  async function onAddSubject() {
    if (!gradeId || !addSubjectId) {
      setError(t("subjectAssignUi.selectClassSubject"));
      return;
    }
    let yearId = academicYearId;
    if (!yearId) {
      try {
        const year = await getOrEnsureCurrentAcademicYear();
        yearId = year.id;
        setAcademicYearId(yearId);
      } catch {
        setError(t("subjectAssignUi.yearFailed"));
        return;
      }
    }
    if (hasSections && !sectionId) {
      setError(t("subjectAssignUi.selectSection"));
      return;
    }
    setError("");
    setSaved("");
    try {
      await createClassSubject({
        subjectId: addSubjectId,
        academicYearId: yearId,
        gradeId,
        sectionId: sectionId || undefined,
      });
      setSaved(t("subjectAssignUi.subjectAdded"));
      await loadAssignments();
      const all = await listClassSubjects(yearId);
      setAllClassSubjects(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectAssignUi.addFailed"));
    }
  }

  const teacherOptions = useMemo(
    () => [...teachers].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [teachers],
  );

  const teacherRoster = useMemo(() => {
    const byTeacher = new Map<string, { teacher: TeacherRecord; slots: ClassSubject[] }>();

    for (const t of teachers) {
      byTeacher.set(t.userId, { teacher: t, slots: [] });
    }

    for (const cs of allClassSubjects) {
      const tid = cs.teacher?.id;
      if (!tid) continue;
      const entry = byTeacher.get(tid);
      if (entry) entry.slots.push(cs);
    }

    return [...byTeacher.values()]
      .filter((row) => row.slots.length > 0 || row.teacher.homeroom)
      .sort((a, b) => displayName(a.teacher).localeCompare(displayName(b.teacher)));
  }, [allClassSubjects, teachers]);

  const visibleRoster = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teacherRoster;
    return teacherRoster.filter(({ teacher }) =>
      displayName(teacher).toLowerCase().includes(q),
    );
  }, [teacherRoster, teacherSearch]);

  const readyToView = !hasSections || Boolean(sectionId);

  return (
    <DashboardPage role="admin" title={tp("Subject assignment")}>
      <div className="acad-page acad-page--assign sub-assign">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />
        <AppConfirmDialog
          open={Boolean(removeTarget)}
          tone="danger"
          title={
            removeTarget
              ? t("subjectAssignUi.removeTitle", { name: removeTarget.subjectName })
              : t("subjectAssignUi.removeTitle", { name: "" })
          }
          message={
            removeTarget
              ? t("subjectAssignUi.removeMessageDraft", {
                  subject: removeTarget.subjectName,
                  classLabel: removeTarget.classLabel,
                })
              : ""
          }
          confirmLabel={t("subjectAssignUi.confirmRemove")}
          cancelLabel={t("subjectAssignUi.cancelKeep")}
          busy={Boolean(removeTarget && busyId === removeTarget.id)}
          onCancel={() => {
            if (busyId) return;
            setRemoveTarget(null);
          }}
          onConfirm={() => void confirmRemoveFromClass()}
        />

        {subjects.length === 0 ? (
          <div className="sub-assign__notice">
            {t("subjectAssignUi.noCatalog")}{" "}
            <Link href="/admin/subjects">{t("subjectAssignUi.addSubjectsLink")}</Link>.
          </div>
        ) : null}

        <header className="sub-assign__head">
          <div className="sub-assign__head-main">
            <Link
              href="/admin/academics"
              className="sub-assign__back"
              aria-label={t("subjectAssignUi.backAcademics")}
            >
              <DashIcon name="chevron" className="dash-icon--xs" />
              {t("subjectAssignUi.academics")}
            </Link>
            <h2 className="sub-assign__title">{t("subjectAssignUi.title")}</h2>
            <p className="sub-assign__subtitle">{t("subjectAssignUi.subtitle")}</p>
          </div>
          <p className="sub-assign__summary">
            <span>
              <strong>{allClassSubjects.length}</strong> {t("subjectAssignUi.links")}
            </span>
            <span>
              <strong>
                {allClassSubjects.filter((cs) => cs.teacher?.id).length}
              </strong>{" "}
              {t("subjectAssignUi.assigned")}
            </span>
            <span>
              <strong>{teachers.length}</strong> {t("subjectAssignUi.teachers")}
            </span>
          </p>
          {highlightTeacher ? (
            <div className="sub-assign__focus-chip">
              <span>{t("subjectAssignUi.focused")}</span>
              <strong>{displayName(highlightTeacher)}</strong>
              <button
                type="button"
                className="sub-assign__focus-clear"
                onClick={() => setHighlightTeacherId("")}
              >
                {t("subjectAssignUi.clear")}
              </button>
            </div>
          ) : null}
        </header>

        <section className="sub-assign__workspace">
          <div className="sub-assign__bar">
            <div
              className="sub-assign__segment"
              role="tablist"
              aria-label={t("subjectAssignUi.assignmentView")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "class"}
                className={`sub-assign__segment-btn${view === "class" ? " sub-assign__segment-btn--active" : ""}`}
                onClick={() => setView("class")}
              >
                {t("subjectAssignUi.byClass")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "teacher"}
                className={`sub-assign__segment-btn${view === "teacher" ? " sub-assign__segment-btn--active" : ""}`}
                onClick={() => setView("teacher")}
              >
                {t("subjectAssignUi.byTeacher")}
              </button>
            </div>

            {view === "class" ? (
              <div className="sub-assign__bar-controls">
                <label className="sub-assign__control">
                  <span>{t("subjectAssignUi.grade")}</span>
                  <select
                    value={gradeId}
                    onChange={(e) => selectGrade(e.target.value)}
                    aria-label={t("subjectAssignUi.selectGradeAria")}
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                {hasSections ? (
                  <div className="sub-assign__control sub-assign__control--sections">
                    <span>{t("subjectAssignUi.section")}</span>
                    <div
                      className="sub-assign__section-checks"
                      role="radiogroup"
                      aria-label={t("subjectAssignUi.selectSectionAria")}
                    >
                      {selectedGrade?.sections.map((s) => {
                        const selected = sectionId === s.id;
                        const linked = sectionSubjectCounts.get(s.id) ?? 0;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`sub-assign__section-check${
                              selected ? " sub-assign__section-check--active" : ""
                            }${linked > 0 ? " sub-assign__section-check--linked" : ""}`}
                            onClick={() => selectSection(s.id)}
                          >
                            <span
                              className="sub-assign__section-mark"
                              aria-hidden
                            >
                              {selected ? "✓" : ""}
                            </span>
                            <span className="sub-assign__section-name">
                              {s.name}
                            </span>
                            {linked > 0 ? (
                              <span className="sub-assign__section-count">
                                {linked}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {readyToView && !loading ? (
                  <p className="sub-assign__bar-meta">
                    {assignments.length === 1
                      ? t("subjectAssignUi.subjectCount", { count: assignments.length })
                      : t("subjectAssignUi.subjectCountPlural", { count: assignments.length })}
                    <span aria-hidden>·</span>
                    {assignedCount} {t("subjectAssignUi.assigned")}
                  </p>
                ) : null}
              </div>
            ) : (
              <label className="sub-assign__control sub-assign__control--search">
                <span>{t("subjectAssignUi.search")}</span>
                <input
                  type="search"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder={t("subjectAssignUi.teacherNamePh")}
                />
              </label>
            )}
          </div>

          <div className="sub-assign__body">
            {loading ? (
              <div className="sub-assign__loading">
                <span className="sub-assign__spinner" aria-hidden />
                <p>{t("subjectAssignUi.loading")}</p>
              </div>
            ) : view === "teacher" ? (
              teacherRoster.length === 0 ? (
                <AcademicsEmpty message={t("subjectAssignUi.emptyAssign")} />
              ) : visibleRoster.length === 0 ? (
                <AcademicsEmpty message={t("subjectAssignUi.emptyTeacherFilter")} />
              ) : (
                <ul className="sub-assign__roster">
                  {visibleRoster.map(({ teacher, slots }) => {
                    const isFocus = highlightTeacherId === teacher.userId;
                    return (
                      <li
                        key={teacher.userId}
                        className={`sub-assign__roster-card${isFocus ? " sub-assign__roster-card--focus" : ""}`}
                      >
                        <div className="sub-assign__roster-teacher">
                          <span className="sub-assign__roster-avatar" aria-hidden>
                            {displayName(teacher)
                              .split(/\s+/)
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong>{displayName(teacher)}</strong>
                            {teacher.homeroom ? (
                              <span className="sub-assign__roster-homeroom">
                                {t("subjectAssignUi.homeroom")} · {teacher.homeroom.gradeName}
                                {teacher.homeroom.sectionName
                                  ? ` · ${teacher.homeroom.sectionName}`
                                  : ""}
                              </span>
                            ) : (
                              <span className="sub-assign__roster-homeroom">
                                {slots.length === 1
                                  ? t("subjectAssignUi.subjectsAssigned", { count: slots.length })
                                  : t("subjectAssignUi.subjectsAssignedPlural", { count: slots.length })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sub-assign__roster-slots">
                          {slots.length === 0 ? (
                            <span className="sub-assign__roster-empty">
                              {t("subjectAssignUi.noSubjectsAssigned")}
                            </span>
                          ) : (
                            slots.map((cs) => (
                              <span
                                key={cs.id}
                                className="sub-assign__slot-chip sub-assign__slot-chip--removable"
                              >
                                <Link
                                  href={assignClassHref(cs, teacher.userId)}
                                  className="sub-assign__slot-chip-link"
                                  title={t("subjectAssignUi.openClassEdit")}
                                  onClick={() => {
                                    setView("class");
                                    setGradeId(cs.grade.id);
                                    setSectionId(cs.section?.id ?? "");
                                    setHighlightTeacherId(teacher.userId);
                                  }}
                                >
                                  <em>{cs.subject.name}</em>
                                  <span>
                                    {cs.grade.name}
                                    {cs.section?.name
                                      ? ` · ${cs.section.name}`
                                      : ""}
                                  </span>
                                </Link>
                                <button
                                  type="button"
                                  className="sub-assign__slot-remove"
                                  disabled={busyId === cs.id}
                                  title={t("subjectAssignUi.removeFromTeacher", {
                                    subject: cs.subject.name,
                                    teacher: displayName(teacher),
                                  })}
                                  aria-label={t("subjectAssignUi.removeFromTeacher", {
                                    subject: cs.subject.name,
                                    teacher: displayName(teacher),
                                  })}
                                  onClick={() =>
                                    void onTeacherChange(cs.id, "")
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : !readyToView ? (
              <AcademicsEmpty message={t("subjectAssignUi.selectSectionView")} />
            ) : assignments.length === 0 ? (
              <div className="sub-assign__empty">
                <DashIcon name="assign" className="dash-icon--lg" />
                <p>
                  {unassignedSubjects.length > 0
                    ? t("subjectAssignUi.emptyClassAdd")
                    : t("subjectAssignUi.emptyCatalog")}
                </p>
              </div>
            ) : (
              <div className="sub-assign__table">
                <div className="sub-assign__table-head" aria-hidden>
                  <span>{t("subjectAssignUi.colSubject")}</span>
                  <span>{t("subjectAssignUi.colTeacher")}</span>
                  <span>{t("subjectAssignUi.perWeek")}</span>
                  <span>{t("subjectAssignUi.colRemove")}</span>
                </div>
                <ul className="sub-assign__list">
                  {assignments.map((row) => {
                    const isHighlight =
                      highlightTeacherId &&
                      row.teacher?.id === highlightTeacherId;
                    const hasTeacher = Boolean(row.teacher?.id);
                    return (
                      <li
                        key={row.id}
                        className={`sub-assign__row${isHighlight ? " sub-assign__row--focus" : ""}${hasTeacher ? "" : " sub-assign__row--open"}`}
                      >
                        <div className="sub-assign__subject">
                          <strong>{row.subject.name}</strong>
                          <span className="sub-assign__subject-code">
                            {row.subject.code}
                          </span>
                          {row.assessmentTemplate?.name ? (
                            <span className="sub-assign__subject-meta">
                              {row.assessmentTemplate.name}
                            </span>
                          ) : null}
                        </div>

                        <div className="sub-assign__teacher-cell">
                          <label className="sub-assign__field">
                            <span className="sub-assign__field-label">
                              {t("subjectAssignUi.colTeacher")}
                            </span>
                            <select
                              className={`sub-assign__select${hasTeacher ? "" : " sub-assign__select--empty"}`}
                              value={row.teacher?.id ?? ""}
                              disabled={busyId === row.id}
                              onChange={(e) =>
                                void onTeacherChange(row.id, e.target.value)
                              }
                              aria-label={`${t("subjectAssignUi.colTeacher")} ${row.subject.name}`}
                            >
                              <option value="">{t("subjectAssignUi.unassigned")}</option>
                              {teacherOptions.map((teacherRec) => (
                                <option key={teacherRec.userId} value={teacherRec.userId}>
                                  {displayName(teacherRec)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {hasTeacher ? (
                            <button
                              type="button"
                              className="sub-assign__clear"
                              disabled={busyId === row.id}
                              title={t("subjectAssignUi.removeTeacherFrom", {
                                subject: row.subject.name,
                              })}
                              aria-label={t("subjectAssignUi.removeTeacherFrom", {
                                subject: row.subject.name,
                              })}
                              onClick={() => void onTeacherChange(row.id, "")}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>

                        <label className="sub-assign__field">
                          <span className="sub-assign__field-label">
                            {t("subjectAssignUi.perWeek")}
                          </span>
                          <select
                            className="sub-assign__select sub-assign__select--compact"
                            value={String(row.weeklySessions ?? 1)}
                            onChange={(e) =>
                              void onWeeklySessionsChange(
                                row.id,
                                Number.parseInt(e.target.value, 10),
                              )
                            }
                            aria-label={`${t("subjectAssignUi.perWeek")} ${row.subject.name}`}
                          >
                            <option value="1">1×</option>
                            <option value="2">2×</option>
                          </select>
                        </label>

                        <div className="sub-assign__remove-cell">
                          <button
                            type="button"
                            className="sub-assign__remove"
                            disabled={busyId === row.id}
                            title={t("subjectAssignUi.removeSubjectFromClass", {
                              subject: row.subject.name,
                            })}
                            aria-label={t("subjectAssignUi.removeSubjectFromClass", {
                              subject: row.subject.name,
                            })}
                            onClick={() =>
                              openRemoveDialog(row.id, row.subject.name)
                            }
                          >
                            {t("subjectAssignUi.colRemove")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {view === "class" &&
          readyToView &&
          !loading &&
          unassignedSubjects.length > 0 ? (
            <footer className="sub-assign__add">
              <label className="sub-assign__control sub-assign__control--grow">
                <span>{t("subjectAssignUi.addSubject")}</span>
                <select
                  value={addSubjectId}
                  onChange={(e) => setAddSubjectId(e.target.value)}
                >
                  {unassignedSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="sub-assign__add-btn"
                onClick={() => void onAddSubject()}
              >
                {t("subjectAssignUi.addToClass")}
              </button>
            </footer>
          ) : null}
        </section>
      </div>
    </DashboardPage>
  );
}
