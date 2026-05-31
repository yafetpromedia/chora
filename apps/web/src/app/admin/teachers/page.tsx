"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StaffPermissionsDrawer } from "@/components/teachers/staff-permissions-drawer";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, getCurrentUserId, type UserRole } from "@/lib/auth";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
  getStaffPermissions,
  listPermissionCatalog,
  listRoleTemplates,
  listTeachers,
  setStaffPermissionGrants,
  type PermissionCatalogItem,
  type StaffPermissionsDetail,
  type RoleTemplate,
  type TeacherRecord,
} from "@/lib/teachers";

const ADDABLE_TEMPLATES = [
  "registrar",
  "finance_officer",
  "academic_director",
  "homeroom_teacher",
  "subject_teacher",
  "principal",
];

export default function AdminTeachersPage() {
  const router = useRouter();
  const shellRole: UserRole =
    localStorage.getItem(AUTH_ROLE_KEY) === "staff" ? "staff" : "admin";

  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [roleTemplateSlug, setRoleTemplateSlug] = useState("homeroom_teacher");
  const [homeroomGradeId, setHomeroomGradeId] = useState("");
  const [homeroomSectionId, setHomeroomSectionId] = useState("");

  const homeroomGrade = grades.find((g) => g.id === homeroomGradeId);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [staff, tpls] = await Promise.all([listTeachers(), listRoleTemplates()]);
      setTeachers(staff);
      setTemplates(tpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || (role !== "admin" && role !== "staff")) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(getCurrentUserId());
    void Promise.all([load(), listGrades().then(setGrades)]).catch(() => undefined);
  }, [router]);

  async function openPermissions(userId: string) {
    if (currentUserId && userId === currentUserId) {
      setError("You cannot edit your own permissions. Ask another school admin to adjust your access.");
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createTeacher({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password || undefined,
        roleTemplateSlug,
        homeroomGradeId:
          roleTemplateSlug === "homeroom_teacher" && homeroomGradeId
            ? homeroomGradeId
            : undefined,
        homeroomSectionId:
          roleTemplateSlug === "homeroom_teacher" && homeroomSectionId
            ? homeroomSectionId
            : undefined,
      });
      setDrawerOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add staff member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage
      role={shellRole}
      title="Staff & departments"
      subtitle="Grant permissions to staff only — your own access is managed by another school admin."
      eyebrow="Digital workplace"
    >
      <div className="att-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}

        <div className="tch-toolbar">
          <button
            type="button"
            className="att-btn att-btn--primary"
            onClick={() => setDrawerOpen(true)}
          >
            + Add staff member
          </button>
        </div>

        {loading ? (
          <p className="setup-hint">Loading staff…</p>
        ) : (
          <div className="tch-table-wrap">
            <table className="tch-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role template</th>
                  <th>Portal</th>
                  <th>Homeroom / assignments</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
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
                    <td className="tch-meta">{t.portalRole}</td>
                    <td>
                      {t.homeroom ? (
                        <>
                          {t.homeroom.gradeName}
                          {t.homeroom.sectionName ? ` · ${t.homeroom.sectionName}` : ""}
                        </>
                      ) : t.assignments.length === 0 ? (
                        <span className="tch-meta">—</span>
                      ) : (
                        t.assignments.map((a) => (
                          <div key={a.id} className="tch-meta">
                            {a.gradeName}
                            {a.sectionName ? ` ${a.sectionName}` : ""}
                            {a.subjectName ? ` · ${a.subjectName}` : ""}
                          </div>
                        ))
                      )}
                    </td>
                    <td>
                      {currentUserId && t.userId === currentUserId ? (
                        <span className="tch-you-pill" title="Your permissions are set by another admin">
                          You
                        </span>
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
                ))}
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
              aria-label="Add staff member"
            >
              <h2 className="stu-drawer__title">Add staff member</h2>
              <form className="tch-drawer" onSubmit={(e) => void onCreate(e)}>
                <label>
                  Role template
                  <select
                    value={roleTemplateSlug}
                    onChange={(e) => setRoleTemplateSlug(e.target.value)}
                  >
                    {templates
                      .filter((t) => ADDABLE_TEMPLATES.includes(t.slug))
                      .map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  First name
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </label>
                <label>
                  Last name
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
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
                {roleTemplateSlug === "homeroom_teacher" ? (
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
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
                    {busy ? "Saving…" : "Create account"}
                  </button>
                  <button
                    type="button"
                    className="att-btn att-btn--ghost"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </aside>
          </div>
        ) : null}
      </div>
    </DashboardPage>
  );
}
