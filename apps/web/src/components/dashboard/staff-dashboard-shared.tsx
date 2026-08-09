"use client";

import type { ReactNode } from "react";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import { DashIcon } from "./dash-icons";

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type ShellProps = {
  roleLabel: string;
  schoolName: string;
  subtitle: string;
  adminDay: AdminDayOverview | null;
  chips?: ReactNode;
  error: string;
  loading: boolean;
  loadingText: string;
  children: ReactNode;
};

export function StaffDashboardShell({
  roleLabel,
  schoolName,
  subtitle,
  adminDay,
  chips,
  error,
  loading,
  loadingText,
  children,
}: ShellProps) {
  return (
    <div className="dash-admin dash-admin--modern">
      <header className="dash-admin-hero dash-admin-hero--modern">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">
            {roleLabel} · {todayLabel()}
          </p>
          <h1 className="dash-admin-hero__title">{schoolName}</h1>
          <p className="dash-admin-hero__sub">{subtitle}</p>
        </div>
        <div className="dash-admin-hero__aside">
          {adminDay?.academicYear ? (
            <div className="dash-admin-hero__chip">
              <DashIcon name="calendar" className="dash-icon--sm" />
              <span>{adminDay.academicYear.name}</span>
              {adminDay.currentTerm ? (
                <span className="dash-admin-hero__chip-term">· {adminDay.currentTerm.name}</span>
              ) : null}
            </div>
          ) : null}
          {chips}
        </div>
      </header>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert" role="alert">
          {error}
        </section>
      ) : null}

      {loading ? (
        <div className="dash-loading dash-loading--pro">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{loadingText}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function StaffKpiGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label={label}>
      {children}
    </section>
  );
}

type BarRow = { label: string; value: number; color?: string };

export function BarChart({
  rows,
  emptyText,
}: {
  rows: BarRow[];
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="da-chart__empty">{emptyText}</p>;
  }

  return (
    <ul className="da-enroll">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="da-enroll__head">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
          <div className="da-enroll__track">
            <div
              className="da-enroll__fill"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: row.color ?? "var(--brand-teal)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LinkageRing({ linked, total }: { linked: number; total: number }) {
  const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
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
          <span className="da-finance__pct-label">linked</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot da-finance__dot--collected" />
          Linked <strong>{linked}</strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          Unlinked <strong>{total - linked}</strong>
        </li>
        <li className="da-finance__meta">{total} students on roll</li>
      </ul>
    </div>
  );
}

export function FinanceRing({
  collectedCents,
  outstandingCents,
  formatEtb,
}: {
  collectedCents: number;
  outstandingCents: number;
  formatEtb: (cents: number) => string;
}) {
  const total = collectedCents + outstandingCents;
  const pct = total > 0 ? Math.round((collectedCents / total) * 100) : 0;
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
          Collected <strong>{formatEtb(collectedCents)}</strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          Outstanding <strong>{formatEtb(outstandingCents)}</strong>
        </li>
      </ul>
    </div>
  );
}

export function AttendanceTodayRing({
  today,
}: {
  today: AdminAnalyticsOverview["attendanceToday"];
}) {
  const ringPct = today.rate ?? 0;
  const ringDeg = today.marked > 0 ? (ringPct / 100) * 360 : 0;

  return (
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
  );
}

export function AttendanceTrendChart({
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

export function GradeAttendanceBars({
  grades,
}: {
  grades: AdminAnalyticsOverview["gradeAttendance"];
}) {
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

export function enrollmentByClass(students: Array<{
  grade: { name: string };
  section: { name: string } | null;
}>) {
  const byGrade = new Map<string, number>();
  for (const s of students) {
    const label = s.section ? `${s.grade.name} · ${s.section.name}` : s.grade.name;
    byGrade.set(label, (byGrade.get(label) ?? 0) + 1);
  }
  return [...byGrade.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
