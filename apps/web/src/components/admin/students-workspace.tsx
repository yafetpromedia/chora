"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StudentManageDrawer } from "@/components/students/student-manage-drawer";
import { StudentIdCardModal } from "@/components/students/student-id-card-modal";
import { StudentImportModal } from "@/components/students/student-import-modal";
import { StudentRegisterDrawer } from "@/components/students/student-register-drawer";
import { AppToast } from "@/components/ui/app-toast";
import { telHref } from "@/lib/student-photo";
import {
  deleteStudent,
  downloadStudentsImportTemplate,
  listGrades,
  listStudents,
} from "@/lib/school-setup";
import type {
  CreateStudentResult,
  GradeWithSections,
  ImportStudentsResult,
  StudentRecord,
} from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function studentName(s: StudentRecord) {
  return [s.user.firstName, s.middleName, s.user.lastName].filter(Boolean).join(" ");
}

function formatDob(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
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

function classLabel(s: StudentRecord) {
  return `${s.grade.name}${s.section ? ` · ${s.section.name}` : ""}`;
}

function genderLabel(g: StudentRecord["gender"]) {
  if (g === "MALE") return "Male";
  if (g === "FEMALE") return "Female";
  if (g === "OTHER") return "Other";
  return "—";
}

function StudentAvatar({ student }: { student: StudentRecord }) {
  if (student.photoUrl) {
    return (
      <img
        className="stu-v2__avatar"
        src={student.photoUrl}
        alt=""
        width={44}
        height={54}
      />
    );
  }
  return (
    <span className="stu-v2__avatar stu-v2__avatar--empty" aria-hidden>
      {student.user.firstName.charAt(0)}
    </span>
  );
}

function StudentActions({
  student,
  busy,
  onIdCard,
  onManage,
  onRemove,
  compact,
}: {
  student: StudentRecord;
  busy: boolean;
  onIdCard: () => void;
  onManage: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`stu-v2__actions${compact ? " stu-v2__actions--compact" : ""}`}>
      <button type="button" className="stu-v2__action" onClick={onIdCard}>
        ID card
      </button>
      <Link href={`/admin/students/${student.id}/history`} className="stu-v2__action">
        Record
      </Link>
      <button type="button" className="stu-v2__action stu-v2__action--primary" onClick={onManage}>
        Manage
      </button>
      <button
        type="button"
        className="stu-v2__action stu-v2__action--danger"
        disabled={busy}
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
}

function ContactChips({ student }: { student: StudentRecord }) {
  const chips: { label: string; href: string }[] = [];
  const studentTel = telHref(student.phone);
  if (studentTel) chips.push({ label: "Student", href: studentTel });
  if (student.parents[0]?.parent.phone) {
    const href = telHref(student.parents[0].parent.phone);
    if (href) chips.push({ label: "Father", href });
  }
  if (student.parents[1]?.parent.phone) {
    const href = telHref(student.parents[1].parent.phone);
    if (href) chips.push({ label: "Mother", href });
  }
  if (chips.length === 0) return <span className="stu-v2__muted">—</span>;
  return (
    <div className="stu-v2__contacts">
      {chips.map((c) => (
        <a key={c.label} href={c.href} className="stu-v2__contact">
          {c.label}
        </a>
      ))}
    </div>
  );
}

export function StudentsWorkspace() {
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
  const [importOpen, setImportOpen] = useState(false);
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
    let cancelled = false;
    void Promise.all([listGrades(), listStudents()])
      .then(([g, s]) => {
        if (cancelled) return;
        setGrades(g);
        setStudents(s);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onRegisterSuccess(result: CreateStudentResult) {
    setToast(
      `${result.student.name} enrolled · Portal: ${result.credentials.portalUsername} / ${result.credentials.studentTempPassword}`,
    );
    await refresh();
  }

  async function onImported(result: ImportStudentsResult) {
    const created = result.created ?? 0;
    const updated = result.updated ?? 0;
    const skipped = result.skipped ?? 0;
    const parts = [
      created > 0 ? `${created} created` : null,
      updated > 0 ? `${updated} updated` : null,
      skipped > 0 ? `${skipped} skipped` : null,
      result.failed > 0 ? `${result.failed} failed` : null,
    ].filter(Boolean);
    setImportOpen(false);
    setToast(
      parts.length > 0
        ? `Import finished: ${parts.join(", ")} (${result.total} rows).`
        : `Import finished with ${result.total} rows.`,
    );
    await refresh();
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
    <div className="stu-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <header className="stu-v2__hero">
        <div className="stu-v2__hero-glow" aria-hidden />
        <div className="stu-v2__hero-inner">
          <div className="stu-v2__hero-main">
            <Link href="/admin/admissions" className="stu-v2__chip stu-v2__chip--link">
              Admissions pipeline →
            </Link>
            <h2 className="stu-v2__hero-title">Student roster</h2>
            <p className="stu-v2__hero-sub">
              Register learners, verify Fayeda IDs, print cards, and manage parent links.
            </p>
          </div>
          <div className="stu-v2__hero-stats">
            <div className="stu-v2__stat">
              <strong>{students.length}</strong>
              <span>Total</span>
            </div>
            <div className="stu-v2__stat">
              <strong>{verifiedCount}</strong>
              <span>Fayeda</span>
            </div>
            <div className="stu-v2__stat">
              <strong>{gradeCount}</strong>
              <span>Grades</span>
            </div>
            <div className="stu-v2__stat stu-v2__stat--accent">
              <strong>{filtered.length}</strong>
              <span>Showing</span>
            </div>
          </div>
        </div>
      </header>

      <div className="stu-v2__toolbar">
        <label className="stu-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search name, FAN, grade, parent phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="stu-v2__filter"
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
        <div className="stu-v2__toolbar-actions">
          <Link href="/admin/students/cards" className="stu-v2__btn stu-v2__btn--ghost">
            ID cards
          </Link>
          <Link href="/admin/parents" className="stu-v2__btn stu-v2__btn--ghost">
            Parents
          </Link>
          <button
            type="button"
            className="stu-v2__btn stu-v2__btn--ghost"
            onClick={() => downloadStudentsImportTemplate()}
          >
            CSV template
          </button>
          <button
            type="button"
            className="stu-v2__btn stu-v2__btn--ghost"
            disabled={busy}
            onClick={() => setImportOpen(true)}
          >
            Import CSV
          </button>
          <button
            type="button"
            className="stu-v2__btn stu-v2__btn--primary"
            onClick={() => setRegisterOpen(true)}
          >
            + Register
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stu-v2__loading">
          <span className="stu-v2__spinner" aria-hidden />
          <p>Loading students…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="stu-v2__empty">
          <DashIcon name="students" className="dash-icon--lg" />
          <h3>{students.length === 0 ? "No students yet" : "No matches"}</h3>
          <p>
            {students.length === 0
              ? "Register your first student with Fayeda verification."
              : "Try a different search or grade filter."}
          </p>
          {students.length === 0 ? (
            <button
              type="button"
              className="stu-v2__btn stu-v2__btn--primary"
              onClick={() => setRegisterOpen(true)}
            >
              Register student
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="stu-v2__table-wrap stu-v2__desktop-only">
            <table className="stu-v2__table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>IDs</th>
                  <th>Class</th>
                  <th>Parents</th>
                  <th>Contact</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="stu-v2__student">
                        <StudentAvatar student={s} />
                        <div>
                          <strong className="stu-v2__name">{studentName(s)}</strong>
                          <span className="stu-v2__meta">
                            {genderLabel(s.gender)}
                            {ageFromDob(s.dateOfBirth) != null
                              ? ` · ${ageFromDob(s.dateOfBirth)} yrs`
                              : s.dateOfBirth
                                ? ` · ${formatDob(s.dateOfBirth)}`
                                : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="stu-v2__ids">
                        <span>
                          <em>Student ID</em> {s.user.externalRef ?? "—"}
                        </span>
                        <span>
                          <em>FAN</em> {s.fan ?? s.fcn ?? "—"}
                        </span>
                        {s.fayedaVerifiedAt ? (
                          <span className="stu-v2__badge stu-v2__badge--verified">Fayeda verified</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="stu-v2__badge stu-v2__badge--grade">{classLabel(s)}</span>
                    </td>
                    <td>
                      {s.parents.length === 0 ? (
                        <span className="stu-v2__muted">—</span>
                      ) : (
                        <ul className="stu-v2__parents">
                          {s.parents.map((link) => (
                            <li key={link.parent.id}>
                              {link.parent.firstName} {link.parent.lastName}
                              {link.parent.phone ? (
                                <span className="stu-v2__muted"> · {link.parent.phone}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <ContactChips student={s} />
                    </td>
                    <td>
                      <StudentActions
                        student={s}
                        busy={busy}
                        onIdCard={() => setIdCardStudentId(s.id)}
                        onManage={() => setManageStudent(s)}
                        onRemove={() => void onRemove(s)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="stu-v2__cards stu-v2__mobile-only">
            {filtered.map((s) => (
              <article key={s.id} className="stu-v2__card">
                <header className="stu-v2__card-head">
                  <StudentAvatar student={s} />
                  <div className="stu-v2__card-main">
                    <strong className="stu-v2__name">{studentName(s)}</strong>
                    <span className="stu-v2__meta">
                      {genderLabel(s.gender)}
                      {ageFromDob(s.dateOfBirth) != null
                        ? ` · ${ageFromDob(s.dateOfBirth)} yrs`
                        : ""}
                    </span>
                    <span className="stu-v2__badge stu-v2__badge--grade">{classLabel(s)}</span>
                  </div>
                </header>
                <dl className="stu-v2__card-facts">
                  <div>
                    <dt>Student ID</dt>
                    <dd>{s.user.externalRef ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>FAN</dt>
                    <dd>{s.fan ?? s.fcn ?? "—"}</dd>
                  </div>
                </dl>
                {s.fayedaVerifiedAt ? (
                  <span className="stu-v2__badge stu-v2__badge--verified">Fayeda verified</span>
                ) : null}
                {s.parents.length > 0 ? (
                  <div className="stu-v2__card-parents">
                    <span className="stu-v2__card-label">Parents</span>
                    <ul className="stu-v2__parents">
                      {s.parents.map((link) => (
                        <li key={link.parent.id}>
                          {link.parent.firstName} {link.parent.lastName}
                          {link.parent.phone ? ` · ${link.parent.phone}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <ContactChips student={s} />
                <StudentActions
                  student={s}
                  busy={busy}
                  compact
                  onIdCard={() => setIdCardStudentId(s.id)}
                  onManage={() => setManageStudent(s)}
                  onRemove={() => void onRemove(s)}
                />
              </article>
            ))}
          </div>
        </>
      )}

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

      <StudentImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(result) => void onImported(result)}
      />
    </div>
  );
}
