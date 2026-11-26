"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PlatformDashboard, PlatformSchoolRow } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
};

const MONTHS = 6;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string, locale: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "am" ? "am-ET" : undefined, {
    month: "short",
  });
}

function buildSignupTrend(schools: PlatformSchoolRow[], locale: string) {
  const now = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];

  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: monthLabel(monthKey(d), locale),
      count: 0,
    });
  }

  for (const school of schools) {
    const key = monthKey(new Date(school.createdAt));
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function buildPlanBreakdown(
  schools: PlatformSchoolRow[],
  noPlanLabel: string,
) {
  const counts = new Map<string, number>();
  for (const school of schools) {
    const plan = school.subscription?.plan ?? "NONE";
    counts.set(plan, (counts.get(plan) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, count]) => ({
      plan:
        plan === "NONE"
          ? noPlanLabel
          : plan.charAt(0) + plan.slice(1).toLowerCase(),
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
  const { t, locale } = useLocale();
  const trend = buildSignupTrend(schools, locale);
  const max = Math.max(1, ...trend.map((d) => d.count));
  const total = trend.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="plat-analytics__chart">
      <div
        className="da-chart__bars"
        role="img"
        aria-label={t("platformUi.analyticsSignupsAria")}
      >
        {trend.map((month) => {
          const h = month.count > 0 ? Math.max(12, (month.count / max) * 100) : 6;
          return (
            <div key={month.key} className="da-chart__bar-col">
              <div className="da-chart__bar-wrap">
                <div
                  className={`da-chart__bar plat-analytics__bar${month.count === 0 ? " da-chart__bar--empty" : ""}`}
                  style={{ height: `${h}%` }}
                  title={t("platformUi.analyticsBarTitle", {
                    label: month.label,
                    count: month.count,
                    s: month.count === 1 ? "" : "s",
                  })}
                />
              </div>
              <span className="da-chart__bar-label">{month.label}</span>
              <span className="da-chart__bar-value">{month.count}</span>
            </div>
          );
        })}
      </div>
      {total === 0 ? (
        <p className="da-chart__empty">{t("platformUi.analyticsSignupsEmpty")}</p>
      ) : (
        <p className="plat-analytics__footnote">
          {t("platformUi.analyticsSignupsFoot", {
            total,
            s: total === 1 ? "" : "s",
            months: MONTHS,
          })}
        </p>
      )}
    </div>
  );
}

function PlanDistributionChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const { t } = useLocale();
  const plans = buildPlanBreakdown(schools, t("platformUi.analyticsNoPlan"));
  const max = Math.max(1, ...plans.map((p) => p.count));
  const colors = ["#0d9488", "#38bdf8", "#8b5cf6", "#f59e0b", "#64748b"];

  if (plans.length === 0) {
    return <p className="da-chart__empty">{t("platformUi.analyticsPlansEmpty")}</p>;
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
  const { t } = useLocale();
  const totals = buildCommunityTotals(schools);
  const items = [
    { label: t("platformUi.statStudents"), value: totals.students, color: "var(--brand-teal-dark)" },
    { label: t("platformUi.statParents"), value: totals.parents, color: "var(--brand-teal)" },
    { label: t("platformUi.statTeachers"), value: totals.teachers, color: "var(--brand-cyan)" },
    { label: t("platformUi.statAdmins"), value: totals.admins, color: "#5eead4" },
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
        {t("platformUi.analyticsCommunityFoot", { total: portalTotal })}
      </p>
    </>
  );
}

function SubscriptionMixRing({ dashboard }: { dashboard: PlatformDashboard }) {
  const { t } = useLocale();
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
          <span className="da-finance__pct-label">{t("platformUi.analyticsActive")}</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot plat-analytics__dot--trial" />
          {t("platformUi.statTrial")} <strong>{trial}</strong>
        </li>
        <li>
          <span className="da-finance__dot plat-analytics__dot--paid" />
          {t("platformUi.statPaid")} <strong>{paid}</strong>
        </li>
        <li>
          <span className="da-finance__dot plat-analytics__dot--suspended" />
          {t("platformUi.statSuspended")} <strong>{suspended}</strong>
        </li>
      </ul>
    </div>
  );
}

function TopTenantsChart({ schools }: { schools: PlatformSchoolRow[] }) {
  const { t } = useLocale();
  const top = [...schools]
    .sort((a, b) => b.usage.students - a.usage.students)
    .slice(0, 5);
  const max = Math.max(1, ...top.map((s) => s.usage.students));

  if (top.length === 0) {
    return <p className="da-chart__empty">{t("platformUi.analyticsLeadersEmpty")}</p>;
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
  const { t } = useLocale();
  return (
    <section className="plat-analytics" aria-label={t("platformUi.analyticsAria")}>
      <header className="plat-analytics__head">
        <div>
          <h2 className="plat-analytics__title">{t("platformUi.analyticsTitle")}</h2>
          <p className="plat-analytics__sub">{t("platformUi.analyticsSub")}</p>
        </div>
      </header>

      <div className="da-analytics__grid plat-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">{t("platformUi.analyticsSignupsTitle")}</h3>
              <p className="da-card__sub">
                {t("platformUi.analyticsSignupsSub", { months: MONTHS })}
              </p>
            </div>
          </header>
          <TenantSignupChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">{t("platformUi.analyticsMixTitle")}</h3>
              <p className="da-card__sub">{t("platformUi.analyticsMixSub")}</p>
            </div>
          </header>
          <SubscriptionMixRing dashboard={dashboard} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">{t("platformUi.analyticsPlansTitle")}</h3>
              <p className="da-card__sub">{t("platformUi.analyticsPlansSub")}</p>
            </div>
          </header>
          <PlanDistributionChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">{t("platformUi.analyticsCommunityTitle")}</h3>
              <p className="da-card__sub">{t("platformUi.analyticsCommunitySub")}</p>
            </div>
          </header>
          <CommunityChart schools={schools} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h3 className="da-card__title">{t("platformUi.analyticsLeadersTitle")}</h3>
              <p className="da-card__sub">{t("platformUi.analyticsLeadersSub")}</p>
            </div>
            <span className="plat-analytics__badge">
              <DashIcon name="students" className="dash-icon--xs" />
              {t("platformUi.analyticsLive")}
            </span>
          </header>
          <TopTenantsChart schools={schools} />
        </article>
      </div>
    </section>
  );
}
