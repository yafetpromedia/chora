"use client";

import { useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlatformDashboard, PlatformSchoolRow } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
};

type PlanFilter = "ALL" | "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "INACTIVE";

const PLANS = [
  {
    id: "TRIAL",
    name: "Trial",
    price: "Free",
    period: "14 days",
    desc: "Full evaluation for new tenants. Auto-assigned when a school is created.",
    features: ["All core modules", "Up to 50 students", "Email support"],
    tone: "trial",
  },
  {
    id: "STARTER",
    name: "Starter",
    price: "2,500",
    period: "ETB / month",
    desc: "Single campus running attendance, results, and family communication.",
    features: ["Students & staff", "Attendance & results", "Announcements"],
    tone: "starter",
    popular: true,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: "6,500",
    period: "ETB / month",
    desc: "Finance, reporting, and higher limits for growing schools.",
    features: ["Everything in Starter", "Fees & finance", "Advanced reports"],
    tone: "pro",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "Annual contract",
    desc: "Multi-campus, SLA, and dedicated onboarding for large groups.",
    features: ["Custom limits", "Priority support", "Sales-assisted setup"],
    tone: "enterprise",
  },
] as const;

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

export function PlatformBilling({ dashboard, schools }: Props) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");

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
          <h2 className="plat-section-hero__title">Billing center</h2>
          <p className="plat-section-hero__sub">
            Track trials, paid plans, and renewal risk across every tenant on CampusOne.
          </p>
        </div>
        <div className="plat-billing-mrr">
          <span className="plat-billing-mrr__label">Paid tenants</span>
          <span className="plat-billing-mrr__value">{dashboard.schools.paid}</span>
          <span className="plat-billing-mrr__hint">Active paid subscriptions</span>
        </div>
      </header>

      <div className="dash-admin-kpis plat-kpis">
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="finance" />
          </div>
          <p className="dash-admin-kpi__label">Paid</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.paid}</p>
          <p className="dash-admin-kpi__hint">Starter, Pro, Enterprise</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="calendar" />
          </div>
          <p className="dash-admin-kpi__label">On trial</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.trial}</p>
          <p className="dash-admin-kpi__hint">{trialEndingSoon.length} ending in 14d</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
            <DashIcon name="alert" />
          </div>
          <p className="dash-admin-kpi__label">Billing off</p>
          <p className="dash-admin-kpi__value">{inactiveBilling.length}</p>
          <p className="dash-admin-kpi__hint">Needs follow-up</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="students" />
          </div>
          <p className="dash-admin-kpi__label">Total schools</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.total}</p>
          <p className="dash-admin-kpi__hint">All tenants</p>
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
            <strong>{trialEndingSoon.length} trial{trialEndingSoon.length > 1 ? "s" : ""} ending soon</strong>
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
              Plans are set per school. Upgrades happen in the school admin or via sales.
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
                        <span className={`plat-plan-badge plat-plan-badge--${(sub?.plan ?? "none").toLowerCase()}`}>
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
                              <span className={`plat-renewal-tag${urgent ? " plat-renewal-tag--urgent" : ""}`}>
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

      <section className="plat-panel plat-panel--muted">
        <div className="plat-panel__head">
          <h3 className="plat-panel__title">Plan catalog</h3>
          <p className="plat-panel__hint">Reference pricing for sales & support (pilot rates)</p>
        </div>
        <div className="plat-pricing-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`plat-pricing-card plat-pricing-card--${plan.tone}${"popular" in plan && plan.popular ? " plat-pricing-card--popular" : ""}`}
            >
              {"popular" in plan && plan.popular ? (
                <span className="plat-pricing-card__badge">Most common</span>
              ) : null}
              <h4 className="plat-pricing-card__name">{plan.name}</h4>
              <p className="plat-pricing-card__price">
                {plan.price}
                <span>{plan.period}</span>
              </p>
              <p className="plat-pricing-card__desc">{plan.desc}</p>
              <ul className="plat-pricing-card__features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <DashIcon name="attendance" className="dash-icon--xs plat-pricing-check" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="plat-pricing-card__count">
                {planCounts[plan.id] ?? 0} school{(planCounts[plan.id] ?? 0) !== 1 ? "s" : ""} on this plan
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
