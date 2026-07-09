"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsBreadcrumb,
  AcademicsEmpty,
} from "@/components/academics/academics-ui";
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
      setSaved("Saved.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onWeeklySessionsChange(classSubjectId: string, weeklySessions: number) {
    setError("");
    setSaved("");
    try {
      await updateClassSubject(classSubjectId, { weeklySessions });
      setSaved("Saved.");
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
      setSaved("Subject added.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  const teacherOptions = useMemo(
    () => [...teachers].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [teachers],
  );

  const readyToView = !hasSections || Boolean(sectionId);

  return (
    <DashboardPage role="admin" title="Subject assignment">
      <div className="acad-page acad-page--assign sub-assign">
        {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
        {saved ? <AcademicsAlert tone="success">{saved}</AcademicsAlert> : null}

        {subjects.length === 0 ? (
          <div className="sub-assign__notice">
            No subjects in catalog. <Link href="/admin/subjects">Add subjects first</Link>.
          </div>
        ) : null}

        {highlightTeacher ? (
          <div className="sub-assign__focus">
            <div>
              <span className="sub-assign__focus-label">Assigning for</span>
              <strong>{displayName(highlightTeacher)}</strong>
              {highlightTeacher.homeroom ? (
                <span className="sub-assign__focus-meta">
                  Homeroom · {highlightTeacher.homeroom.gradeName}
                  {highlightTeacher.homeroom.sectionName
                    ? ` · ${highlightTeacher.homeroom.sectionName}`
                    : ""}
                </span>
              ) : null}
            </div>
            <Link href="/admin/teachers" className="sub-assign__link">
              Back to teachers
            </Link>
          </div>
        ) : null}

        <section className="sub-assign__workspace">
          <header className="sub-assign__toolbar">
            <AcademicsBreadcrumb
              items={[
                { label: "Academics", href: "/admin/academics" },
                { label: "Subjects", href: "/admin/subjects" },
                { label: "Assign" },
              ]}
            />

            <div className="sub-assign__toolbar-row">
              <div className="sub-assign__picker">
                <label className="sub-assign__picker-field">
                  <span className="sub-assign__picker-label">Class</span>
                  <div className="sub-assign__picker-input">
                    <DashIcon name="calendar" className="dash-icon--sm" />
                    <select
                      className="sub-assign__grade-select"
                      value={gradeId}
                      onChange={(e) => selectGrade(e.target.value)}
                      aria-label="Select grade"
                    >
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                {hasSections ? (
                  <div className="sub-assign__picker-field sub-assign__picker-field--section">
                    <span className="sub-assign__picker-label">Section</span>
                    <div className="sub-assign__segment" role="tablist" aria-label="Sections">
                      {selectedGrade?.sections.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={sectionId === s.id}
                          className={`sub-assign__segment-btn${sectionId === s.id ? " sub-assign__segment-btn--active" : ""}`}
                          onClick={() => selectSection(s.id)}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="sub-assign__toolbar-actions">
                {readyToView && !loading ? (
                  <div className="sub-assign__meta">
                    <AcademicsBadge variant="live">
                      {assignments.length} subject{assignments.length === 1 ? "" : "s"}
                    </AcademicsBadge>
                    <AcademicsBadge
                      variant={assignedCount < assignments.length ? "default" : "muted"}
                    >
                      {assignedCount} assigned
                    </AcademicsBadge>
                  </div>
                ) : null}
                <Link href="/admin/teachers" className="sub-assign__teachers-link">
                  <DashIcon name="teachers" className="dash-icon--sm" />
                  Teachers
                </Link>
              </div>
            </div>
          </header>

          <div className="sub-assign__body">
            {loading ? (
              <div className="sub-assign__loading">
                <span className="sub-assign__spinner" aria-hidden />
                <p>Loading subjects…</p>
              </div>
            ) : !readyToView ? (
              <AcademicsEmpty message="Select a section to view and assign subjects." />
            ) : assignments.length === 0 ? (
              <div className="sub-assign__empty">
                <DashIcon name="results" className="dash-icon--lg" />
                <p>
                  {unassignedSubjects.length > 0
                    ? "No subjects linked to this class yet. Add one below."
                    : "All catalog subjects are already linked or the catalog is empty."}
                </p>
              </div>
            ) : (
              <div className="sub-assign__table">
                <div className="sub-assign__table-head" aria-hidden>
                  <span>Subject</span>
                  <span>Teacher</span>
                  <span>Per week</span>
                  <span>Template</span>
                </div>
                <ul className="sub-assign__list">
                  {assignments.map((row) => {
                    const isHighlight =
                      highlightTeacherId && row.teacher?.id === highlightTeacherId;
                    return (
                      <li
                        key={row.id}
                        className={`sub-assign__row${isHighlight ? " sub-assign__row--focus" : ""}`}
                      >
                        <div className="sub-assign__subject">
                          <strong>{row.subject.name}</strong>
                          <span>{row.subject.code}</span>
                        </div>

                        <label className="sub-assign__field">
                          <span className="sub-assign__field-label">Teacher</span>
                          <select
                            className="sub-assign__select"
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
                        </label>

                        <label className="sub-assign__field">
                          <span className="sub-assign__field-label">Per week</span>
                          <select
                            className="sub-assign__select"
                            value={String(row.weeklySessions ?? 1)}
                            onChange={(e) =>
                              void onWeeklySessionsChange(
                                row.id,
                                Number.parseInt(e.target.value, 10),
                              )
                            }
                            aria-label={`Sessions per week for ${row.subject.name}`}
                          >
                            <option value="1">1 period</option>
                            <option value="2">2 periods (double)</option>
                          </select>
                        </label>

                        <div className="sub-assign__template">
                          <span className="sub-assign__field-label">Template</span>
                          <span className="sub-assign__template-value">
                            {row.assessmentTemplate?.name ?? "—"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {readyToView && !loading && unassignedSubjects.length > 0 ? (
            <footer className="sub-assign__add">
              <label className="sub-assign__field sub-assign__field--grow">
                <span className="sub-assign__field-label">Add subject</span>
                <select
                  className="sub-assign__select"
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
                Add to class
              </button>
            </footer>
          ) : null}
        </section>
      </div>
    </DashboardPage>
  );
}
