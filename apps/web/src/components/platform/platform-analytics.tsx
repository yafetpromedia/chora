"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlatformDashboard, PlatformSchoolRow, PlatformSection } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
};

const MONTHS = 6;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function buildSignupTrend(schools: PlatformSchoolRow[]) {
  const now = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];

  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: monthLabel(monthKey(d)), count: 0 });
  }

  for (const school of schools) {
    const key = monthKey(new Date(school.createdAt));
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function buildPlanBreakdown(schools: PlatformSchoolRow[]) {
  const counts = new Map<string, number>();
  for (const school of schools) {
    const plan = school.subscription?.plan ?? "NONE";
    counts.set(plan, (counts.get(plan) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, count]) => ({
      plan: plan === "NONE" ? "No plan" : plan.charAt(0) + plan.slice(1).toLowerCase(),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildCommunityTotals(schools: PlatformSchoolRow[]) {
  return schools.reduce(
    (acc, s) => ({
      students: acc.students + s.usage.students,
      teachers: acc.teachers + s.usage.teachers,
      parents: acc.parents + s.usage.parents,
      admins: acc.admins + s.usage.admins,
    }),
    { students: 0, teachers: 0, parents: 0, admins: 0 },
  );
}

function TenantSignupChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const trend = buildSignupTrend(schools);
  const max = Math.max(1, ...trend.map((d) => d.count));
  const total = trend.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="plat-analytics__chart">
      <div className="da-chart__bars" role="img" aria-label="New tenant signups last 6 months">
        {trend.map((month) => {
          const h = month.count > 0 ? Math.max(12, (month.count / max) * 100) : 6;
          return (
            <div key={month.key} className="da-chart__bar-col">
              <div className="da-chart__bar-wrap">
                <div
                  className={`da-chart__bar plat-analytics__bar${month.count === 0 ? " da-chart__bar--empty" : ""}`}
                  style={{ height: `${h}%` }}
                  title={`${month.label}: ${month.count} new tenant${month.count === 1 ? "" : "s"}`}
                />
              </div>
              <span className="da-chart__bar-label">{month.label}</span>
              <span className="da-chart__bar-value">{month.count}</span>
            </div>
          );
        })}
      </div>
      {total === 0 ? (
        <p className="da-chart__empty">New tenants will appear here as signups come in.</p>
      ) : (
        <p className="plat-analytics__footnote">
          <strong>{total}</strong> new tenant{total === 1 ? "" : "s"} in the last {MONTHS} months
        </p>
      )}
    </div>
  );
}

function PlanDistributionChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const plans = buildPlanBreakdown(schools);
  const max = Math.max(1, ...plans.map((p) => p.count));
  const colors = ["#0d9488", "#38bdf8", "#8b5cf6", "#f59e0b", "#64748b"];

  if (plans.length === 0) {
    return <p className="da-chart__empty">No subscription data yet.</p>;
  }

  return (
    <ul className="da-enroll plat-analytics__plans">
      {plans.map((item, i) => (
        <li key={item.plan}>
          <div className="da-enroll__head">
            <span>{item.plan}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="da-enroll__track">
            <div
              className="da-enroll__fill"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommunityChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const totals = buildCommunityTotals(schools);
  const items = [
    { label: "Students", value: totals.students, color: "var(--brand-teal-dark)" },
    { label: "Parents", value: totals.parents, color: "var(--brand-teal)" },
    { label: "Teachers", value: totals.teachers, color: "var(--brand-cyan)" },
    { label: "Admins", value: totals.admins, color: "#5eead4" },
  ];
  const max = Math.max(1, ...items.map((i) => i.value));
  const portalTotal = totals.students + totals.parents + totals.teachers + totals.admins;

  return (
    <>
      <ul className="da-enroll">
        {items.map((item) => (
          <li key={item.label}>
            <div className="da-enroll__head">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="da-enroll__track">
              <div
                className="da-enroll__fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="plat-analytics__footnote">
        <strong>{portalTotal}</strong> accounts across all tenants
      </p>
    </>
  );
}

function SubscriptionMixRing({ dashboard }: { dashboard: PlatformDashboard }) {
  const { trial, paid, suspended } = dashboard.schools;
  const total = Math.max(1, trial + paid + suspended);
  const trialPct = Math.round((trial / total) * 100);
  const paidPct = Math.round((paid / total) * 100);
  const suspendedPct = Math.round((suspended / total) * 100);
  const activeRate =
    dashboard.schools.total > 0
      ? Math.round((dashboard.schools.active / dashboard.schools.total) * 100)
      : 0;

  return (
    <div className="da-finance plat-analytics__mix">
      <div
        className="da-finance__ring"
        style={{
          background: `conic-gradient(
            #38bdf8 0deg ${trialPct * 3.6}deg,
            #10b981 ${trialPct * 3.6}deg ${(trialPct + paidPct) * 3.6}deg,
            #f59e0b ${(trialPct + paidPct) * 3.6}deg ${(trialPct + paidPct + suspendedPct) * 3.6}deg,
            #e8f4f4 ${(trialPct + paidPct + suspendedPct) * 3.6}deg 360deg
          )`,
        }}
        aria-hidden
      >
        <div className="da-finance__ring-inner">
          <span className="da-finance__pct">{activeRate}%</span>
          <span className="da-finance__pct-label">active</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot plat-analytics__dot--trial" />
          Trial <strong>{trial}</strong>
        </li>
        <li>
          <span className="da-finance__dot plat-analytics__dot--paid" />
          Paid <strong>{paid}</strong>
        </li>
        <li>
          <span className="da-finance__dot plat-analytics__dot--suspended" />
          Suspended <strong>{suspended}</strong>
        </li>
      </ul>
    </div>
  );
}

function TopTenantsChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const top = [...schools]
    .sort((a, b) => b.usage.students - a.usage.students)
    .slice(0, 5);
  const max = Math.max(1, ...top.map((s) => s.usage.students));

  if (top.length === 0) {
    return <p className="da-chart__empty">Enrollment by tenant will show here.</p>;
  }

  return (
    <ul className="plat-analytics__tenants">
      {top.map((school) => (
        <li key={school.id}>
          <span className="plat-analytics__tenant-name" title={school.name}>
            {school.name}
          </span>
          <div className="plat-analytics__tenant-track">
            <div
              className="plat-analytics__tenant-fill"
              style={{ width: `${(school.usage.students / max) * 100}%` }}
            />
          </div>
          <strong>{school.usage.students}</strong>
        </li>
      ))}
    </ul>
  );
}

export function PlatformAnalytics({ dashboard, schools }: Props) {
  return (
    <section className="plat-analytics" aria-label="Platform analytics">
      <header className="plat-analytics__head">
        <div>
          <h2 className="plat-analytics__title">Analytics</h2>
          <p className="plat-analytics__sub">Growth, subscriptions, and community footprint</p>
        </div>
      </header>

      <div className="da-analytics__grid plat-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">Tenant signups</h3>
              <p className="da-card__sub">New tenants — last {MONTHS} months</p>
            </div>
          </header>
          <TenantSignupChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">Subscription mix</h3>
              <p className="da-card__sub">Trial, paid, and suspended</p>
            </div>
          </header>
          <SubscriptionMixRing dashboard={dashboard} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">Plan distribution</h3>
              <p className="da-card__sub">Active subscriptions by plan</p>
            </div>
          </header>
          <PlanDistributionChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">Community footprint</h3>
              <p className="da-card__sub">Users across all tenants</p>
            </div>
          </header>
          <CommunityChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">Enrollment leaders</h3>
              <p className="da-card__sub">Top tenants by student count</p>
            </div>
            <span className="plat-analytics__badge">
              <DashIcon name="students" className="dash-icon--xs" />
              Live
            </span>
          </header>
          <TopTenantsChart schools={schools} />
        </article>
      </div>
    </section>
  );
}
