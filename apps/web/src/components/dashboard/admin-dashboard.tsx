"use client";

import Link from "next/link";
import type { Announcement, SubscriptionStatus } from "@/lib/api";
import { TrialBanner } from "@/components/trial-banner";
import { formatEtb, type FinanceAnalytics } from "@/lib/finance";
import type { AttendanceAnalytics } from "@/lib/attendance";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { AdminTodayOverview } from "@/components/dashboard/today-overview";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";

const QUICK_ACTIONS: {
  href: string;
  label: string;
  desc: string;
  icon: DashIconName;
}[] = [
  { href: "/admin/students", label: "Students", desc: "Admit & records", icon: "students" },
  { href: "/admin/attendance", label: "Attendance", desc: "Mark & reports", icon: "attendance" },
  { href: "/admin/results", label: "Results", desc: "Grades & cards", icon: "results" },
  { href: "/admin/finance", label: "Finance", desc: "Fees & payments", icon: "finance" },
  { href: "/admin/announcements", label: "Announce", desc: "Reach families", icon: "announcements" },
  { href: "/admin/settings", label: "Settings", desc: "School profile", icon: "settings" },
];

type Props = {
  schoolName: string;
  subscription: SubscriptionStatus | null;
  adminDay: AdminDayOverview | null;
  attendanceAnalytics: AttendanceAnalytics | null;
  financeAnalytics: FinanceAnalytics | null;
  announcements: Announcement[];
  dashboard: Record<string, string | number> | null;
  isPrincipalView: boolean;
  canViewFinance: boolean;
  error: string;
};

