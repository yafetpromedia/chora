"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Announcement,
  apiFetch,
  AttendanceRecord,
  getSchoolSubscription,
  ResultRecord,
  type SchoolInfo,
  type SubscriptionStatus,
} from "@/lib/api";
import { getFinanceAnalytics, type FinanceAnalytics } from "@/lib/finance";
import { getSetupStatus } from "@/lib/school-setup";
import { AUTH_ROLE_KEY, UserRole } from "@/lib/auth";
import {
  getAttendanceAnalytics,
  getAttendanceSummary,
  listParentNotifications,
  type AttendanceAnalytics,
  type AttendanceSummary,
  type ParentNotification,
} from "@/lib/attendance";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { StaffRoleDashboard } from "@/components/dashboard/staff-role-dashboard";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { getAdminAnalytics, type AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ParentTodayOverview } from "@/components/dashboard/today-overview";
import { StudentIdCardPanel } from "@/components/students/student-id-card-panel";
import type { AdminDayOverview, ParentDayOverview } from "@/lib/dashboard-day";
import { hasPermission, Permission } from "@/lib/permissions";
import { getStaffWorkspaceTitle } from "@/lib/staff-workspace";
import { listLibraryResources, type LibraryResource } from "@/lib/library";
import { readSchoolBrand } from "@/lib/school-brand";

type Props = {
  role: UserRole;
};

type StatConfig = {
  label: string;
  icon: string;
};

