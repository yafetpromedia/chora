"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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

function roleLabel(
  person: TeacherRecord,
  tr: (key: string) => string,
) {
  return (
    person.roleTemplateName ??
    (person.roleTemplateSlug
      ? ROLE_TEMPLATE_LABELS[person.roleTemplateSlug]
      : tr("adminStaffUi.defaultStaff"))
  );
}

function teamLabel(
  person: TeacherRecord,
  tr: (key: string) => string,
) {
  switch (person.roleTemplateSlug) {
    case "finance_officer":
      return tr("adminStaffUi.teamFinance");
    case "reception":
      return tr("adminStaffUi.teamReception");
    case "attendance_officer":
      return tr("adminStaffUi.teamAttendance");
    case "registrar":
      return tr("adminStaffUi.teamRegistrar");
    case "principal":
    case "academic_director":
      return tr("adminStaffUi.teamLeadership");
    default:
      return person.portalRole === "admin"
        ? tr("adminStaffUi.teamLeadership")
        : tr("adminStaffUi.teamOperations");
  }
}

export function StaffWorkspace() {
  const { t } = useLocale();
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
    const set = new Set(people.map((p) => teamLabel(p, t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [people, t]);

  const leadershipCount = people.filter(
    (p) => teamLabel(p, t) === t("adminStaffUi.teamLeadership"),
  ).length;

  const filtered = useMemo(() => {
    let rows = people;
    const q = search.trim().toLowerCase();

    if (q) {
      rows = rows.filter(
        (person) =>
          displayName(person).toLowerCase().includes(q) ||
          person.email.toLowerCase().includes(q) ||
          roleLabel(person, t).toLowerCase().includes(q) ||
          teamLabel(person, t).toLowerCase().includes(q),
      );
    }

    if (roleFilter) {
      rows = rows.filter((person) => person.roleTemplateSlug === roleFilter);
    }

    if (teamFilter) {
      rows = rows.filter((person) => teamLabel(person, t) === teamFilter);
    }

    return rows;
  }, [people, search, roleFilter, teamFilter, t]);

  const hasActiveFilters = Boolean(search.trim()) || Boolean(roleFilter) || Boolean(teamFilter);

  const emptyDash = "—";

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
      setError(err instanceof Error ? err.message : t("adminStaffUi.loadFailed"));
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
          setError(err instanceof Error ? err.message : t("adminStaffUi.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

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
      setError(t("adminStaffUi.ownPermissions"));
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
      setError(err instanceof Error ? err.message : t("adminStaffUi.permLoadFailed"));
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
      setError(err instanceof Error ? err.message : t("adminStaffUi.permSaveFailed"));
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
      setError(err instanceof Error ? err.message : t("adminStaffUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function renderActions(person: TeacherRecord, compact?: boolean) {
    const name = displayName(person);
    const canViewAttendance = hasPermission(Permission.STAFF_ATTENDANCE_READ);
    const attendanceHref = `/admin/staff-attendance?userId=${encodeURIComponent(person.userId)}&name=${encodeURIComponent(name)}`;

    if (currentUserId && person.userId === currentUserId) {
      return (
        <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
          <span className="tch-v2__you-pill">{t("adminStaffUi.you")}</span>
          {canViewAttendance ? (
            <Link
              href={attendanceHref}
              className="tch-v2__action"
              title={t("adminStaffUi.attendanceHistory")}
            >
              {t("adminStaffUi.attendance")}
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
        {canViewAttendance ? (
          <Link
            href={attendanceHref}
            className="tch-v2__action"
            title={t("adminStaffUi.attendanceHistory")}
          >
            {t("adminStaffUi.attendance")}
          </Link>
        ) : null}
        <button
          type="button"
          className="tch-v2__action tch-v2__action--primary"
          disabled={busy}
          onClick={() => void openPermissions(person.userId)}
        >
          {t("adminStaffUi.permissions")}
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
            <span className="tch-v2__chip tch-v2__chip--hero">{t("adminStaffUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("adminStaffUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("adminStaffUi.heroSub", { brand: BRAND_NAME })}
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? emptyDash : people.length}</strong>
              <span>{t("adminStaffUi.statStaff")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? emptyDash : leadershipCount}</strong>
              <span>{t("adminStaffUi.statLeadership")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? emptyDash : teamOptions.length}</strong>
              <span>{t("adminStaffUi.statTeams")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? emptyDash : filtered.length}</strong>
              <span>{t("adminStaffUi.statShowing")}</span>
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
            placeholder={t("adminStaffUi.searchPlaceholder")}
            aria-label={t("common.search")}
          />
        </label>
        <select
          className="tch-v2__filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("adminStaffUi.filterByRole")}
        >
          <option value="">{t("adminStaffUi.allRoles")}</option>
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
          aria-label={t("adminStaffUi.filterByTeam")}
        >
          <option value="">{t("adminStaffUi.allTeams")}</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
        <div className="tch-v2__toolbar-actions">
          {hasActiveFilters ? (
            <button
              type="button"
              className="tch-v2__btn tch-v2__btn--ghost"
              onClick={clearFilters}
            >
              {t("common.clearFilters")}
            </button>
          ) : null}
          <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
            + {t("adminStaffUi.addStaff")}
          </button>
        </div>
        <p className="tch-v2__toolbar-meta">
          {t("adminStaffUi.ofShown", { shown: filtered.length, total: people.length })}
        </p>
      </div>

      {loading ? (
        <div className="tch-v2__loading">
          <span className="tch-v2__spinner" aria-hidden />
          <p>{t("adminStaffUi.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-v2__empty">
          <DashIcon name="users" className="dash-icon--lg" />
          <h3>{people.length === 0 ? t("adminStaffUi.noStaffYet") : t("adminStaffUi.noMatches")}</h3>
          <p>
            {people.length === 0 ? t("adminStaffUi.noStaffHint") : t("adminStaffUi.tryFilters")}
          </p>
          {people.length === 0 ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
              {t("adminStaffUi.addStaff")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="tch-v2__table-wrap tch-v2__desktop-only">
            <table className="tch-v2__table">
              <thead>
                <tr>
                  <th>{t("adminStaffUi.colStaff")}</th>
                  <th>{t("adminStaffUi.colTeam")}</th>
                  <th aria-label={t("common.actions")} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((person) => (
                  <tr key={person.userId} className="tch-v2__row">
                    <td className="tch-v2__cell tch-v2__cell--teacher">
                      <div className="tch-v2__teacher">
                        <span className="tch-v2__avatar" aria-hidden>
                          {initials(displayName(person))}
                        </span>
                        <div className="tch-v2__teacher-info">
                          <div className="tch-v2__teacher-line">
                            <strong className="tch-v2__name">{displayName(person)}</strong>
                            <span className="tch-v2__badge tch-v2__badge--role">
                              {roleLabel(person, t)}
                            </span>
                          </div>
                          <span className="tch-v2__meta">{person.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--homeroom">
                      <span className="tch-v2__chip tch-v2__chip--team">
                        {teamLabel(person, t)}
                      </span>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--actions">
                      {renderActions(person)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tch-v2__cards tch-v2__mobile-only">
            {filtered.map((person) => (
              <article key={person.userId} className="tch-v2__card">
                <header className="tch-v2__card-head">
                  <span className="tch-v2__avatar" aria-hidden>
                    {initials(displayName(person))}
                  </span>
                  <div>
                    <strong className="tch-v2__name">{displayName(person)}</strong>
                    <span className="tch-v2__meta">{person.email}</span>
                    <span className="tch-v2__badge tch-v2__badge--role">
                      {roleLabel(person, t)}
                    </span>
                  </div>
                </header>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">{t("adminStaffUi.team")}</span>
                  <span className="tch-v2__chip tch-v2__chip--team">{teamLabel(person, t)}</span>
                </div>
                {renderActions(person, true)}
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
            aria-label={t("adminStaffUi.drawerAdd")}
          >
            <header className="stu-drawer__head">
              <div>
                <h2 className="stu-drawer__title">{t("adminStaffUi.newTitle")}</h2>
                <p className="stu-drawer__sub">{t("adminStaffUi.newSub")}</p>
              </div>
              <button
                type="button"
                className="stu-drawer__close"
                aria-label={t("common.close")}
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
                {t("adminStaffUi.role")}
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
                {t("adminStaffUi.firstName")}
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label>
                {t("adminStaffUi.lastName")}
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
              <label>
                {t("adminStaffUi.email")}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                {t("adminStaffUi.tempPassword")}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  placeholder={t("adminStaffUi.minEightChars")}
                />
              </label>
              <div className="tch-drawer__actions">
                <button type="submit" className="tch-v2__btn tch-v2__btn--primary" disabled={busy}>
                  {busy ? t("common.saving") : t("adminStaffUi.createAccount")}
                </button>
                <button
                  type="button"
                  className="tch-v2__btn tch-v2__btn--ghost"
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