function formatDate(iso: string) {
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

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function AdminDashboard({
  schoolName,
  subscription,
  adminDay,
  attendanceAnalytics,
  financeAnalytics,
  announcements,
  dashboard,
  isPrincipalView,
  canViewFinance,
  error,
}: Props) {
  const attRate =
    attendanceAnalytics?.todayRate ??
    adminDay?.attendance.rate ??
    null;
  const teachers =
    adminDay?.staff.teachersTotal ??
    (typeof dashboard?.totalTeachers === "number" ? dashboard.totalTeachers : null);
  const activeUsers =
    typeof dashboard?.activeUsers === "number" ? dashboard.activeUsers : null;

  return (
    <div className="dash-admin">
      <header className="dash-admin-hero">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">{todayLabel()}</p>
          <h1 className="dash-admin-hero__title">
            {isPrincipalView ? `${schoolName} overview` : `Good day — ${schoolName}`}
          </h1>
          <p className="dash-admin-hero__sub">
            {isPrincipalView
              ? "Read-only insight across attendance and finance."
              : "Your school command center for attendance, results, fees, and family updates."}
          </p>
        </div>
        {adminDay?.academicYear ? (
          <div className="dash-admin-hero__chip">
            <DashIcon name="calendar" className="dash-icon--sm" />
            <span>{adminDay.academicYear.name}</span>
            {adminDay.currentTerm ? (
              <span className="dash-admin-hero__chip-term">· {adminDay.currentTerm.name}</span>
            ) : null}
          </div>
        ) : null}
      </header>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert" role="alert">
          {error}
        </section>
      ) : null}

      {subscription && !isPrincipalView ? <TrialBanner subscription={subscription} /> : null}

      {isPrincipalView ? (
        <section className="dash-admin-banner dash-admin-banner--muted">
          <DashIcon name="alert" className="dash-icon--md" />
          <div>
            <strong>Principal view</strong>
            <p>Registrars and teachers manage day-to-day records. Use the panels below for live metrics.</p>
          </div>
        </section>
      ) : null}

      <section className="dash-admin-kpis" aria-label="Key metrics">
        <article className="dash-admin-kpi">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="attendance" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Attendance today</p>
            <p className="dash-admin-kpi__value">{attRate != null ? `${attRate}%` : "—"}</p>
            {attendanceAnalytics ? (
              <p className="dash-admin-kpi__hint">
                {attendanceAnalytics.markedToday} marked · {attendanceAnalytics.absentToday} absent
              </p>
            ) : null}
          </div>
        </article>

        {canViewFinance && financeAnalytics ? (
          <article className="dash-admin-kpi">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
              <DashIcon name="finance" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Collected</p>
              <p className="dash-admin-kpi__value">{formatEtb(financeAnalytics.collectedCents)}</p>
              <p className="dash-admin-kpi__hint">
                {formatEtb(financeAnalytics.outstandingCents)} outstanding
              </p>
            </div>
          </article>
        ) : (
          <article className="dash-admin-kpi">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
              <DashIcon name="announcements" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Announcements</p>
              <p className="dash-admin-kpi__value">{announcements.length}</p>
              <p className="dash-admin-kpi__hint">Published to campus</p>
            </div>
          </article>
        )}

        <article className="dash-admin-kpi">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="teachers" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Teachers</p>
            <p className="dash-admin-kpi__value">{teachers ?? "—"}</p>
            {adminDay ? (
              <p className="dash-admin-kpi__hint">{adminDay.staff.classesActive} classes active</p>
            ) : null}
          </div>
        </article>

        <article className="dash-admin-kpi">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
            <DashIcon name="users" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Active users</p>
            <p className="dash-admin-kpi__value">{activeUsers ?? "—"}</p>
            {adminDay?.academics.pendingResultApprovals ? (
              <p className="dash-admin-kpi__hint">
                {adminDay.academics.pendingResultApprovals} results pending approval
              </p>
            ) : (
              <p className="dash-admin-kpi__hint">Staff & family portals</p>
            )}
          </div>
        </article>
      </section>

      {!isPrincipalView ? (
        <section className="dash-admin-quick" aria-label="Quick actions">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="dash-admin-quick__card">
              <span className="dash-admin-quick__icon">
                <DashIcon name={action.icon} />
              </span>
              <span className="dash-admin-quick__label">{action.label}</span>
              <span className="dash-admin-quick__desc">{action.desc}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {adminDay ? <AdminTodayOverview day={adminDay} /> : null}

      <div className="dash-admin-bento">
        <article className="dash-admin-panel">
          <div className="dash-admin-panel__head">
            <h2 className="dash-admin-panel__title">
              <DashIcon name="attendance" className="dash-icon--sm" />
              Attendance
            </h2>
            <Link href="/admin/attendance" className="dash-admin-panel__link">
              Open <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </div>
          {attendanceAnalytics ? (
            <div className="dash-admin-metrics">
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">
                  {attendanceAnalytics.todayRate != null ? `${attendanceAnalytics.todayRate}%` : "—"}
                </span>
                <span className="dash-admin-metric__label">Today</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{attendanceAnalytics.markedToday}</span>
                <span className="dash-admin-metric__label">Marked</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{attendanceAnalytics.absentToday}</span>
                <span className="dash-admin-metric__label">Absent</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{attendanceAnalytics.totalStudents}</span>
                <span className="dash-admin-metric__label">Students</span>
              </div>
            </div>
          ) : (
            <p className="dash-admin-panel__empty">No attendance data yet.</p>
          )}
        </article>

        <article className="dash-admin-panel">
          <div className="dash-admin-panel__head">
            <h2 className="dash-admin-panel__title">
              <DashIcon name="finance" className="dash-icon--sm" />
              {canViewFinance ? "Finance" : "Results"}
            </h2>
            <Link
              href={canViewFinance ? "/admin/finance" : "/admin/results"}
              className="dash-admin-panel__link"
            >
              Open <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </div>
          {canViewFinance && financeAnalytics ? (
            <div className="dash-admin-metrics">
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">
                  {formatEtb(financeAnalytics.outstandingCents)}
                </span>
                <span className="dash-admin-metric__label">Outstanding</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{financeAnalytics.paidStudents}</span>
                <span className="dash-admin-metric__label">Paid</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{financeAnalytics.unpaidStudents}</span>
                <span className="dash-admin-metric__label">Unpaid</span>
              </div>
              <div className="dash-admin-metric">
                <span className="dash-admin-metric__value">{financeAnalytics.overdueFeesCount}</span>
                <span className="dash-admin-metric__label">Overdue</span>
              </div>
            </div>
          ) : (
            <p className="dash-admin-panel__empty">
              {canViewFinance ? "Finance data will appear here." : "Open results to manage grades."}
            </p>
          )}
        </article>

        <article className="dash-admin-panel dash-admin-panel--wide">
          <div className="dash-admin-panel__head">
            <h2 className="dash-admin-panel__title">
              <DashIcon name="announcements" className="dash-icon--sm" />
              Announcements
            </h2>
            <Link href="/admin/announcements" className="dash-admin-panel__link">
              Manage <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="dash-admin-panel__empty-block">
              <p>No announcements yet.</p>
              {!isPrincipalView ? (
                <Link href="/admin/announcements" className="dash-admin-btn">
                  Post announcement
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="dash-admin-feed">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="dash-admin-feed__item">
                  <div>
                    <p className="dash-admin-feed__title">{item.title}</p>
                    <p className="dash-admin-feed__meta">{formatDate(item.createdAt)}</p>
                  </div>
                  {item.body ? (
                    <p className="dash-admin-feed__body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
