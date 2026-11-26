"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
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
  const { t } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UsageFilter>("ALL");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformUsage();
    setRows(data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void load()
        .catch((e) => fail(e, t("platformUi.usageErrLoad")))
        .finally(() => setLoading(false));
    });
  }, [load, router, t]);

  const overCount = useMemo(
    () =>
      rows.filter(
        (r) => r.overLimit.students || r.overLimit.teachers || r.overLimit.admins,
      ).length,
    [rows],
  );

  const highCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.utilization.students ?? 0) >= 0.85 ||
          (r.utilization.teachers ?? 0) >= 0.85 ||
          (r.utilization.admins ?? 0) >= 0.85,
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
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-billing-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.usageEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.usageTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.usageSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{rows.length}</strong>
            <span>{t("platformUi.usageStatSchools")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{overCount}</strong>
            <span>{t("platformUi.usageStatOver")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{highCount}</strong>
            <span>{t("platformUi.usageStatHigh")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="students" className="dash-icon--sm" />
          <div>
            <strong>
              {rows.reduce((sum, r) => sum + r.usage.students, 0).toLocaleString()}
            </strong>
            <span>{t("platformUi.usageTotalStudents")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="teachers" className="dash-icon--sm" />
          <div>
            <strong>
              {rows.reduce((sum, r) => sum + r.usage.teachers, 0).toLocaleString()}
            </strong>
            <span>{t("platformUi.usageTotalTeachers")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div>
            <strong>{overCount}</strong>
            <span>{t("platformUi.usageNeedsUpgrade")}</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.usageSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.usageSearchAria")}
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {(
            [
              { id: "ALL" as const, label: t("platformUi.usageFilterAll"), count: rows.length },
              { id: "OVER" as const, label: t("platformUi.usageFilterOver"), count: overCount },
              { id: "HIGH" as const, label: t("platformUi.usageFilterHigh"), count: highCount },
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
      </div>

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>{t("platformUi.usageColSchool")}</th>
              <th>{t("platformUi.usageColPlan")}</th>
              <th>{t("platformUi.usageColStudents")}</th>
              <th>{t("platformUi.usageColTeachers")}</th>
              <th>{t("platformUi.usageColAdmins")}</th>
              <th>{t("platformUi.usageColParents")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="plat-subjects-v2__empty">
                  {t("platformUi.usageNoMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const anyOver =
                  r.overLimit.students || r.overLimit.teachers || r.overLimit.admins;
                return (
                  <tr
                    key={r.schoolId}
                    className={anyOver ? "plat-billing-v2__row--urgent" : undefined}
                  >
                    <td>
                      <span className="plat-subjects-v2__name">{r.schoolName}</span>
                      <code className="plat-subjects-v2__code">{r.joinCode}</code>
                    </td>
                    <td>
                      <span
                        className={`plat-plan-badge plat-plan-badge--${r.plan.toLowerCase()}`}
                      >
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
                    <td className="plat-billing-v2__muted">{r.usage.parents}</td>
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
              className={`plat-usage-bar__fill${
                over
                  ? " plat-usage-bar__fill--over"
                  : ratio >= 0.85
                    ? " plat-usage-bar__fill--warn"
                    : ""
              }`}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </div>
        ) : (
          <span className="plat-billing-v2__muted">{pctLabel(ratio)}</span>
        )}
      </div>
    </td>
  );
}