const STAT_LABELS: Record<string, StatConfig> = {
  schoolId: { label: "School ID", icon: "🏫" },
  announcements: { label: "Announcements", icon: "📢" },
  unreadNotifications: { label: "Unread", icon: "🔔" },
  activeUsers: { label: "Active users", icon: "👥" },
  totalTeachers: { label: "Teachers", icon: "👨‍🏫" },
  classesToday: { label: "Classes today", icon: "📅" },
  pendingGrades: { label: "Pending grades", icon: "📝" },
  attendanceRate: { label: "Attendance", icon: "✓" },
  upcomingAssignments: { label: "Assignments", icon: "📚" },
  children: { label: "Children", icon: "👨‍👩‍👧" },
  alerts: { label: "Alerts", icon: "⚠️" },
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

function formatStatValue(key: string, value: string | number) {
  if (key === "attendanceRate" && typeof value === "number") {
    return `${value}%`;
  }
  return String(value);
}

export function RoleDashboard({ role }: Props) {
  const [workspaceRole, setWorkspaceRole] = useState<UserRole>(() => {
    if (typeof window === "undefined") return role;
    return (localStorage.getItem(AUTH_ROLE_KEY) as UserRole | null) ?? role;
  });
  const canViewAdminDashboard =
    workspaceRole === "admin" && hasPermission(Permission.SCHOOL_DASHBOARD);
  const isPrincipalView =
    canViewAdminDashboard && !hasPermission(Permission.STUDENTS_CREATE);
  const canViewFinance = hasPermission(Permission.FINANCE_READ);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, string | number> | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [financeAnalytics, setFinanceAnalytics] = useState<FinanceAnalytics | null>(null);
  const [parentAlerts, setParentAlerts] = useState<ParentNotification[]>([]);
  const [studentResources, setStudentResources] = useState<LibraryResource[]>([]);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalyticsOverview | null>(null);
  const [parentDay, setParentDay] = useState<ParentDayOverview | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_ROLE_KEY) as UserRole | null;
    if (stored && stored !== workspaceRole) setWorkspaceRole(stored);
  }, [workspaceRole]);

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard)
      .filter(([key]) => key !== "day")
      .map(([key, value]) => ({
      key,
      value,
      ...(STAT_LABELS[key] ?? {
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        icon: "•",
      }),
    }));
  }, [dashboard]);

  useEffect(() => {
    const load = async () => {
      try {
        const dashboardData = await apiFetch<
          Record<string, string | number> & {
            day?: AdminDayOverview | ParentDayOverview;
          }
        >("/dashboards/me");
        const announcementData = await apiFetch<Announcement[]>("/announcements");
        setDashboard(dashboardData);
        setAnnouncements(announcementData);
        if (dashboardData.day?.kind === "admin_day") {
          setAdminDay(dashboardData.day);
        }
        if (dashboardData.day?.kind === "parent_day") {
          setParentDay(dashboardData.day);
        }

        if (role === "student") {
          const [attendanceData, resultsData, summary, resources] = await Promise.all([
            apiFetch<AttendanceRecord[]>("/attendance/student"),
            apiFetch<ResultRecord[]>("/results/student").catch(() => [] as ResultRecord[]),
            getAttendanceSummary(),
            listLibraryResources({ status: "PUBLISHED", limit: 4 }).catch(
              () => [] as LibraryResource[],
            ),
          ]);
          setAttendance(attendanceData);
          setResults(resultsData);
          setAttendanceSummary(summary);
          setStudentResources(resources);
        }

        if (role === "parent") {
          const [summary, alerts] = await Promise.all([
            getAttendanceSummary(),
            listParentNotifications(),
          ]);
          setAttendanceSummary(summary);
          setParentAlerts(alerts);
        }

        if (canViewAdminDashboard) {
          if (isPrincipalView) {
            const [schoolRes, analyticsData] = await Promise.all([
              apiFetch<{ school: SchoolInfo | null }>("/schools/me").catch(() => ({
                school: null,
              })),
              getAdminAnalytics().catch(() => null),
            ]);
            if (schoolRes.school) setSchoolInfo(schoolRes.school);
            if (analyticsData) setAdminAnalytics(analyticsData);
          } else {
            const [schoolRes, subscriptionData, setupStatus, analyticsData] =
              await Promise.all([
                apiFetch<{ school: SchoolInfo | null }>("/schools/me"),
                getSchoolSubscription(),
                getSetupStatus(),
                getAdminAnalytics().catch(() => null),
              ]);

            if (!setupStatus.setupComplete) {
              router.replace("/admin/setup");
              return;
            }

            if (schoolRes.school) setSchoolInfo(schoolRes.school);
            setSubscription(subscriptionData);
            if (analyticsData) setAdminAnalytics(analyticsData);
          }
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Load failed";
        if (message === "Session expired" || message === "Not authenticated") {
          router.replace("/login");
          return;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [role, router, canViewAdminDashboard, isPrincipalView]);

  useEffect(() => {
    if (parentDay?.children.length) {
      setSelectedChildId(parentDay.children[0].profileId);
    }
  }, [parentDay]);

  if (loading) {
    return (
      <div className="dash-loading dash-loading--pro">
        <span className="dash-loading-spinner" aria-hidden />
        <p>Loading your workspace…</p>
      </div>
    );
  }

  const schoolName = schoolInfo?.name ?? readSchoolBrand().name ?? "CampusOne";

  if (canViewAdminDashboard) {
    return (
      <DashboardShell role={workspaceRole} title="Dashboard">
        <AdminDashboard
          schoolName={schoolName}
          subscription={subscription}
          adminDay={adminDay}
          analytics={adminAnalytics}
          announcements={announcements}
          isPrincipalView={isPrincipalView}
          canViewFinance={canViewFinance}
          error={error}
        />
      </DashboardShell>
    );
  }

  if (workspaceRole === "admin" || workspaceRole === "staff") {
    return (
      <DashboardShell role={workspaceRole} title={getStaffWorkspaceTitle()}>
        <StaffRoleDashboard announcements={announcements} error={error} />
      </DashboardShell>
    );
  }

  if (role === "student") {
    return (
      <StudentDashboard
        schoolName={schoolName}
        dashboard={dashboard}
        attendanceSummary={attendanceSummary}
        attendance={attendance}
        results={results}
        announcements={announcements}
        studentResources={studentResources}
        error={error}
      />
    );
  }

  return (
    <DashboardShell role={role}>
      <div className="co-page co-page__body">
      <section className="dash-welcome dash-welcome--modern">
        <div>
          <p className="dash-welcome-eyebrow">Welcome back</p>
          <h2>
            {role === "teacher"
              ? "Your classroom at a glance"
              : `Here’s what’s happening at ${schoolName}`}
          </h2>
        </div>
      </section>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert">{error}</section>
      ) : null}

      {role === "parent" && parentDay && parentDay.children.length > 1 ? (
        <div className="sid-my-panel__selector att-field no-print">
          <span>Select child</span>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            {parentDay.children.map((child) => (
              <option key={child.profileId} value={child.profileId}>
                {child.name} · {child.grade}
                {child.section ? `-${child.section}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {role === "parent" && parentDay && parentDay.children.length > 0 ? (
        <StudentIdCardPanel
          key={selectedChildId || parentDay.children[0]?.profileId}
          source="child"
          profileId={selectedChildId || parentDay.children[0]?.profileId}
          className="sid-my-panel--wide"
          title={
            parentDay.children.length > 1
              ? "Child ID card"
              : `ID card · ${parentDay.children[0]?.name ?? "Student"}`
          }
        />
      ) : null}

      {role === "parent" && parentDay ? <ParentTodayOverview day={parentDay} /> : null}

      {stats.length > 0 ? (
        <section className="dash-stats dash-stats--modern" aria-label="Key metrics">
          {stats.map((stat) => (
            <article key={stat.key} className="dash-stat dash-stat--modern">
              <div className="dash-stat-icon" aria-hidden>
                {stat.icon}
              </div>
              <p className="dash-stat-label">{stat.label}</p>
              <p className="dash-stat-value">{formatStatValue(stat.key, stat.value)}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="dash-grid-2">
        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Attendance</h2>
            {attendanceAnalytics ? (
              <span className="dash-panel-badge">
                {attendanceAnalytics.todayRate != null
                  ? `${attendanceAnalytics.todayRate}% today`
                  : "Today"}
              </span>
            ) : attendanceSummary ? (
              <span className="dash-panel-badge">{attendanceSummary.rate}% rate</span>
            ) : (
              <span className="dash-panel-badge">{attendance.length} records</span>
            )}
          </div>

          {attendanceAnalytics ? (
            <div className="att-stats-grid">
              <div className="att-stat">
                <span className="att-stat-value">
                  {attendanceAnalytics.todayRate != null ? `${attendanceAnalytics.todayRate}%` : "—"}
                </span>
                <span className="att-stat-label">Today</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.markedToday}</span>
                <span className="att-stat-label">Marked</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.absentToday}</span>
                <span className="att-stat-label">Absent</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.totalStudents}</span>
                <span className="att-stat-label">Students</span>
              </div>
            </div>
          ) : attendanceSummary ? (
            <div className="att-summary-block">
              <p className="att-summary-rate">{attendanceSummary.rate}%</p>
              <p className="tch-meta dash-panel-desc">
                {attendanceSummary.student.name} · {attendanceSummary.student.grade}
                {attendanceSummary.student.section ? `-${attendanceSummary.student.section}` : ""}
              </p>
              <ul className="att-summary-counts">
                <li>Present: {attendanceSummary.counts.present}</li>
                <li>Absent: {attendanceSummary.counts.absent}</li>
                <li>Late: {attendanceSummary.counts.late}</li>
                <li>Excused: {attendanceSummary.counts.excused}</li>
              </ul>
            </div>
          ) : attendance.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon" aria-hidden>
                📋
              </div>
              <p>No attendance records yet.</p>
              {role === "teacher" ? (
                <Link href="/teacher/attendance" className="dash-link-btn">
                  Mark attendance
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="dash-list">
              {attendance.map((row) => (
                <li key={row.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{row.status}</p>
                    <p className="dash-list-meta">{formatDate(row.date)}</p>
                  </div>
                  <span className="dash-tag">{row.status}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Results</h2>
            <span className="dash-panel-badge">{results.length} subjects</span>
          </div>

          {results.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon" aria-hidden>
                📊
              </div>
              <p>No results published yet.</p>
              {role === "teacher" ? (
                <Link href="/teacher/results" className="dash-link-btn">
                  Enter scores
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="dash-list">
              {results.map((row) => (
                <li key={row.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{row.subject}</p>
                    <p className="dash-list-meta">Student {row.studentId}</p>
                  </div>
                  <span className="dash-score">{row.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {role === "parent" && parentAlerts.length > 0 ? (
        <article className="dash-panel dash-panel--flat dash-alert-panel">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Attendance alerts</h2>
            <span className="dash-panel-badge">{parentAlerts.length}</span>
          </div>
          <ul className="dash-list">
            {parentAlerts.slice(0, 5).map((n) => (
              <li key={n.id} className="dash-list-item dash-list-item--stack">
                <div>
                  <p className="dash-list-title">{n.title}</p>
                  <p className="dash-list-meta dash-announce-body">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="dash-panel dash-panel--flat">
        <div className="dash-panel-head">
          <h2 className="dash-panel-title">Announcements</h2>
          <span className="dash-panel-badge">{announcements.length} total</span>
        </div>
        {announcements.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon" aria-hidden>
              📣
            </div>
            <p>No announcements yet.</p>
            null
          </div>
        ) : (
          <ul className="dash-list">
            {announcements.map((item) => (
              <li key={item.id} className="dash-list-item dash-list-item--stack">
                <div>
                  <p className="dash-list-title">{item.title}</p>
                  <p className="dash-list-meta">{formatDate(item.createdAt)}</p>
                  {item.body ? <p className="dash-announce-body">{item.body}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
      </div>
    </DashboardShell>
  );
}
