"use client";

import { useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PlatformUser } from "@/lib/platform-auth";
import { hasPlatformPermission } from "@/lib/platform-access";
import { CreateSchoolDrawer } from "./create-school-drawer";
import { SchoolDetailDrawer } from "./school-detail-drawer";
import type { PlatformSchoolRow } from "./platform-types";

type Props = {
  schools: PlatformSchoolRow[];
  user: PlatformUser | null;
  onRefresh: () => Promise<void>;
  onStatusChange: (schoolId: string, status: "ACTIVE" | "SUSPENDED" | "TRIAL") => Promise<void>;
  onDelete: (schoolId: string) => Promise<void>;
};

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "SUSPENDED";

function canCreateTenant(user: PlatformUser | null) {
  return hasPlatformPermission(user, "platform.schools.create");
}

function canSuspendTenant(user: PlatformUser | null) {
  return hasPlatformPermission(user, "platform.schools.suspend");
}

function tenantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function canDeleteTenant(user: PlatformUser | null) {
  return hasPlatformPermission(user, "platform.schools.delete");
}

function planDisplay(plan: string | undefined, t: (key: string) => string) {
  if (!plan) return "—";
  if (plan === "TRIAL") return t("platformUi.planTrial");
  if (plan === "STARTER") return t("platformUi.planStarter");
  if (plan === "PROFESSIONAL") return t("platformUi.planProfessional");
  if (plan === "ENTERPRISE") return t("platformUi.planEnterprise");
  return plan;
}

function tenantStatusLabel(status: string, t: (key: string) => string) {
  if (status === "ACTIVE") return t("platformUi.statusActive");
  if (status === "TRIAL") return t("platformUi.statusTrial");
  if (status === "SUSPENDED") return t("platformUi.statusSuspended");
  return status;
}

export function PlatformSchools({
  schools,
  user,
  onRefresh,
  onStatusChange,
  onDelete,
}: Props) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selectedRow, setSelected] = useState<PlatformSchoolRow | null>(null);
  const selected = selectedRow
    ? (schools.find((s) => s.id === selectedRow.id) ?? selectedRow)
    : null;
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      if (filter !== "ALL" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.joinCode.toLowerCase().includes(q) ||
        (s.subscription?.plan ?? "").toLowerCase().includes(q)
      );
    });
  }, [schools, query, filter]);

  const counts = useMemo(
    () => ({
      all: schools.length,
      active: schools.filter((s) => s.status === "ACTIVE").length,
      trial: schools.filter((s) => s.status === "TRIAL").length,
      suspended: schools.filter((s) => s.status === "SUSPENDED").length,
    }),
    [schools],
  );

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: "ALL", label: t("platformUi.filterAll"), count: counts.all },
    { id: "ACTIVE", label: t("platformUi.statusActive"), count: counts.active },
    { id: "TRIAL", label: t("platformUi.statusTrial"), count: counts.trial },
    { id: "SUSPENDED", label: t("platformUi.statusSuspended"), count: counts.suspended },
  ];

  return (
    <div className="plat-tenants-v2 dash-admin dash-admin--modern">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.schoolsEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.schoolsTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.schoolsSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{counts.all}</strong>
            <span>{t("platformUi.statTenants")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{counts.active}</strong>
            <span>{t("platformUi.statActive")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{counts.trial}</strong>
            <span>{t("platformUi.statTrial")}</span>
          </div>
        </div>
      </header>

      <div className="plat-tenants-v2__toolbar">
        <div className="plat-tenants-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.schoolsSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.schoolsSearchAria")}
          />
        </div>
        {canCreateTenant(user) ? (
          <button
            type="button"
            className="plat-btn plat-btn--primary plat-tenants-v2__toolbar-btn"
            onClick={() => setCreateOpen(true)}
          >
            <DashIcon name="plus" className="dash-icon--sm" />
            {t("platformUi.schoolsNewTenant")}
          </button>
        ) : null}
      </div>

      <div className="plat-tenants-v2__filters" role="tablist" aria-label={t("platformUi.schoolsFilterAria")}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`plat-tenants-v2__filter${filter === f.id ? " plat-tenants-v2__filter--active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span>{f.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="plat-tenants-v2__empty">
          <p>{t("platformUi.schoolsEmpty")}</p>
          {canCreateTenant(user) ? (
            <button
              type="button"
              className="plat-btn plat-btn--primary plat-btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              {t("platformUi.schoolsCreateTenant")}
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="plat-tenants-v2__list">
          {filtered.map((tenant) => (
            <li key={tenant.id} className="plat-tenants-v2__card">
              <span className="plat-tenants-v2__avatar" aria-hidden>
                {tenantInitials(tenant.name)}
              </span>
              <div className="plat-tenants-v2__main">
                <div className="plat-tenants-v2__head">
                  <strong>{tenant.name}</strong>
                  <code className="plat-tenants-v2__code">{tenant.joinCode}</code>
                </div>
                <div className="plat-tenants-v2__meta">
                  <span>
                    <DashIcon name="students" className="dash-icon--xs" />
                    {t("platformUi.studentsCount", { count: tenant.usage.students })}
                  </span>
                  <span>
                    <DashIcon name="teachers" className="dash-icon--xs" />
                    {t("platformUi.teachersCount", { count: tenant.usage.teachers })}
                  </span>
                  <span>
                    <DashIcon name="users" className="dash-icon--xs" />
                    {t("platformUi.parentsCount", { count: tenant.usage.parents })}
                  </span>
                </div>
              </div>
              <div className="plat-tenants-v2__aside">
                <span className="plat-tenants-v2__plan">
                  {planDisplay(tenant.subscription?.plan, t)}
                </span>
                <span
                  className={`plat-tenants-v2__status plat-tenants-v2__status--${tenant.status.toLowerCase()}`}
                >
                  {tenantStatusLabel(tenant.status, t)}
                </span>
                <button
                  type="button"
                  className="plat-tenants-v2__manage"
                  onClick={() => setSelected(tenant)}
                >
                  {t("platformUi.schoolsManage")}
                  <DashIcon name="chevron" className="dash-icon--xs" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SchoolDetailDrawer
        school={selected}
        onClose={() => setSelected(null)}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        canSuspend={canSuspendTenant(user)}
        canDelete={canDeleteTenant(user)}
      />

      <CreateSchoolDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void onRefresh()}
      />
    </div>
  );
}
