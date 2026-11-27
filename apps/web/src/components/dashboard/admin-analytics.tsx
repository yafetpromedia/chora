"use client";

import Link from "next/link";
import { EtbAmount } from "@/components/billing/etb-amount";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import { GradeAttendanceBars } from "@/components/dashboard/staff-dashboard-shared";
import { useLocale } from "@/components/i18n/locale-provider";
import { DashIcon } from "./dash-icons";

function AttendanceTrendChart({
  trend,
}: {
  trend: AdminAnalyticsOverview["attendanceTrend"];
}) {
  const { t } = useLocale();
  const maxRate = Math.max(100, ...trend.map((d) => d.rate ?? 0));
  const hasData = trend.some((d) => d.marked > 0);

  return (
    <div className="da-chart">
      <div className="da-chart__bars" role="img" aria-label={t("adminDash.attendanceTrend7Aria")}>
        {trend.map((day) => {
          const h = day.rate != null ? Math.max(8, (day.rate / maxRate) * 100) : 4;
          return (
            <div key={day.date} className="da-chart__bar-col">
              <div className="da-chart__bar-wrap">
                <div
                  className={`da-chart__bar${day.rate == null ? " da-chart__bar--empty" : ""}`}
                  style={{ height: `${h}%` }}
                  title={
                    day.rate != null
                      ? t("dash.weekdayRatePct", { weekday: day.weekday, rate: day.rate }) +
                        ` (${day.present}/${day.marked})`
                      : t("dash.weekdayNoMarks", { weekday: day.weekday })
                  }
                />
              </div>
              <span className="da-chart__bar-label">{day.weekday}</span>
              <span className="da-chart__bar-value">
                {day.rate != null ? `${day.rate}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {!hasData ? (
        <p className="da-chart__empty">{t("adminDash.markToSeeTrends")}</p>
      ) : null}
    </div>
  );
}

function FinanceRing({
  finance,
}: {
  finance: NonNullable<AdminAnalyticsOverview["finance"]>;
}) {
  const { t } = useLocale();
  const total = finance.collectedCents + finance.outstandingCents;
  const pct = total > 0 ? Math.round((finance.collectedCents / total) * 100) : 0;
  const deg = (pct / 100) * 360;

  return (
    <div className="da-finance">
      <div
        className="da-finance__ring"
        style={{
          background: `conic-gradient(var(--brand-teal) 0deg ${deg}deg, #e8f4f4 ${deg}deg 360deg)`,
        }}
        aria-hidden
      >
        <div className="da-finance__ring-inner">
          <span className="da-finance__pct">{pct}%</span>
          <span className="da-finance__pct-label">{t("adminDash.collectedLabel")}</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot da-finance__dot--collected" />
          {t("adminDash.collected")} <strong><EtbAmount cents={finance.collectedCents} /></strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          {t("adminDash.outstanding")} <strong><EtbAmount cents={finance.outstandingCents} /></strong>
        </li>
        <li className="da-finance__meta">
          {t("adminDash.paidUnpaid", {
            paid: finance.paidStudents,
            unpaid: finance.unpaidStudents,
          })}
          {finance.overdueFeesCount > 0
            ? ` · ${t("adminDash.overdue", { count: finance.overdueFeesCount })}`
            : ""}
        </li>
      </ul>
    </div>
  );
}

function EnrollmentChart({
  enrollment,
}: {
  enrollment: AdminAnalyticsOverview["enrollment"];
}) {
  const { t, tn } = useLocale();
  const items = [
    { label: t("adminDash.students"), value: enrollment.students, color: "var(--brand-teal-dark)" },
    { label: t("adminDash.parents"), value: enrollment.parents, color: "var(--brand-teal)" },
    { label: tn("Teachers"), value: enrollment.teachers, color: "var(--brand-cyan)" },
    { label: t("adminDash.staff"), value: enrollment.staff, color: "#5eead4" },
    { label: t("adminDash.admins"), value: enrollment.admins, color: "#99f6e4" },
  ];
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
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
  );
}

type Props = {
  analytics: AdminAnalyticsOverview;
  canViewFinance: boolean;
};

export function AdminAnalyticsSection({ analytics, canViewFinance }: Props) {
  const { t, tn } = useLocale();
  const today = analytics.attendanceToday;
  const ringPct = today.rate ?? 0;
  const ringDeg = today.marked > 0 ? (ringPct / 100) * 360 : 0;

  return (
    <section className="da-analytics" aria-label={t("adminDash.schoolAnalytics")}>
      <div className="da-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("adminDash.attendanceTrend")}</h2>
              <p className="da-card__sub">{t("adminDash.dailyRate7")}</p>
            </div>
            <Link href="/admin/attendance" className="da-card__link">
              {t("adminDash.openAttendance")} <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <AttendanceTrendChart trend={analytics.attendanceTrend} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("adminDash.today")}</h2>
              <p className="da-card__sub">{t("adminDash.liveAttendance")}</p>
            </div>
          </header>
          <div className="da-today">
            <div
              className="da-today__ring"
              style={{
                background:
                  today.marked > 0
                    ? `conic-gradient(#059669 0deg ${ringDeg}deg, #eef4f4 ${ringDeg}deg 360deg)`
                    : "#f1f5f5",
              }}
            >
              <div className="da-today__ring-inner">
                <span className="da-today__rate">{today.rate != null ? `${today.rate}%` : "—"}</span>
              </div>
            </div>
            <dl className="da-today__stats">
              <div>
                <dt>{t("adminDash.present")}</dt>
                <dd>{today.present}</dd>
              </div>
              <div>
                <dt>{t("adminDash.absent")}</dt>
                <dd>{today.absent}</dd>
              </div>
              <div>
                <dt>{t("adminDash.marked")}</dt>
                <dd>
                  {today.marked}/{today.totalStudents}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        {canViewFinance && analytics.finance ? (
          <article className="da-card">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("adminDash.feeCollection")}</h2>
                <p className="da-card__sub">
                  {t("adminDash.collected")} / {t("adminDash.outstanding")}
                </p>
              </div>
              <Link href="/admin/finance" className="da-card__link">
                {tn("Finance")} <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <FinanceRing finance={analytics.finance} />
          </article>
        ) : null}

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("adminDash.community")}</h2>
              <p className="da-card__sub">
                {t("adminDash.portalAccounts", { count: analytics.enrollment.portalTotal })}
              </p>
            </div>
            <Link href="/admin/parents" className="da-card__link">
              {tn("Parents")} <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <EnrollmentChart enrollment={analytics.enrollment} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("adminDash.byGradeToday")}</h2>
              <p className="da-card__sub">{t("adminDash.byGradeTodaySub")}</p>
            </div>
          </header>
          <GradeAttendanceBars grades={analytics.gradeAttendance} />
          {analytics.insights.mostAbsentGrade ? (
            <p className="da-insight da-insight--warn">
              {t("adminDash.needsAttention")}{" "}
              <strong>{analytics.insights.mostAbsentGrade.label}</strong> (
              {analytics.insights.mostAbsentGrade.rate}%)
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
