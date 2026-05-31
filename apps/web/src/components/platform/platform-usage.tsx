"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { getPlatformUsage, type UsageRow } from "@/lib/platform-billing";

function formatLimit(n: number | null) {
  return n == null ? "∞" : String(n);
}

function pctLabel(ratio: number | null) {
  if (ratio == null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

type UsageFilter = "ALL" | "OVER" | "HIGH";

export function PlatformUsage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UsageFilter>("ALL");

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformUsage();
    setRows(data);
  }, []);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load usage"))
      .finally(() => setLoading(false));
  }, [load]);

  const overCount = useMemo(
    () =>
      rows.filter(
        (r) => r.overLimit.students || r.overLimit.teachers || r.overLimit.admins,
      ).length,
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const anyOver = r.overLimit.students || r.overLimit.teachers || r.overLimit.admins;
      const high =
        (r.utilization.students ?? 0) >= 0.85 ||
        (r.utilization.teachers ?? 0) >= 0.85 ||
        (r.utilization.admins ?? 0) >= 0.85;
      if (filter === "OVER" && !anyOver) return false;
      if (filter === "HIGH" && !high && !anyOver) return false;
      if (!q) return true;
      return (
        r.schoolName.toLowerCase().includes(q) ||
        r.joinCode.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  if (loading) {
    return <p className="plat-loading">Loading usage…</p>;
  }

  return (
    <div className="plat-section plat-usage">
      <header className="plat-section-hero plat-section-hero--billing">
        <div>
          <p className="plat-section-hero__eyebrow">Capacity</p>
          <h2 className="plat-section-hero__title">Usage vs plan limits</h2>
          <p className="plat-section-hero__sub">
            See how each school uses seats against their subscription limits.
          </p>
        </div>
        <div className="plat-billing-mrr">
          <span className="plat-billing-mrr__label">Over limit</span>
          <span className="plat-billing-mrr__value">{overCount}</span>
          <span className="plat-billing-mrr__hint">Schools exceeding caps</span>
        </div>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <div className="plat-toolbar">
        <div className="plat-search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search usage"
          />
        </div>
      </div>

      <div className="plat-filter-tabs" role="tablist">
        {(
          [
            { id: "ALL" as const, label: "All", count: rows.length },
            { id: "OVER" as const, label: "Over limit", count: overCount },
            {
              id: "HIGH" as const,
              label: "85%+ usage",
              count: rows.filter(
                (r) =>
                  (r.utilization.students ?? 0) >= 0.85 ||
                  (r.utilization.teachers ?? 0) >= 0.85 ||
                  (r.utilization.admins ?? 0) >= 0.85,
              ).length,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`plat-filter-tab${filter === f.id ? " plat-filter-tab--active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="plat-filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="plat-table-wrap">
        <table className="plat-table plat-table--usage">
          <thead>
            <tr>
              <th>School</th>
              <th>Plan</th>
              <th>Students</th>
              <th>Teachers</th>
              <th>Admins</th>
              <th>Parents</th>
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
              filtered.map((r) => {
                const anyOver =
                  r.overLimit.students || r.overLimit.teachers || r.overLimit.admins;
                return (
                  <tr key={r.schoolId} className={anyOver ? "plat-table-row--urgent" : undefined}>
                    <td>
                      <strong className="plat-table-name">{r.schoolName}</strong>
                      <span className="plat-table-sub">{r.joinCode}</span>
                    </td>
                    <td>
                      <span className={`plat-plan-badge plat-plan-badge--${r.plan.toLowerCase()}`}>
                        {r.plan}
                      </span>
                    </td>
                    <UsageCell
                      used={r.usage.students}
                      limit={r.limits.students}
                      ratio={r.utilization.students}
                      over={r.overLimit.students}
                    />
                    <UsageCell
                      used={r.usage.teachers}
                      limit={r.limits.teachers}
                      ratio={r.utilization.teachers}
                      over={r.overLimit.teachers}
                    />
                    <UsageCell
                      used={r.usage.admins}
                      limit={r.limits.admins}
                      ratio={r.utilization.admins}
                      over={r.overLimit.admins}
                    />
                    <td className="plat-table-muted">{r.usage.parents}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageCell({
  used,
  limit,
  ratio,
  over,
}: {
  used: number;
  limit: number | null;
  ratio: number | null;
  over: boolean;
}) {
  return (
    <td>
      <div className="plat-usage-cell">
        <span className={over ? "plat-usage-cell__over" : undefined}>
          {used} / {formatLimit(limit)}
        </span>
        {ratio != null ? (
          <div className="plat-usage-bar">
            <div
              className={`plat-usage-bar__fill${over ? " plat-usage-bar__fill--over" : ratio >= 0.85 ? " plat-usage-bar__fill--warn" : ""}`}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </div>
        ) : (
          <span className="plat-table-sub">{pctLabel(ratio)}</span>
        )}
      </div>
    </td>
  );
}
