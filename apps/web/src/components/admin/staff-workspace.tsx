"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StaffPermissionsDrawer } from "@/components/teachers/staff-permissions-drawer";
import { useCurrentUserId } from "@/lib/use-client-snapshot";
import { OFFICE_STAFF_ROLE_SLUGS } from "@/lib/people";
import { hasPermission, Permission, ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
  getStaffPermissions,
  listPermissionCatalog,
  listRoleTemplates,
  listTeachers,
  setStaffPermissionGrants,
  type PermissionCatalogItem,
  type RoleTemplate,
  type StaffPermissionsDetail,
  type TeacherRecord,
} from "@/lib/teachers";
import { BRAND_NAME } from "@/lib/brand";
import { AppToast } from "@/components/ui/app-toast";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayName(t: TeacherRecord) {
  const parts = [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
  const raw = parts || t.name;
  return raw.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function roleLabel(t: TeacherRecord) {
  return (
    t.roleTemplateName ??
    (t.roleTemplateSlug ? ROLE_TEMPLATE_LABELS[t.roleTemplateSlug] : "Staff")
  );
}

function teamLabel(t: TeacherRecord) {
  switch (t.roleTemplateSlug) {
    case "finance_officer":
      return "Finance";
    case "reception":
      return "Reception";
    case "attendance_officer":
      return "Attendance";
    case "registrar":
      return "Registrar";
    case "principal":
    case "academic_director":
      return "Leadership";
    default:
      return t.portalRole === "admin" ? "Leadership" : "Operations";
  }
}

export function StaffWorkspace() {
  const [people, setPeople] = useState<TeacherRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [roleTemplateSlug, setRoleTemplateSlug] = useState("reception");

  const staffRoles = useMemo(
    () =>
      templates
        .filter((tpl) => (OFFICE_STAFF_ROLE_SLUGS as readonly string[]).includes(tpl.slug))
        .map((tpl) => ({ slug: tpl.slug, name: tpl.name })),
    [templates],
  );

  const teamOptions = useMemo(() => {
    const set = new Set(people.map(teamLabel));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [people]);

  const leadershipCount = people.filter((p) => teamLabel(p) === "Leadership").length;

  const filtered = useMemo(() => {
    let rows = people;
    const q = search.trim().toLowerCase();

    if (q) {
      rows = rows.filter(
        (t) =>
          displayName(t).toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          roleLabel(t).toLowerCase().includes(q) ||
          teamLabel(t).toLowerCase().includes(q),
      );
    }

    if (roleFilter) {
      rows = rows.filter((t) => t.roleTemplateSlug === roleFilter);
    }

    if (teamFilter) {
      rows = rows.filter((t) => teamLabel(t) === teamFilter);
    }

    return rows;
  }, [people, search, roleFilter, teamFilter]);

  const hasActiveFilters = Boolean(search.trim()) || Boolean(roleFilter) || Boolean(teamFilter);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rows, tpls] = await Promise.all([
        listTeachers("staff"),
        listRoleTemplates(),
      ]);
      setPeople(rows);
      setTemplates(tpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, tpls] = await Promise.all([
          listTeachers("staff"),
          listRoleTemplates(),
        ]);
        if (cancelled) return;
        setPeople(rows);
        setTemplates(tpls);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load staff");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setRoleTemplateSlug("reception");
  }

  function openCreate() {
    resetForm();
    setDrawerOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setTeamFilter("");
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
      await createTeacher({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password || undefined,
        roleTemplateSlug,
      });
      setDrawerOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function renderActions(t: TeacherRecord, compact?: boolean) {
    const canViewAttendance = hasPermission(Permission.STAFF_ATTENDANCE_READ);
    const attendanceHref = `/admin/staff-attendance?userId=${encodeURIComponent(t.userId)}&name=${encodeURIComponent(displayName(t))}`;

    if (currentUserId && t.userId === currentUserId) {
      return (
        <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
          <span className="tch-v2__you-pill">You</span>
          {canViewAttendance ? (
            <Link href={attendanceHref} className="tch-v2__action" title="Attendance history">
              Attendance
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
        {canViewAttendance ? (
          <Link href={attendanceHref} className="tch-v2__action" title="Attendance history">
            Attendance
          </Link>
        ) : null}
        <button
          type="button"
          className="tch-v2__action tch-v2__action--primary"
          disabled={busy}
          onClick={() => void openPermissions(t.userId)}
        >
          Permissions
        </button>
      </div>
    );
  }

  return (
    <div className="tch-v2 staff-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="tch-v2__hero tch-v2__hero--compact">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip tch-v2__chip--hero">School admin</span>
            <h2 className="tch-v2__hero-title">Staff & teams</h2>
            <p className="tch-v2__hero-sub">
              Registrar, finance, reception, and leadership accounts. Set permissions to control
              what each person can access in {BRAND_NAME}.
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : people.length}</strong>
              <span>Staff</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : leadershipCount}</strong>
              <span>Leadership</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : teamOptions.length}</strong>
              <span>Teams</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : filtered.length}</strong>
              <span>Showing</span>
            </div>
          </div>
        </div>
      </header>

      <div className="tch-v2__toolbar">
        <label className="tch-v2__search">
          <DashIcon name="users" className="dash-icon--sm" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role, team…"
          />
        </label>
        <select
          className="tch-v2__filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {staffRoles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="tch-v2__filter"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
        <div className="tch-v2__toolbar-actions">
          {hasActiveFilters ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--ghost" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
          <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
            + Add staff member
          </button>
        </div>
        <p className="tch-v2__toolbar-meta">
          {filtered.length} of {people.length} shown
        </p>
      </div>

      {loading ? (
        <div className="tch-v2__loading">
          <span className="tch-v2__spinner" aria-hidden />
          <p>Loading staff…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-v2__empty">
          <DashIcon name="users" className="dash-icon--lg" />
          <h3>{people.length === 0 ? "No staff yet" : "No matches"}</h3>
          <p>
            {people.length === 0
              ? "Add registrar, finance, reception, or leadership accounts for your school."
              : "Try different search or filter settings."}
          </p>
          {people.length === 0 ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
              Add staff member
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="tch-v2__table-wrap tch-v2__desktop-only">
            <table className="tch-v2__table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Team</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.userId} className="tch-v2__row">
                    <td className="tch-v2__cell tch-v2__cell--teacher">
                      <div className="tch-v2__teacher">
                        <span className="tch-v2__avatar" aria-hidden>
                          {initials(displayName(t))}
                        </span>
                        <div className="tch-v2__teacher-info">
                          <div className="tch-v2__teacher-line">
                            <strong className="tch-v2__name">{displayName(t)}</strong>
                            <span className="tch-v2__badge tch-v2__badge--role">{roleLabel(t)}</span>
                          </div>
                          <span className="tch-v2__meta">{t.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--homeroom">
                      <span className="tch-v2__chip tch-v2__chip--team">{teamLabel(t)}</span>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--actions">{renderActions(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tch-v2__cards tch-v2__mobile-only">
            {filtered.map((t) => (
              <article key={t.userId} className="tch-v2__card">
                <header className="tch-v2__card-head">
                  <span className="tch-v2__avatar" aria-hidden>
                    {initials(displayName(t))}
                  </span>
                  <div>
                    <strong className="tch-v2__name">{displayName(t)}</strong>
                    <span className="tch-v2__meta">{t.email}</span>
                    <span className="tch-v2__badge tch-v2__badge--role">{roleLabel(t)}</span>
                  </div>
                </header>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">Team</span>
                  <span className="tch-v2__chip tch-v2__chip--team">{teamLabel(t)}</span>
                </div>
                {renderActions(t, true)}
              </article>
            ))}
          </div>
        </>
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
        <div
          className="stu-drawer-backdrop"
          role="presentation"
          onClick={() => {
            setDrawerOpen(false);
            resetForm();
          }}
        >
          <aside
            className="stu-drawer stu-drawer--wide tch-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Add staff member"
          >
            <header className="stu-drawer__head">
              <div>
                <h2 className="stu-drawer__title">New staff member</h2>
                <p className="stu-drawer__sub">
                  Create a portal account, then fine-tune permissions after they are added.
                </p>
              </div>
              <button
                type="button"
                className="stu-drawer__close"
                aria-label="Close"
                onClick={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </header>

            <form className="stu-drawer__body tch-drawer" onSubmit={(e) => void onSubmit(e)}>
              <label>
                Role
                <select
                  value={roleTemplateSlug}
                  onChange={(e) => setRoleTemplateSlug(e.target.value)}
                >
                  {templates
                    .filter((tpl) =>
                      (OFFICE_STAFF_ROLE_SLUGS as readonly string[]).includes(tpl.slug),
                    )
                    .map((tpl) => (
                      <option key={tpl.slug} value={tpl.slug}>
                        {tpl.name}
                      </option>
                    ))}
                </select>
              </label>
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
              <div className="tch-drawer__actions">
                <button type="submit" className="tch-v2__btn tch-v2__btn--primary" disabled={busy}>
                  {busy ? "Saving…" : "Create account"}
                </button>
                <button
                  type="button"
                  className="tch-v2__btn tch-v2__btn--ghost"
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
