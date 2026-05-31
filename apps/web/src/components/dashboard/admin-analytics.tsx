"use client";

import Link from "next/link";
import { formatEtb } from "@/lib/finance";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import { DashIcon } from "./dash-icons";

function AttendanceTrendChart({
  trend,
}: {
  trend: AdminAnalyticsOverview["attendanceTrend"];
}) {
  const maxRate = Math.max(100, ...trend.map((d) => d.rate ?? 0));
  const hasData = trend.some((d) => d.marked > 0);

  return (
    <div className="da-chart">
      <div className="da-chart__bars" role="img" aria-label="Attendance rate last 7 days">
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
                      ? `${day.weekday}: ${day.rate}% (${day.present}/${day.marked})`
                      : `${day.weekday}: no marks`
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
        <p className="da-chart__empty">Mark attendance to see weekly trends.</p>
      ) : null}
    </div>
  );
}

function FinanceRing({
  finance,
}: {
  finance: NonNullable<AdminAnalyticsOverview["finance"]>;
}) {
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
          <span className="da-finance__pct-label">collected</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot da-finance__dot--collected" />
          Collected <strong>{formatEtb(finance.collectedCents)}</strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          Outstanding <strong>{formatEtb(finance.outstandingCents)}</strong>
        </li>
        <li className="da-finance__meta">
          {finance.paidStudents} paid · {finance.unpaidStudents} unpaid
          {finance.overdueFeesCount > 0
            ? ` · ${finance.overdueFeesCount} overdue`
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
  const items = [
    { label: "Students", value: enrollment.students, color: "var(--brand-teal-dark)" },
    { label: "Parents", value: enrollment.parents, color: "var(--brand-teal)" },
    { label: "Teachers", value: enrollment.teachers, color: "var(--brand-cyan)" },
    { label: "Staff", value: enrollment.staff, color: "#5eead4" },
    { label: "Admins", value: enrollment.admins, color: "#99f6e4" },
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

function GradeBars({ grades }: { grades: AdminAnalyticsOverview["gradeAttendance"] }) {
  if (grades.length === 0) {
    return <p className="da-chart__empty">No grade attendance marked today.</p>;
  }
  return (
    <ul className="da-grades">
      {grades.map((g) => (
        <li key={g.grade}>
          <span className="da-grades__name">{g.grade}</span>
          <div className="da-grades__track">
            <div className="da-grades__fill" style={{ width: `${g.rate}%` }} />
          </div>
          <span className="da-grades__pct">{g.rate}%</span>
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
  const today = analytics.attendanceToday;
  const ringPct = today.rate ?? 0;
  const ringDeg = today.marked > 0 ? (ringPct / 100) * 360 : 0;

  return (
    <section className="da-analytics" aria-label="School analytics">
      <div className="da-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Attendance trend</h2>
              <p className="da-card__sub">Daily rate — last 7 days</p>
            </div>
            <Link href="/admin/attendance" className="da-card__link">
              Open attendance <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <AttendanceTrendChart trend={analytics.attendanceTrend} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Today</h2>
              <p className="da-card__sub">Live attendance</p>
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
                <dt>Present</dt>
                <dd>{today.present}</dd>
              </div>
              <div>
                <dt>Absent</dt>
                <dd>{today.absent}</dd>
              </div>
              <div>
                <dt>Marked</dt>
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
                <h2 className="da-card__title">Fee collection</h2>
                <p className="da-card__sub">Collected vs outstanding</p>
              </div>
              <Link href="/admin/finance" className="da-card__link">
                Finance <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <FinanceRing finance={analytics.finance} />
          </article>
        ) : null}

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Community</h2>
              <p className="da-card__sub">{analytics.enrollment.portalTotal} portal accounts</p>
            </div>
            <Link href="/admin/parents" className="da-card__link">
              Parents <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <EnrollmentChart enrollment={analytics.enrollment} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">By grade today</h2>
              <p className="da-card__sub">Attendance rate per grade</p>
            </div>
          </header>
          <GradeBars grades={analytics.gradeAttendance} />
          {analytics.insights.mostAbsentGrade ? (
            <p className="da-insight da-insight--warn">
              Needs attention: <strong>{analytics.insights.mostAbsentGrade.label}</strong> (
              {analytics.insights.mostAbsentGrade.rate}%)
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
