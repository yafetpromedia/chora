"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { StaffPermissionsDrawer } from "@/components/teachers/staff-permissions-drawer";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { OFFICE_STAFF_ROLE_SLUGS, TEACHER_ROLE_SLUGS, type PeopleGroup } from "@/lib/people";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
  getStaffPermissions,
  listPermissionCatalog,
  listRoleTemplates,
  listTeachers,
  setStaffPermissionGrants,
  updateTeacher,
  type PermissionCatalogItem,
  type RoleTemplate,
  type StaffPermissionsDetail,
  type TeacherRecord,
} from "@/lib/teachers";

type Props = {
  group: PeopleGroup;
};

export function PeopleDirectoryPanel({ group }: Props) {
  const isTeachers = group === "teachers";
  const addableSlugs = isTeachers ? [...TEACHER_ROLE_SLUGS] : [...OFFICE_STAFF_ROLE_SLUGS];

  const [people, setPeople] = useState<TeacherRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherRecord | null>(null);
  const [permDrawerOpen, setPermDrawerOpen] = useState(false);
  const [permDetail, setPermDetail] = useState<StaffPermissionsDetail | null>(null);
  const [permCatalog, setPermCatalog] = useState<PermissionCatalogItem[]>([]);
  const [permDraft, setPermDraft] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [roleTemplateSlug, setRoleTemplateSlug] = useState(
    isTeachers ? "homeroom_teacher" : "reception",
  );
  const [homeroomGradeId, setHomeroomGradeId] = useState("");
  const [homeroomSectionId, setHomeroomSectionId] = useState("");

  const homeroomGrade = grades.find((g) => g.id === homeroomGradeId);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rows, tpls] = await Promise.all([
        listTeachers(group),
        listRoleTemplates(),
      ]);
      setPeople(rows);
      setTemplates(tpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load directory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentUserId(getCurrentUserId());
    void Promise.all([load(), listGrades().then(setGrades)]).catch(() => undefined);
  }, [group]);

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setRoleTemplateSlug(isTeachers ? "homeroom_teacher" : "reception");
    setHomeroomGradeId("");
    setHomeroomSectionId("");
    setEditTarget(null);
  }

  function openCreate() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEdit(person: TeacherRecord) {
    setEditTarget(person);
    setEmail(person.email);
    setFirstName(person.firstName);
    setLastName(person.lastName);
    setPassword("");
    setRoleTemplateSlug(person.roleTemplateSlug ?? (isTeachers ? "homeroom_teacher" : "reception"));
    setHomeroomGradeId(person.homeroom?.gradeId ?? "");
    setHomeroomSectionId(person.homeroom?.sectionId ?? "");
    setDrawerOpen(true);
  }

  async function openPermissions(userId: string) {
    if (currentUserId && userId === currentUserId) {
      setError(
        "You cannot edit your own permissions. Ask another school admin to adjust your access.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const [detail, catalog] = await Promise.all([
        getStaffPermissions(userId),
        permCatalog.length > 0 ? Promise.resolve(permCatalog) : listPermissionCatalog(),
      ]);
      if (permCatalog.length === 0) setPermCatalog(catalog);
      setPermDetail(detail);
      const draft: Record<string, boolean> = {};
      for (const key of detail.effectivePermissions) {
        draft[key] = true;
      }
      setPermDraft(draft);
      setPermDrawerOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load permissions");
    } finally {
      setBusy(false);
    }
  }

  async function savePermissions() {
    if (!permDetail) return;
    setBusy(true);
    setError("");
    try {
      const grants: { permissionKey: string; granted: boolean }[] = [];
      for (const item of permCatalog) {
        const effective = permDraft[item.key] === true;
        const fromTemplate = permDetail.templatePermissions.includes(item.key);
        if (effective !== fromTemplate) {
          grants.push({ permissionKey: item.key, granted: effective });
        }
      }
      await setStaffPermissionGrants(permDetail.userId, grants);
      setPermDrawerOpen(false);
      setPermDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save permissions");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editTarget) {
        await updateTeacher(editTarget.userId, {
          roleTemplateSlug,
          homeroomGradeId:
            isTeachers && roleTemplateSlug === "homeroom_teacher"
              ? homeroomGradeId || null
              : null,
          homeroomSectionId:
            isTeachers && roleTemplateSlug === "homeroom_teacher"
              ? homeroomSectionId || null
              : null,
        });
      } else {
        await createTeacher({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: password || undefined,
          roleTemplateSlug,
          homeroomGradeId:
            isTeachers && roleTemplateSlug === "homeroom_teacher" && homeroomGradeId
              ? homeroomGradeId
              : undefined,
          homeroomSectionId:
            isTeachers && roleTemplateSlug === "homeroom_teacher" && homeroomSectionId
              ? homeroomSectionId
              : undefined,
        });
      }
      setDrawerOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="att-page">
      {error ? <p className="att-toast att-toast--error">{error}</p> : null}

      {isTeachers ? (
        <p className="setup-hint tch-page-hint">
          Homeroom teachers get a class on this page. To assign a teacher to{" "}
          <strong>Math, English, etc.</strong> per grade, use{" "}
          <Link href="/admin/subjects/assign">Subject assignment</Link>.
        </p>
      ) : (
        <p className="setup-hint tch-page-hint">
          Office teams: finance, reception, attendance monitoring, registrar, and leadership.
          Classroom teachers are managed under{" "}
          <Link href="/admin/teachers">Teachers</Link>.
        </p>
      )}

      <div className="tch-toolbar">
        <button type="button" className="att-btn att-btn--primary" onClick={openCreate}>
          {isTeachers ? "+ Add teacher" : "+ Add staff member"}
        </button>
      </div>

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <div className="tch-table-wrap">
          <table className="tch-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                {isTeachers ? <th>Homeroom / subjects</th> : <th>Team</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {people.length === 0 ? (
                <tr>
                  <td colSpan={4} className="tch-meta">
                    {isTeachers ? "No teachers yet." : "No staff members yet."}
                  </td>
                </tr>
              ) : (
                people.map((t) => (
                  <tr key={t.userId}>
                    <td>
                      <strong>{t.name}</strong>
                      <div className="tch-meta">{t.email}</div>
                    </td>
                    <td>
                      <span className="tch-role-pill">
                        {t.roleTemplateName ??
                          (t.roleTemplateSlug
                            ? ROLE_TEMPLATE_LABELS[t.roleTemplateSlug]
                            : "—")}
                      </span>
                    </td>
                    <td>
                      {isTeachers ? (
                        t.homeroom ? (
                          <>
                            Homeroom: {t.homeroom.gradeName}
                            {t.homeroom.sectionName ? ` · ${t.homeroom.sectionName}` : ""}
                          </>
                        ) : t.assignments.length === 0 ? (
                          <span className="tch-meta">No homeroom</span>
                        ) : (
                          t.assignments.map((a) => (
                            <div key={a.id} className="tch-meta">
                              {a.gradeName}
                              {a.sectionName ? ` ${a.sectionName}` : ""}
                              {a.subjectName ? ` · ${a.subjectName}` : ""}
                            </div>
                          ))
                        )
                      ) : (
                        <span className="tch-meta">
                          {t.roleTemplateSlug === "finance_officer"
                            ? "Finance"
                            : t.roleTemplateSlug === "reception"
                              ? "Reception"
                              : t.roleTemplateSlug === "attendance_officer"
                                ? "Attendance"
                                : t.roleTemplateSlug === "registrar"
                                  ? "Registrar"
                                  : t.portalRole === "admin"
                                    ? "Leadership"
                                    : "Operations"}
                        </span>
                      )}
                    </td>
                    <td className="tch-actions">
                      {isTeachers ? (
                        <button
                          type="button"
                          className="att-btn att-btn--ghost"
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </button>
                      ) : null}
                      {currentUserId && t.userId === currentUserId ? (
                        <span className="tch-you-pill">You</span>
                      ) : (
                        <button
                          type="button"
                          className="att-btn att-btn--ghost"
                          onClick={() => void openPermissions(t.userId)}
                        >
                          Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {permDrawerOpen && permDetail ? (
        <StaffPermissionsDrawer
          detail={permDetail}
          catalog={permCatalog}
          draft={permDraft}
          busy={busy}
          onClose={() => setPermDrawerOpen(false)}
          onSave={() => void savePermissions()}
          onChange={(key, granted) =>
            setPermDraft((prev) => ({ ...prev, [key]: granted }))
          }
        />
      ) : null}

      {drawerOpen ? (
        <div className="stu-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside
            className="stu-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={isTeachers ? "Teacher" : "Staff member"}
          >
            <h2 className="stu-drawer__title">
              {editTarget
                ? isTeachers
                  ? "Edit teacher"
                  : "Edit staff member"
                : isTeachers
                  ? "Add teacher"
                  : "Add staff member"}
            </h2>
            <form className="tch-drawer" onSubmit={(e) => void onSubmit(e)}>
              <label>
                Role
                <select
                  value={roleTemplateSlug}
                  onChange={(e) => setRoleTemplateSlug(e.target.value)}
                >
                  {templates
                    .filter((t) => (addableSlugs as readonly string[]).includes(t.slug))
                    .map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              {!editTarget ? (
                <>
                  <label>
                    First name
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      placeholder="Min 8 characters"
                    />
                  </label>
                </>
              ) : null}
              {isTeachers && roleTemplateSlug === "homeroom_teacher" ? (
                <>
                  <label>
                    Homeroom grade
                    <select
                      value={homeroomGradeId}
                      onChange={(e) => {
                        setHomeroomGradeId(e.target.value);
                        setHomeroomSectionId("");
                      }}
                    >
                      <option value="">Select grade</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {homeroomGrade && homeroomGrade.sections.length > 0 ? (
                    <label>
                      Section
                      <select
                        value={homeroomSectionId}
                        onChange={(e) => setHomeroomSectionId(e.target.value)}
                      >
                        <option value="">Select section</option>
                        {homeroomGrade.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </>
              ) : null}
              <div className="tch-drawer__actions">
                <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
                  {busy ? "Saving…" : editTarget ? "Save changes" : "Create account"}
                </button>
                <button
                  type="button"
                  className="att-btn att-btn--ghost"
                  onClick={() => {
                    setDrawerOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
