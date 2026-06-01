"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listTeachers, type TeacherRecord } from "@/lib/teachers";
import {
  createClassSubject,
  getOrEnsureCurrentAcademicYear,
  listClassSubjectsByGrade,
  listSubjects,
  updateClassSubject,
  type ClassSubjectAssignment,
  type Subject,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function SubjectAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [highlightTeacherId, setHighlightTeacherId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [addSubjectId, setAddSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const hasSections = (selectedGrade?.sections.length ?? 0) > 0;
  const assignedSubjectIds = new Set(assignments.map((a) => a.subject.id));
  const unassignedSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId && hasSections ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : "";

  const highlightTeacher = teachers.find((t) => t.userId === highlightTeacherId);

  const loadAssignments = useCallback(async () => {
    if (!gradeId) return;
    if (hasSections && !sectionId) {
      setAssignments([]);
      return;
    }
    setAssignments(await listClassSubjectsByGrade(gradeId, sectionId || undefined));
  }, [gradeId, sectionId, hasSections]);

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
        }
        if (sub[0]) setAddSubjectId(sub[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  useEffect(() => {
    if (!gradeId || loading) return;
    void loadAssignments().catch((err) =>
      setError(err instanceof Error ? err.message : "Load failed"),
    );
  }, [gradeId, sectionId, loading, loadAssignments]);

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
    try {
      await updateClassSubject(classSubjectId, {
        teacherId: teacherId || null,
      });
      setSaved("Teacher updated.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onAddSubject() {
    if (!gradeId || !addSubjectId) {
      setError("Select a class and subject.");
      return;
    }
    let yearId = academicYearId;
    if (!yearId) {
      try {
        const year = await getOrEnsureCurrentAcademicYear();
        yearId = year.id;
        setAcademicYearId(yearId);
      } catch {
        setError("Could not resolve academic year.");
        return;
      }
    }
    if (hasSections && !sectionId) {
      setError("Select a section for this class.");
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
      setSaved("Subject added to class.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  const teacherOptions = useMemo(
    () =>
      [...teachers].sort((a, b) => a.name.localeCompare(b.name)),
    [teachers],
  );

  return (
    <DashboardPage role="admin" title="Subject assignment" eyebrow="Academics">
      <div className="att-page sub-assign-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {saved ? <p className="att-toast">{saved}</p> : null}

        <div className="tch-workflow">
          <Link href="/admin/teachers" className="tch-workflow__step">
            <span className="tch-workflow__num">1</span>
            <div>
              <strong>Teachers & homeroom</strong>
              <span>Who works at your school</span>
            </div>
          </Link>
          <div className="tch-workflow__arrow" aria-hidden>
            →
          </div>
          <div className="tch-workflow__step tch-workflow__step--active">
            <span className="tch-workflow__num">2</span>
            <div>
              <strong>Subject assignment</strong>
              <span>Match subjects to teachers for each class</span>
            </div>
          </div>
        </div>

        {subjects.length === 0 ? (
          <p className="tch-meta">
            No subjects in catalog.{" "}
            <Link href="/admin/subjects">Add subjects first</Link>.
          </p>
        ) : null}

        {highlightTeacher ? (
          <div className="sub-assign-focus">
            Assigning subjects for{" "}
            <strong>{highlightTeacher.name}</strong>
            {highlightTeacher.homeroom ? (
              <>
                {" "}
                · homeroom {highlightTeacher.homeroom.gradeName}
                {highlightTeacher.homeroom.sectionName
                  ? ` ${highlightTeacher.homeroom.sectionName}`
                  : ""}
              </>
            ) : null}
            <Link href="/admin/teachers" className="sub-assign-focus__clear">
              Change teacher
            </Link>
          </div>
        ) : null}

        <section className="sub-class-picker">
          <h2 className="sub-class-picker__title">Class</h2>
          <div className="sub-class-picker__grades" role="tablist" aria-label="Grades">
            {grades.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={gradeId === g.id}
                className={`sub-class-pill${gradeId === g.id ? " sub-class-pill--active" : ""}`}
                onClick={() => selectGrade(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
          {hasSections ? (
            <div className="sub-class-picker__sections">
              <span className="sub-class-picker__sections-label">Section</span>
              <div className="sub-class-picker__grades">
                {selectedGrade?.sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sub-class-pill sub-class-pill--sm${sectionId === s.id ? " sub-class-pill--active" : ""}`}
                    onClick={() => selectSection(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {loading ? (
          <p className="tch-meta">Loading class subjects…</p>
        ) : hasSections && !sectionId ? (
          <p className="tch-meta">Select a section to view and assign subjects.</p>
        ) : (
          <>
            <header className="sub-assign-head">
              <h2 className="sub-assign-head__title">{classLabel || "Class"}</h2>
              <span className="sub-assign-head__count">
                {assignments.length} subject{assignments.length === 1 ? "" : "s"}
              </span>
            </header>

            {assignments.length === 0 ? (
              <div className="tch-empty">
                <p>No subjects for this class yet.</p>
                {unassignedSubjects.length > 0 ? (
                  <p className="tch-meta">Add a subject below to get started.</p>
                ) : null}
              </div>
            ) : (
              <ul className="sub-assign-list">
                {assignments.map((row) => {
                  const isHighlight =
                    highlightTeacherId && row.teacher?.id === highlightTeacherId;
                  return (
                    <li
                      key={row.id}
                      className={`sub-assign-row${isHighlight ? " sub-assign-row--focus" : ""}`}
                    >
                      <div className="sub-assign-row__subject">
                        <span className="sub-assign-row__name">{row.subject.name}</span>
                        <span className="sub-assign-row__code">{row.subject.code}</span>
                      </div>
                      <label className="sub-assign-row__teacher">
                        <span>Teacher</span>
                        <select
                          value={row.teacher?.id ?? ""}
                          onChange={(e) => void onTeacherChange(row.id, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {teacherOptions.map((t) => (
                            <option key={t.userId} value={t.userId}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="sub-assign-row__template">
                        <span className="sub-assign-row__template-label">Template</span>
                        <span className="tch-meta">
                          {row.assessmentTemplate?.name ?? "—"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {unassignedSubjects.length > 0 ? (
              <section className="sub-assign-add">
                <h3 className="sub-assign-add__title">Add subject to this class</h3>
                <div className="sub-assign-add__row">
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
                  <button
                    type="button"
                    className="att-btn att-btn--primary"
                    onClick={() => void onAddSubject()}
                  >
                    Add to class
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardPage>
  );
}
