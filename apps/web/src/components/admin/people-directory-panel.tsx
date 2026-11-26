"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { StaffPermissionsDrawer } from "@/components/teachers/staff-permissions-drawer";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { useCurrentUserId } from "@/lib/use-client-snapshot";
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
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  group: PeopleGroup;
};

function officeTeamLabel(
  slug: string | null | undefined,
  portalRole: string | null | undefined,
  t: (key: string) => string,
) {
  if (slug === "finance_officer") return t("peopleDirectoryUi.teamFinance");
  if (slug === "reception") return t("peopleDirectoryUi.teamReception");
  if (slug === "attendance_officer") return t("peopleDirectoryUi.teamAttendance");
  if (slug === "registrar") return t("peopleDirectoryUi.teamRegistrar");
  if (portalRole === "admin") return t("peopleDirectoryUi.teamLeadership");
  return t("peopleDirectoryUi.teamOperations");
}

export function PeopleDirectoryPanel({ group }: Props) {
  const { t } = useLocale();
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
  const currentUserId = useCurrentUserId();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [roleTemplateSlug, setRoleTemplateSlug] = useState(
    isTeachers ? "subject_teacher" : "reception",
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
      setError(err instanceof Error ? err.message : t("peopleDirectoryUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
    });
    void (async () => {
      try {
        const [rows, tpls] = await Promise.all([
          listTeachers(group),
          listRoleTemplates(),
        ]);
        if (cancelled) return;
        setPeople(rows);
        setTemplates(tpls);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("peopleDirectoryUi.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    listGrades()
      .then((g) => {
        if (!cancelled) setGrades(g);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [group, t]);

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setRoleTemplateSlug(isTeachers ? "subject_teacher" : "reception");
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
    setRoleTemplateSlug(person.roleTemplateSlug ?? (isTeachers ? "subject_teacher" : "reception"));
    setHomeroomGradeId(person.homeroom?.gradeId ?? "");
    setHomeroomSectionId(person.homeroom?.sectionId ?? "");
    setDrawerOpen(true);
  }

  async function openPermissions(userId: string) {
    if (currentUserId && userId === currentUserId) {
      setError(t("peopleDirectoryUi.ownPermissionsBlocked"));
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
      setError(
        err instanceof Error ? err.message : t("peopleDirectoryUi.permissionsLoadFailed"),
      );
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
      setError(
        err instanceof Error ? err.message : t("peopleDirectoryUi.permissionsSaveFailed"),
      );
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
          homeroomGradeId: isTeachers ? homeroomGradeId || null : undefined,
          homeroomSectionId: isTeachers
            ? homeroomSectionId || null
            : undefined,
        });
      } else {
        await createTeacher({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: password || undefined,
          roleTemplateSlug,
          homeroomGradeId:
            isTeachers && homeroomGradeId ? homeroomGradeId : undefined,
          homeroomSectionId:
            isTeachers && homeroomSectionId ? homeroomSectionId : undefined,
        });
      }
      setDrawerOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("peopleDirectoryUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="att-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <div className="tch-toolbar">
        <button type="button" className="att-btn att-btn--primary" onClick={openCreate}>
          {isTeachers ? t("peopleDirectoryUi.addTeacher") : t("peopleDirectoryUi.addStaff")}
        </button>
      </div>

      {loading ? (
        <p className="setup-hint">{t("peopleDirectoryUi.loading")}</p>
      ) : (
        <div className="tch-table-wrap">
          <table className="tch-table">
            <thead>
              <tr>
                <th>{t("peopleDirectoryUi.colName")}</th>
                <th>{t("peopleDirectoryUi.colRole")}</th>
                {isTeachers ? (
                  <th>{t("peopleDirectoryUi.colHomeroom")}</th>
                ) : (
                  <th>{t("peopleDirectoryUi.colTeam")}</th>
                )}
                <th />
              </tr>
            </thead>
            <tbody>
              {people.length === 0 ? (
                <tr>
                  <td colSpan={4} className="tch-meta">
                    {isTeachers
                      ? t("peopleDirectoryUi.noTeachers")
                      : t("peopleDirectoryUi.noStaff")}
                  </td>
                </tr>
              ) : (
                people.map((person) => (
                  <tr key={person.userId}>
                    <td>
                      <strong>{person.name}</strong>
                      <div className="tch-meta">{person.email}</div>
                    </td>
                    <td>
                      <span className="tch-role-pill">
                        {person.roleTemplateName ??
                          (person.roleTemplateSlug
                            ? ROLE_TEMPLATE_LABELS[person.roleTemplateSlug]
                            : t("peopleDirectoryUi.emptyDash"))}
                      </span>
                    </td>
                    <td>
                      {isTeachers ? (
                        <>
                          {person.homeroom ? (
                            <div>
                              {t("peopleDirectoryUi.homeroom", {
                                grade: person.homeroom.gradeName,
                                section: person.homeroom.sectionName
                                  ? t("peopleDirectoryUi.homeroomSection", {
                                      section: person.homeroom.sectionName,
                                    })
                                  : "",
                              })}
                            </div>
                          ) : (
                            <div className="tch-meta">{t("peopleDirectoryUi.noHomeroom")}</div>
                          )}
                          {(person.teachingSlots ?? []).length > 0 ? (
                            (person.teachingSlots ?? []).map((slot, i) => (
                              <div
                                key={`${slot.gradeName}-${slot.subjectName}-${i}`}
                                className="tch-meta"
                              >
                                {t("peopleDirectoryUi.teaches", {
                                  grade: slot.gradeName,
                                  section: slot.sectionName
                                    ? t("peopleDirectoryUi.teachesSection", {
                                        section: slot.sectionName,
                                      })
                                    : "",
                                  subject: slot.subjectName,
                                })}
                              </div>
                            ))
                          ) : person.assignments.filter((a) => !a.isHomeroom).length ===
                              0 ? null : (
                            person.assignments
                              .filter((a) => !a.isHomeroom)
                              .map((a) => (
                                <div key={a.id} className="tch-meta">
                                  {a.gradeName}
                                  {a.sectionName ? ` ${a.sectionName}` : ""}
                                  {a.subjectName ? ` · ${a.subjectName}` : ""}
                                </div>
                              ))
                          )}
                          {!person.homeroom &&
                          (person.teachingSlots ?? []).length === 0 &&
                          person.assignments.filter((a) => !a.isHomeroom).length ===
                            0 ? (
                            <div className="tch-meta">
                              {t("peopleDirectoryUi.noSubjectsHint")}{" "}
                              <Link href="/admin/subjects/assign">
                                {t("peopleDirectoryUi.subjectAssignment")}
                              </Link>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="tch-meta">
                          {officeTeamLabel(
                            person.roleTemplateSlug,
                            person.portalRole,
                            t,
                          )}
                        </span>
                      )}
                    </td>
                    <td className="tch-actions">
                      {isTeachers ? (
                        <button
                          type="button"
                          className="att-btn att-btn--ghost"
                          onClick={() => openEdit(person)}
                        >
                          {t("peopleDirectoryUi.edit")}
                        </button>
                      ) : null}
                      {currentUserId && person.userId === currentUserId ? (
                        <span className="tch-you-pill">{t("peopleDirectoryUi.you")}</span>
                      ) : (
                        <button
                          type="button"
                          className="att-btn att-btn--ghost"
                          onClick={() => void openPermissions(person.userId)}
                        >
                          {t("peopleDirectoryUi.permissions")}
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
            aria-label={
              isTeachers
                ? t("peopleDirectoryUi.drawerTeacher")
                : t("peopleDirectoryUi.drawerStaff")
            }
          >
            <h2 className="stu-drawer__title">
              {editTarget
                ? isTeachers
                  ? t("peopleDirectoryUi.editTeacher")
                  : t("peopleDirectoryUi.editStaff")
                : isTeachers
                  ? t("peopleDirectoryUi.addTeacherTitle")
                  : t("peopleDirectoryUi.addStaffTitle")}
            </h2>
            <form className="tch-drawer" onSubmit={(e) => void onSubmit(e)}>
              <label>
                {t("peopleDirectoryUi.fieldRole")}
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
                    {t("peopleDirectoryUi.fieldFirstName")}
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {t("peopleDirectoryUi.fieldLastName")}
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {t("peopleDirectoryUi.fieldEmail")}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {t("peopleDirectoryUi.tempPassword")}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      placeholder={t("peopleDirectoryUi.passwordPlaceholder")}
                    />
                  </label>
                </>
              ) : null}
              {isTeachers ? (
                <>
                  <label>
                    {t("peopleDirectoryUi.homeroomGrade")}
                    <select
                      value={homeroomGradeId}
                      onChange={(e) => {
                        setHomeroomGradeId(e.target.value);
                        setHomeroomSectionId("");
                      }}
                    >
                      <option value="">{t("peopleDirectoryUi.selectGrade")}</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {homeroomGrade && homeroomGrade.sections.length > 0 ? (
                    <label>
                      {t("peopleDirectoryUi.section")}
                      <select
                        value={homeroomSectionId}
                        onChange={(e) => setHomeroomSectionId(e.target.value)}
                      >
                        <option value="">{t("peopleDirectoryUi.selectSection")}</option>
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
                  {busy
                    ? t("common.saving")
                    : editTarget
                      ? t("peopleDirectoryUi.saveChanges")
                      : t("peopleDirectoryUi.createAccount")}
                </button>
                <button
                  type="button"
                  className="att-btn att-btn--ghost"
                  onClick={() => {
                    setDrawerOpen(false);
                    resetForm();
                  }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
