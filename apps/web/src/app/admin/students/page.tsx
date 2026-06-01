"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentManageDrawer } from "@/components/students/student-manage-drawer";
import { StudentIdCardModal } from "@/components/students/student-id-card-modal";
import { StudentRegisterDrawer } from "@/components/students/student-register-drawer";
import { telHref } from "@/lib/student-photo";
import { deleteStudent, importStudentsCsv, listGrades, listStudents } from "@/lib/school-setup";
import type { CreateStudentResult, GradeWithSections, StudentRecord } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function studentName(s: StudentRecord) {
  return [s.user.firstName, s.middleName, s.user.lastName].filter(Boolean).join(" ");
}

function formatDob(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ageFromDob(iso: string | null) {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function parentLabel(s: StudentRecord) {
  if (s.parents.length === 0) return "—";
  return s.parents
    .map((link) => {
      const p = link.parent;
      return `${p.firstName} ${p.lastName} · ${p.phone ?? "—"}`;
    })
    .join(" / ");
}

export default function StudentsPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [manageStudent, setManageStudent] = useState<StudentRecord | null>(null);
  const [idCardStudentId, setIdCardStudentId] = useState<string | null>(null);

  const verifiedCount = students.filter((s) => s.fayedaVerifiedAt).length;
  const gradeCount = new Set(students.map((s) => s.grade.id)).size;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter && s.grade.id !== gradeFilter) return false;
      if (!q) return true;
      const hay = [
        studentName(s),
        s.grade.name,
        s.section?.name,
        s.user.externalRef,
        s.fan,
        s.fcn,
        s.parents.map((p) => p.parent.phone).join(" "),
        s.user.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [students, search, gradeFilter]);

  async function refresh() {
    const [g, s] = await Promise.all([listGrades(), listStudents()]);
    setGrades(g);
    setStudents(s);
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void refresh()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onRegisterSuccess(result: CreateStudentResult) {
    setToast(
      `${result.student.name} enrolled · Portal login: ${result.credentials.portalUsername} / ${result.credentials.studentTempPassword}`,
    );
    await refresh();
  }

  async function onImport(file: File) {
    setBusy(true);
    setError("");
    try {
      const result = await importStudentsCsv(file);
      setToast(`Imported ${result.success} of ${result.total} students.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(s: StudentRecord) {
    const name = studentName(s);
    if (!window.confirm(`Remove ${name} from the school? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteStudent(s.id);
      setToast(`${name} removed.`);
      if (manageStudent?.id === s.id) setManageStudent(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove student");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Students"
      subtitle="Search, register, and manage enrolled students."
      eyebrow="Admission"
    >
      <div className="stu-page">
        {error ? <p className="stu-toast stu-toast--error">{error}</p> : null}
        {toast ? (
          <p className="stu-toast" role="status">
            {toast}
            <button
              type="button"
              style={{ marginLeft: "0.75rem", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </p>
        ) : null}

        <div className="stu-stats">
          <div className="stu-stat">
            <span className="stu-stat__label">Total students</span>
            <span className="stu-stat__value">{students.length}</span>
          </div>
          <div className="stu-stat">
            <span className="stu-stat__label">Fayeda verified</span>
            <span className="stu-stat__value">{verifiedCount}</span>
          </div>
          <div className="stu-stat">
            <span className="stu-stat__label">Grades in use</span>
            <span className="stu-stat__value">{gradeCount}</span>
          </div>
          <div className="stu-stat">
            <span className="stu-stat__label">Showing</span>
            <span className="stu-stat__value">{filtered.length}</span>
          </div>
        </div>

        <div className="stu-toolbar">
          <input
            className="stu-search"
            type="search"
            placeholder="Search name, FAN, grade, parent phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="stu-filter"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Filter by grade"
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="stu-toolbar-actions">
            <Link href="/admin/students/cards" className="stu-btn stu-btn--ghost">
              ID cards
            </Link>
            <label className="stu-btn stu-btn--ghost">
              Import CSV
              <input
                type="file"
                accept=".csv"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImport(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="stu-btn stu-btn--primary"
              onClick={() => setRegisterOpen(true)}
            >
              + Register student
            </button>
          </div>
        </div>

        <div className="stu-table-wrap">
          {loading ? (
            <div className="stu-empty">
              <p className="stu-empty__title">Loading students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="stu-empty">
              <p className="stu-empty__title">
                {students.length === 0 ? "No students yet" : "No matches"}
              </p>
              <p className="stu-empty__lead">
                {students.length === 0
                  ? "Register your first student with Fayeda verification."
                  : "Try a different search or grade filter."}
              </p>
              {students.length === 0 ? (
                <button
                  type="button"
                  className="stu-btn stu-btn--primary"
                  style={{ marginTop: "1rem" }}
                  onClick={() => setRegisterOpen(true)}
                >
                  Register student
                </button>
              ) : null}
            </div>
          ) : (
            <div className="stu-table-scroll">
              <table className="stu-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>IDs</th>
                    <th>Class</th>
                    <th>Parents</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="stu-student-cell">
                          {s.photoUrl ? (
                            <img className="stu-avatar" src={s.photoUrl} alt="" width={44} height={54} />
                          ) : (
                            <span className="stu-avatar stu-avatar--empty" aria-hidden>
                              {s.user.firstName.charAt(0)}
                            </span>
                          )}
                          <div>
                            <div className="stu-student-name">{studentName(s)}</div>
                            <div className="stu-student-sub">
                              {s.gender
                                ? `${s.gender === "MALE" ? "Male" : s.gender === "FEMALE" ? "Female" : "Other"}`
                                : "—"}
                              {ageFromDob(s.dateOfBirth) != null
                                ? ` · ${ageFromDob(s.dateOfBirth)} yrs`
                                : s.dateOfBirth
                                  ? ` · ${formatDob(s.dateOfBirth)}`
                                  : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="stu-student-sub">
                          <div>
                            <strong>Student ID:</strong> {s.user.externalRef ?? "—"}
                          </div>
                          <div>
                            <strong>FAN:</strong> {s.fan ?? s.fcn ?? "—"}
                          </div>
                          {s.fayedaVerifiedAt ? (
                            <span className="stu-badge stu-badge--verified" style={{ marginTop: "0.25rem" }}>
                              Fayeda verified
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="stu-badge stu-badge--grade">
                          {s.grade.name}
                          {s.section ? ` · ${s.section.name}` : ""}
                        </span>
                      </td>
                      <td>
                        <span className="stu-student-sub">{parentLabel(s)}</span>
                      </td>
                      <td>
                        <div className="stu-row-contact">
                          {telHref(s.phone) ? (
                            <a href={telHref(s.phone)!} className="stu-contact-btn stu-contact-btn--sm">
                              Student
                            </a>
                          ) : null}
                          {s.parents[0]?.parent.phone && telHref(s.parents[0].parent.phone) ? (
                            <a
                              href={telHref(s.parents[0].parent.phone)!}
                              className="stu-contact-btn stu-contact-btn--sm"
                            >
                              Father
                            </a>
                          ) : null}
                          {s.parents[1]?.parent.phone && telHref(s.parents[1].parent.phone) ? (
                            <a
                              href={telHref(s.parents[1].parent.phone)!}
                              className="stu-contact-btn stu-contact-btn--sm"
                            >
                              Mother
                            </a>
                          ) : null}
                          {!s.phone && !s.parents.some((p) => p.parent.phone) ? (
                            <span className="stu-student-sub">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="stu-row-actions">
                          <button
                            type="button"
                            className="stu-icon-btn"
                            onClick={() => setIdCardStudentId(s.id)}
                          >
                            ID card
                          </button>
                          <button type="button" className="stu-icon-btn" onClick={() => setManageStudent(s)}>
                            Manage
                          </button>
                          <button
                            type="button"
                            className="stu-icon-btn stu-icon-btn--danger"
                            disabled={busy}
                            onClick={() => void onRemove(s)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {registerOpen && grades.length > 0 ? (
        <StudentRegisterDrawer
          grades={grades}
          onClose={() => setRegisterOpen(false)}
          onSuccess={onRegisterSuccess}
        />
      ) : null}

      {manageStudent ? (
        <StudentManageDrawer
          student={manageStudent}
          grades={grades}
          busy={busy}
          onClose={() => setManageStudent(null)}
          onSaved={(updated) => {
            setStudents((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
            setToast(`${studentName(updated)} updated.`);
          }}
          onRemove={(s) => void onRemove(s)}
          onViewIdCard={() => setIdCardStudentId(manageStudent.id)}
        />
      ) : null}

      {idCardStudentId ? (
        <StudentIdCardModal
          studentProfileId={idCardStudentId}
          onClose={() => setIdCardStudentId(null)}
        />
      ) : null}
    </DashboardPage>
  );
}
