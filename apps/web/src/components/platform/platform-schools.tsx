"use client";

import { useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlatformUser } from "@/lib/platform-auth";
import { CreateSchoolDrawer } from "./create-school-drawer";
import { SchoolDetailDrawer } from "./school-detail-drawer";
import type { PlatformSchoolRow } from "./platform-types";

type Props = {
  schools: PlatformSchoolRow[];
  user: PlatformUser | null;
  onRefresh: () => Promise<void>;
  onStatusChange: (schoolId: string, status: "ACTIVE" | "SUSPENDED" | "TRIAL") => Promise<void>;
};

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "SUSPENDED";

function canCreateSchool(role: PlatformUser["role"] | undefined) {
  return role === "OWNER" || role === "SALES";
}

function canSuspendSchool(role: PlatformUser["role"] | undefined) {
  return role === "OWNER" || role === "SUPPORT";
}

export function PlatformSchools({
  schools,
  user,
  onRefresh,
  onStatusChange,
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

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "ACTIVE", label: "Active" },
    { id: "TRIAL", label: "Trial" },
    { id: "SUSPENDED", label: "Suspended" },
  ];

  return (
    <div className="plat-section">
      <div className="plat-toolbar">
        <div className="plat-search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search by name, code, or plan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search schools"
          />
        </div>
        {canCreateSchool(user?.role) ? (
          <button
            type="button"
            className="plat-btn plat-btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            <DashIcon name="plus" className="dash-icon--sm" />
            New school
          </button>
        ) : null}
      </div>

      <div className="plat-filter-tabs" role="tablist" aria-label="Filter by status">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`plat-filter-tab${filter === f.id ? " plat-filter-tab--active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="plat-filter-count">
              {f.id === "ALL"
                ? schools.length
                : schools.filter((s) => s.status === f.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="plat-table-wrap">
        <table className="plat-table">
          <thead>
            <tr>
              <th>School</th>
              <th>Code</th>
              <th>Plan</th>
              <th>Users</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="plat-table-empty">
                  No schools match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong className="plat-table-name">{s.name}</strong>
                  </td>
                  <td>
                    <code className="plat-code">{s.joinCode}</code>
                  </td>
                  <td>
                    <span className="plat-plan-badge">{s.subscription?.plan ?? "—"}</span>
                  </td>
                  <td className="plat-table-muted">
                    {s.usage.students} stu · {s.usage.teachers} tch
                  </td>
                  <td>
                    <span className={`plat-status plat-status--${s.status.toLowerCase()}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="plat-table-actions">
                    <button
                      type="button"
                      className="plat-btn plat-btn--sm plat-btn--ghost"
                      onClick={() => setSelected(s)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SchoolDetailDrawer
        school={selected}
        onClose={() => setSelected(null)}
        onStatusChange={onStatusChange}
        canSuspend={canSuspendSchool(user?.role)}
      />

      <CreateSchoolDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void onRefresh()}
      />
    </div>
  );
}
