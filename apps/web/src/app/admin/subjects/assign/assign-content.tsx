"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
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

function displayName(t: TeacherRecord) {
  const parts = [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
  const raw = parts || t.name;
  return raw.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function SubjectAssignmentContent() {
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
  const assignedCount = assignments.filter((a) => a.teacher?.id).length;

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
    () => [...teachers].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [teachers],
  );

  return (
    <DashboardPage role="admin" title="Subject assignment">
      <div className="sub-v2">
        {error ? (
          <div className="sub-v2__alert sub-v2__alert--err" role="alert">
            {error}
          </div>
        ) : null}
        {saved ? (
          <div className="sub-v2__alert sub-v2__alert--ok" role="status">
            {saved}
          </div>
        ) : null}

        <header className="sub-v2__hero">
          <div className="sub-v2__hero-glow" aria-hidden />
          <div className="sub-v2__hero-inner">
            <div className="sub-v2__hero-main">
              <span className="sub-v2__chip">Academics</span>
              <h2 className="sub-v2__hero-title">Subject assignment</h2>
              <p className="sub-v2__hero-sub">
                Match each subject to a teacher for every grade and section.
              </p>
            </div>
            <div className="sub-v2__hero-stats">
              <div className="sub-v2__stat">
                <strong>{grades.length}</strong>
                <span>Grades</span>
              </div>
              <div className="sub-v2__stat">
                <strong>{assignments.length}</strong>
                <span>In class</span>
              </div>
              <div className="sub-v2__stat">
                <strong>{assignedCount}</strong>
                <span>Assigned</span>
              </div>
              <div className="sub-v2__stat sub-v2__stat--accent">
                <strong>{teachers.length}</strong>
                <span>Teachers</span>
              </div>
            </div>
          </div>
        </header>

        {subjects.length === 0 ? (
          <div className="sub-v2__alert sub-v2__alert--warn">
            No subjects in catalog.{" "}
            <Link href="/admin/subjects">Add subjects first</Link>.
          </div>
        ) : null}

        {highlightTeacher ? (
          <div className="sub-v2__focus">
            <div>
              <span className="sub-v2__focus-label">Assigning for</span>
              <strong>{displayName(highlightTeacher)}</strong>
              {highlightTeacher.homeroom ? (
                <span className="sub-v2__focus-meta">
                  Homeroom · {highlightTeacher.homeroom.gradeName}
                  {highlightTeacher.homeroom.sectionName
                    ? ` · ${highlightTeacher.homeroom.sectionName}`
                    : ""}
                </span>
              ) : null}
            </div>
            <Link href="/admin/teachers" className="sub-v2__btn sub-v2__btn--ghost">
              Back to teachers
            </Link>
          </div>
        ) : null}

        <div className="sub-v2__picker">
          <div className="sub-v2__picker-head">
            <h3>Choose class</h3>
            <Link href="/admin/teachers" className="sub-v2__btn sub-v2__btn--ghost">
              Teachers
            </Link>
          </div>
          <div className="sub-v2__pills" role="tablist" aria-label="Grades">
            {grades.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={gradeId === g.id}
                className={`sub-v2__pill${gradeId === g.id ? " sub-v2__pill--active" : ""}`}
                onClick={() => selectGrade(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
          {hasSections ? (
            <div className="sub-v2__sections">
              <span className="sub-v2__sections-label">Section</span>
              <div className="sub-v2__pills">
                {selectedGrade?.sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sub-v2__pill sub-v2__pill--sm${sectionId === s.id ? " sub-v2__pill--active" : ""}`}
                    onClick={() => selectSection(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="sub-v2__loading">
            <span className="sub-v2__spinner" aria-hidden />
            <p>Loading class subjects…</p>
          </div>
        ) : hasSections && !sectionId ? (
          <div className="sub-v2__empty">
            <p>Select a section to view and assign subjects.</p>
          </div>
        ) : (
          <>
            <div className="sub-v2__class-head">
              <div>
                <span className="sub-v2__class-label">Current class</span>
                <h3>{classLabel || "Class"}</h3>
              </div>
              <span className="sub-v2__class-count">
                {assignments.length} subject{assignments.length === 1 ? "" : "s"}
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="sub-v2__empty">
                <DashIcon name="results" className="dash-icon--lg" />
                <h3>No subjects for this class</h3>
                <p>
                  {unassignedSubjects.length > 0
                    ? "Add a subject below to get started."
                    : "All catalog subjects are already linked or the catalog is empty."}
                </p>
              </div>
            ) : (
              <>
                <div className="sub-v2__table-wrap sub-v2__desktop-only">
                  <table className="sub-v2__table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Template</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((row) => {
                        const isHighlight =
                          highlightTeacherId && row.teacher?.id === highlightTeacherId;
                        return (
                          <tr key={row.id} className={isHighlight ? "sub-v2__row--focus" : ""}>
                            <td>
                              <strong className="sub-v2__subject-name">{row.subject.name}</strong>
                              <span className="sub-v2__subject-code">{row.subject.code}</span>
                            </td>
                            <td>
                              <select
                                className="sub-v2__select"
                                value={row.teacher?.id ?? ""}
                                onChange={(e) => void onTeacherChange(row.id, e.target.value)}
                                aria-label={`Teacher for ${row.subject.name}`}
                              >
                                <option value="">Unassigned</option>
                                {teacherOptions.map((t) => (
                                  <option key={t.userId} value={t.userId}>
                                    {displayName(t)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span className="sub-v2__template">
                                {row.assessmentTemplate?.name ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sub-v2__cards sub-v2__mobile-only">
                  {assignments.map((row) => {
                    const isHighlight =
                      highlightTeacherId && row.teacher?.id === highlightTeacherId;
                    return (
                      <article
                        key={row.id}
                        className={`sub-v2__card${isHighlight ? " sub-v2__card--focus" : ""}`}
                      >
                        <header className="sub-v2__card-head">
                          <div>
                            <strong>{row.subject.name}</strong>
                            <span className="sub-v2__subject-code">{row.subject.code}</span>
                          </div>
                          <span className="sub-v2__template">
                            {row.assessmentTemplate?.name ?? "No template"}
                          </span>
                        </header>
                        <label className="sub-v2__field">
                          <span>Teacher</span>
                          <select
                            className="sub-v2__select"
                            value={row.teacher?.id ?? ""}
                            onChange={(e) => void onTeacherChange(row.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {teacherOptions.map((t) => (
                              <option key={t.userId} value={t.userId}>
                                {displayName(t)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {unassignedSubjects.length > 0 ? (
              <section className="sub-v2__add">
                <h3>Add subject to this class</h3>
                <div className="sub-v2__add-row">
                  <select
                    className="sub-v2__select"
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
                    className="sub-v2__btn sub-v2__btn--primary"
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
