"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
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
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  const loadSummary = useCallback(async () => {
    const data = await getBillingSummary();
    setSummary(data);
  }, []);

  useEffect(() => {
    void loadSummary().catch(() => setSummary(null));
  }, [loadSummary, schools]);

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

  return (
    <div className="plat-section plat-billing">
      <header className="plat-section-hero plat-section-hero--billing">
        <div>
          <p className="plat-section-hero__eyebrow">Revenue & subscriptions</p>
          <h2 className="plat-section-hero__title">Billing</h2>
          <p className="plat-section-hero__sub">
            MRR estimates, subscription health, and trial conversion risk.
          </p>
        </div>
        {summary ? (
          <div className="plat-billing-mrr">
            <span className="plat-billing-mrr__label">Est. MRR (USD)</span>
            <span className="plat-billing-mrr__value">${summary.mrrUsd.toLocaleString()}</span>
            <span className="plat-billing-mrr__hint">
              {summary.mrrEtb.toLocaleString()} ETB · {summary.paidSchools} paid schools
            </span>
          </div>
        ) : (
          <div className="plat-billing-mrr">
            <span className="plat-billing-mrr__label">Paid tenants</span>
            <span className="plat-billing-mrr__value">{dashboard.schools.paid}</span>
          </div>
        )}
      </header>

      {onNavigate ? (
        <div className="plat-billing-links">
          <button type="button" className="plat-btn plat-btn--ghost" onClick={() => onNavigate("invoices")}>
            <DashIcon name="fees" className="dash-icon--sm" />
            Invoices
            {summary ? (
              <span className="plat-filter-count">{summary.invoices.total}</span>
            ) : null}
          </button>
          <button type="button" className="plat-btn plat-btn--ghost" onClick={() => onNavigate("usage")}>
            <DashIcon name="students" className="dash-icon--sm" />
            Usage & limits
          </button>
          <button type="button" className="plat-btn plat-btn--ghost" onClick={() => onNavigate("plans")}>
            <DashIcon name="settings" className="dash-icon--sm" />
            Edit plan catalog
          </button>
        </div>
      ) : null}

      <div className="dash-admin-kpis plat-kpis">
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="finance" />
          </div>
          <p className="dash-admin-kpi__label">Paid</p>
          <p className="dash-admin-kpi__value">{summary?.paidSchools ?? dashboard.schools.paid}</p>
          <p className="dash-admin-kpi__hint">Active paid subscriptions</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="calendar" />
          </div>
          <p className="dash-admin-kpi__label">On trial</p>
          <p className="dash-admin-kpi__value">{summary?.trialSchools ?? dashboard.schools.trial}</p>
          <p className="dash-admin-kpi__hint">{trialEndingSoon.length} ending in 14d</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="fees" />
          </div>
          <p className="dash-admin-kpi__label">Outstanding</p>
          <p className="dash-admin-kpi__value">
            {summary ? `$${summary.invoices.outstandingUsd.toLocaleString()}` : "—"}
          </p>
          <p className="dash-admin-kpi__hint">
            {summary
              ? `${summary.invoices.sent + summary.invoices.overdue} open invoices`
              : "Sent + overdue"}
          </p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
            <DashIcon name="alert" />
          </div>
          <p className="dash-admin-kpi__label">Billing off</p>
          <p className="dash-admin-kpi__value">{inactiveBilling.length}</p>
          <p className="dash-admin-kpi__hint">Needs follow-up</p>
        </article>
      </div>

      <section className="plat-panel">
        <h3 className="plat-panel__title">Plan distribution</h3>
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
        <section className="plat-alert-strip">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div className="plat-alert-strip__body">
            <strong>
              {trialEndingSoon.length} trial{trialEndingSoon.length > 1 ? "s" : ""} ending soon
            </strong>
            <p>Reach out before access expires — convert to Starter or extend trial.</p>
          </div>
          <ul className="plat-alert-strip__list">
            {trialEndingSoon.slice(0, 4).map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <span>{daysUntil(s.subscription?.trialEndsAt)}d left</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="plat-panel">
        <div className="plat-panel__head plat-panel__head--stack">
          <div>
            <h3 className="plat-panel__title">Subscription ledger</h3>
            <p className="plat-panel__hint">
              Per-school plan and billing status. Assign plans from Schools → Billing tab.
            </p>
          </div>
        </div>

        <div className="plat-toolbar">
          <div className="plat-search">
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

        <div className="plat-filter-tabs" role="tablist" aria-label="Filter by plan">
          {planFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={planFilter === f.id}
              className={`plat-filter-tab${planFilter === f.id ? " plat-filter-tab--active" : ""}`}
              onClick={() => setPlanFilter(f.id)}
            >
              {f.label}
              <span className="plat-filter-count">{f.count ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="plat-table-wrap">
          <table className="plat-table plat-table--billing">
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
                  <td colSpan={5} className="plat-table-empty">
                    No subscriptions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const sub = s.subscription;
                  const days = daysUntil(sub?.trialEndsAt);
                  const urgent = sub?.plan === "TRIAL" && days !== null && days >= 0 && days <= 7;
                  return (
                    <tr key={s.id} className={urgent ? "plat-table-row--urgent" : undefined}>
                      <td>
                        <strong className="plat-table-name">{s.name}</strong>
                        <span className="plat-table-sub">{s.joinCode}</span>
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
                      <td className="plat-table-muted">
                        {sub?.plan === "TRIAL" && sub.trialEndsAt ? (
                          <>
                            {formatDate(sub.trialEndsAt)}
                            {days !== null && days >= 0 ? (
                              <span
                                className={`plat-renewal-tag${urgent ? " plat-renewal-tag--urgent" : ""}`}
                              >
                                {days}d left
                              </span>
                            ) : null}
                          </>
                        ) : sub?.plan && sub.plan !== "TRIAL" ? (
                          <span className="plat-table-sub">Monthly billing</span>
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
