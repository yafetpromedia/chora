"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listTeachers, type TeacherRecord } from "@/lib/teachers";
import {
  createClassSubject,
  getCurrentAcademicYear,
  listClassSubjectsByGrade,
  listSubjects,
  updateClassSubject,
  type ClassSubjectAssignment,
  type Subject,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function SubjectAssignmentPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [addSubjectId, setAddSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const assignedSubjectIds = new Set(assignments.map((a) => a.subject.id));
  const unassignedSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));

  async function loadAssignments() {
    if (!gradeId) return;
    setAssignments(await listClassSubjectsByGrade(gradeId, sectionId || undefined));
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([listGrades(), listSubjects(), listTeachers(), getCurrentAcademicYear()])
      .then(([g, sub, t, year]) => {
        setGrades(g);
        setSubjects(sub);
        setTeachers(t);
        if (year) setAcademicYearId(year.id);
        if (g[0]) {
          setGradeId(g[0].id);
          if (g[0].sections[0]) setSectionId(g[0].sections[0].id);
        }
        if (sub[0]) setAddSubjectId(sub[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!gradeId) return;
    void loadAssignments().catch((err) =>
      setError(err instanceof Error ? err.message : "Load failed"),
    );
  }, [gradeId, sectionId]);

  async function onTeacherChange(classSubjectId: string, teacherId: string) {
    setError("");
    setSaved("");
    try {
      await updateClassSubject(classSubjectId, {
        teacherId: teacherId || null,
      });
      setSaved("Teacher assignment saved.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onAddSubject() {
    if (!academicYearId || !gradeId || !addSubjectId) {
      setError("Select grade and subject, and ensure a current academic year exists.");
      return;
    }
    setError("");
    setSaved("");
    try {
      await createClassSubject({
        subjectId: addSubjectId,
        academicYearId,
        gradeId,
        sectionId: sectionId || undefined,
      });
      setSaved("Subject added to class.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : "";

  return (
    <DashboardPage
      role="admin"
      title="Subject assignment"
      subtitle="Assign teachers to subjects per class. Powers attendance, results, and teacher dashboards."
      eyebrow="Academics"
    >
      <p className="setup-hint">
        <Link href="/admin/results">← Results</Link>
      </p>
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {saved ? <p className="att-toast">{saved}</p> : null}

      <div className="att-mark-toolbar">
        <div className="att-field">
          <span>Grade</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              const g = grades.find((x) => x.id === e.target.value);
              setSectionId(g?.sections[0]?.id ?? "");
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <span>Section</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <>
          <h2 className="setup-panel-label">{classLabel || "Class"}</h2>
          {assignments.length === 0 ? (
            <p className="setup-hint">No subjects assigned for this class yet.</p>
          ) : (
            <table className="res-matrix" style={{ marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Template</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.subject.name}</td>
                    <td>
                      <select
                        className="auth-input auth-input--login auth-input--login-plain"
                        value={row.teacher?.id ?? ""}
                        onChange={(e) => void onTeacherChange(row.id, e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {teachers.map((t) => (
                          <option key={t.userId} value={t.userId}>
                            {t.firstName} {t.lastName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{row.assessmentTemplate?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {unassignedSubjects.length > 0 ? (
            <section className="att-admin-section">
              <h2 className="setup-panel-label">Add subject to class</h2>
              <div className="setup-actions-row">
                <select
                  className="auth-input auth-input--login auth-input--login-plain"
                  value={addSubjectId}
                  onChange={(e) => setAddSubjectId(e.target.value)}
                >
                  {unassignedSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="auth-page-submit" onClick={() => void onAddSubject()}>
                  Add
                </button>
              </div>
            </section>
          ) : null}
        </>
      )}
    </DashboardPage>
  );
}
