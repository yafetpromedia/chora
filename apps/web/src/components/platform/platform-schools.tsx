"use client";

import { useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
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

function planLabel(plan: string | undefined) {
  if (!plan) return "—";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function PlatformSchools({
  schools,
  user,
  onRefresh,
  onStatusChange,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<PlatformSchoolRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const next = schools.find((s) => s.id === selected.id);
    if (next) setSelected(next);
  }, [schools, selected]);

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
    { id: "ALL", label: "All", count: counts.all },
    { id: "ACTIVE", label: "Active", count: counts.active },
    { id: "TRIAL", label: "Trial", count: counts.trial },
    { id: "SUSPENDED", label: "Suspended", count: counts.suspended },
  ];

  return (
    <div className="plat-tenants-v2 dash-admin dash-admin--modern">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Tenant operations</p>
            <h2 className="plat-subjects-v2__title">Tenant directory</h2>
            <p className="plat-subjects-v2__sub">
              Create workspaces, inspect usage, suspend access, or permanently
              remove tenants.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{counts.all}</strong>
            <span>Tenants</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{counts.active}</strong>
            <span>Active</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{counts.trial}</strong>
            <span>Trial</span>
          </div>
        </div>
      </header>

      <div className="plat-tenants-v2__toolbar">
        <div className="plat-tenants-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search by name, code, or plan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tenants"
          />
        </div>
        {canCreateTenant(user) ? (
          <button
            type="button"
            className="plat-btn plat-btn--primary plat-tenants-v2__toolbar-btn"
            onClick={() => setCreateOpen(true)}
          >
            <DashIcon name="plus" className="dash-icon--sm" />
            New tenant
          </button>
        ) : null}
      </div>

      <div className="plat-tenants-v2__filters" role="tablist" aria-label="Filter by status">
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
          <p>No tenants match your filters.</p>
          {canCreateTenant(user) ? (
            <button
              type="button"
              className="plat-btn plat-btn--primary plat-btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              Create tenant
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
                    {tenant.usage.students} students
                  </span>
                  <span>
                    <DashIcon name="teachers" className="dash-icon--xs" />
                    {tenant.usage.teachers} teachers
                  </span>
                  <span>
                    <DashIcon name="users" className="dash-icon--xs" />
                    {tenant.usage.parents} parents
                  </span>
                </div>
              </div>
              <div className="plat-tenants-v2__aside">
                <span className="plat-tenants-v2__plan">
                  {planLabel(tenant.subscription?.plan)}
                </span>
                <span
                  className={`plat-tenants-v2__status plat-tenants-v2__status--${tenant.status.toLowerCase()}`}
                >
                  {tenant.status}
                </span>
                <button
                  type="button"
                  className="plat-tenants-v2__manage"
                  onClick={() => setSelected(tenant)}
                >
                  Manage
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
