"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import { getBillingSummary, type BillingSummary } from "@/lib/platform-billing";
import type { PlatformDashboard, PlatformSchoolRow, PlatformSection } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
  onNavigate?: (section: PlatformSection) => void;
};

type PlanFilter = "ALL" | "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "INACTIVE";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export function PlatformBilling({ dashboard, schools, onNavigate }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const loadSummary = useCallback(async () => {
    const data = await getBillingSummary();
    setSummary(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadSummary()
      .catch((err) => fail(err, "Failed to load billing summary"))
      .finally(() => setLoading(false));
  }, [loadSummary, schools, router]);

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = {
      TRIAL: 0,
      STARTER: 0,
      PROFESSIONAL: 0,
      ENTERPRISE: 0,
      NONE: 0,
    };
    for (const s of schools) {
      const plan = s.subscription?.plan ?? "NONE";
      counts[plan] = (counts[plan] ?? 0) + 1;
    }
    return counts;
  }, [schools]);

  const maxPlanCount = Math.max(...Object.values(planCounts), 1);

  const trialEndingSoon = useMemo(
    () =>
      schools.filter((s) => {
        const d = daysUntil(s.subscription?.trialEndsAt);
        return d !== null && d >= 0 && d <= 14 && s.subscription?.plan === "TRIAL";
      }),
    [schools],
  );

  const inactiveBilling = schools.filter((s) => s.subscription && !s.subscription.isActive);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      const plan = s.subscription?.plan ?? "";
      const inactive = s.subscription && !s.subscription.isActive;
      if (planFilter === "INACTIVE" && !inactive) return false;
      if (planFilter !== "ALL" && planFilter !== "INACTIVE" && plan !== planFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        plan.toLowerCase().includes(q) ||
        s.joinCode.toLowerCase().includes(q)
      );
    });
  }, [schools, query, planFilter]);

  const planFilters: { id: PlanFilter; label: string; count?: number }[] = [
    { id: "ALL", label: "All", count: schools.length },
    { id: "TRIAL", label: "Trial", count: planCounts.TRIAL },
    { id: "STARTER", label: "Starter", count: planCounts.STARTER },
    { id: "PROFESSIONAL", label: "Pro", count: planCounts.PROFESSIONAL },
    { id: "ENTERPRISE", label: "Enterprise", count: planCounts.ENTERPRISE },
    { id: "INACTIVE", label: "Inactive", count: inactiveBilling.length },
  ];

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
            <DashIcon name="finance" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Revenue & subscriptions</p>
            <h2 className="plat-subjects-v2__title">Billing</h2>
            <p className="plat-subjects-v2__sub">
              MRR estimates, subscription health, and trial conversion risk.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>${(summary?.mrrUsd ?? 0).toLocaleString()}</strong>
            <span>Est. MRR</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{summary?.paidSchools ?? dashboard.schools.paid}</strong>
            <span>Paid</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{summary?.trialSchools ?? dashboard.schools.trial}</strong>
            <span>On trial</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <button
          type="button"
          className="plat-subjects-v2__kpi plat-billing-v2__kpi-btn"
          onClick={() => onNavigate?.("invoices")}
          disabled={!onNavigate}
        >
          <DashIcon name="fees" className="dash-icon--sm" />
          <div>
            <strong>
              {summary
                ? `$${summary.invoices.outstandingUsd.toLocaleString()}`
                : "—"}
            </strong>
            <span>Outstanding</span>
          </div>
        </button>
        <button
          type="button"
          className="plat-subjects-v2__kpi plat-billing-v2__kpi-btn"
          onClick={() => onNavigate?.("usage")}
          disabled={!onNavigate}
        >
          <DashIcon name="students" className="dash-icon--sm" />
          <div>
            <strong>{schools.length}</strong>
            <span>Usage & limits</span>
          </div>
        </button>
        <button
          type="button"
          className="plat-subjects-v2__kpi plat-billing-v2__kpi-btn"
          onClick={() => onNavigate?.("plans")}
          disabled={!onNavigate}
        >
          <DashIcon name="settings" className="dash-icon--sm" />
          <div>
            <strong>4</strong>
            <span>Plan tiers</span>
          </div>
        </button>
      </div>

      {onNavigate ? (
        <div className="plat-billing-v2__nav">
          <button
            type="button"
            className="plat-billing-v2__nav-card"
            onClick={() => onNavigate("invoices")}
          >
            <DashIcon name="fees" className="dash-icon--sm" />
            <div>
              <strong>Invoices</strong>
              <span>
                {summary
                  ? `${summary.invoices.sent + summary.invoices.overdue} open`
                  : "Accounts receivable"}
              </span>
            </div>
          </button>
          <button
            type="button"
            className="plat-billing-v2__nav-card"
            onClick={() => onNavigate("usage")}
          >
            <DashIcon name="students" className="dash-icon--sm" />
            <div>
              <strong>Usage & limits</strong>
              <span>Seat utilization per school</span>
            </div>
          </button>
          <button
            type="button"
            className="plat-billing-v2__nav-card"
            onClick={() => onNavigate("plans")}
          >
            <DashIcon name="settings" className="dash-icon--sm" />
            <div>
              <strong>Plan catalog</strong>
              <span>Prices, limits, and features</span>
            </div>
          </button>
        </div>
      ) : null}

      <div className="plat-billing-v2__stats-row">
        <article className="plat-billing-v2__mini-kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{summary?.paidSchools ?? dashboard.schools.paid}</strong>
            <span>Paid subscriptions</span>
          </div>
        </article>
        <article className="plat-billing-v2__mini-kpi">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <div>
            <strong>{trialEndingSoon.length}</strong>
            <span>Trials ending in 14d</span>
          </div>
        </article>
        <article className="plat-billing-v2__mini-kpi">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div>
            <strong>{inactiveBilling.length}</strong>
            <span>Billing inactive</span>
          </div>
        </article>
        <article className="plat-billing-v2__mini-kpi">
          <DashIcon name="fees" className="dash-icon--sm" />
          <div>
            <strong>
              {summary
                ? summary.invoices.sent + summary.invoices.overdue
                : "—"}
            </strong>
            <span>Open invoices</span>
          </div>
        </article>
      </div>

      <section className="plat-billing-v2__panel">
        <h3 className="plat-billing-v2__panel-title">Plan distribution</h3>
        <div className="plat-plan-bars">
          {(["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"] as const).map((plan) => (
            <div key={plan} className="plat-plan-bar-row">
              <span className="plat-plan-bar-row__label">{plan}</span>
              <div className="plat-plan-bar-row__track">
                <div
                  className={`plat-plan-bar-row__fill plat-plan-bar-row__fill--${plan.toLowerCase()}`}
                  style={{ width: `${((planCounts[plan] ?? 0) / maxPlanCount) * 100}%` }}
                />
              </div>
              <span className="plat-plan-bar-row__count">{planCounts[plan] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      {trialEndingSoon.length > 0 ? (
        <section className="plat-billing-v2__alert">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div className="plat-billing-v2__alert-body">
            <strong>
              {trialEndingSoon.length} trial{trialEndingSoon.length > 1 ? "s" : ""} ending soon
            </strong>
            <p>Reach out before access expires — convert to Starter or extend trial.</p>
          </div>
          <ul className="plat-billing-v2__alert-list">
            {trialEndingSoon.slice(0, 4).map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <span>{daysUntil(s.subscription?.trialEndsAt)}d left</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="plat-billing-v2__panel">
        <h3 className="plat-billing-v2__panel-title">Subscription ledger</h3>
        <p className="plat-billing-v2__panel-hint">
          Per-school plan and billing status. Assign plans from Schools → Billing tab.
        </p>

        <div className="plat-subjects-v2__toolbar">
          <div className="plat-tenants-v2__search plat-subjects-v2__search">
            <DashIcon name="finance" className="dash-icon--sm" />
            <input
              type="search"
              placeholder="Search school or plan…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search subscriptions"
            />
          </div>
        </div>

        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {planFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={planFilter === f.id}
              className={`plat-filter-tab${
                planFilter === f.id ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setPlanFilter(f.id)}
            >
              {f.label}
              <span className="plat-filter-count">{f.count ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="plat-subjects-v2__table-wrap">
          <table className="plat-subjects-v2__table">
            <thead>
              <tr>
                <th>School</th>
                <th>Plan</th>
                <th>Billing</th>
                <th>Renewal / trial</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="plat-subjects-v2__empty">
                    No subscriptions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const sub = s.subscription;
                  const days = daysUntil(sub?.trialEndsAt);
                  const urgent =
                    sub?.plan === "TRIAL" && days !== null && days >= 0 && days <= 7;
                  return (
                    <tr
                      key={s.id}
                      className={urgent ? "plat-billing-v2__row--urgent" : undefined}
                    >
                      <td>
                        <span className="plat-subjects-v2__name">{s.name}</span>
                        <code className="plat-subjects-v2__code">{s.joinCode}</code>
                      </td>
                      <td>
                        <span
                          className={`plat-plan-badge plat-plan-badge--${(sub?.plan ?? "none").toLowerCase()}`}
                        >
                          {sub?.plan ?? "—"}
                        </span>
                      </td>
                      <td>
                        {sub ? (
                          <span
                            className={`plat-billing-pill plat-billing-pill--${sub.isActive ? "on" : "off"}`}
                          >
                            {sub.isActive ? "Active" : "Inactive"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {sub?.plan === "TRIAL" && sub.trialEndsAt ? (
                          <>
                            {formatDate(sub.trialEndsAt)}
                            {days !== null && days >= 0 ? (
                              <span
                                className={`plat-renewal-tag${
                                  urgent ? " plat-renewal-tag--urgent" : ""
                                }`}
                              >
                                {days}d left
                              </span>
                            ) : null}
                          </>
                        ) : sub?.plan && sub.plan !== "TRIAL" ? (
                          <span className="plat-billing-v2__muted">Monthly billing</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={`plat-status plat-status--${s.status.toLowerCase()}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
