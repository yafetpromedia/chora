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
  type AttendanceAnalytics,
  type AttendanceSummary,
} from "@/lib/attendance";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { StaffRoleDashboard } from "@/components/dashboard/staff-role-dashboard";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { getAdminAnalytics, type AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { hasPermission, Permission } from "@/lib/permissions";
import { getStaffWorkspaceTitle } from "@/lib/staff-workspace";
import { listLibraryResources, type LibraryResource } from "@/lib/library";
import { readSchoolBrand } from "@/lib/school-brand";
import { BRAND_NAME } from "@/lib/brand";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

type Props = {
  role: UserRole;
};

type StatConfig = {
  labelKey: string;
  icon: DashIconName;
};

const STAT_LABELS: Record<string, StatConfig> = {
  schoolId: { labelKey: "dash.schoolId", icon: "building" },
  announcements: { labelKey: "dash.announcements", icon: "announcements" },
  unreadNotifications: { labelKey: "dash.unread", icon: "alert" },
  activeUsers: { labelKey: "dash.activeUsers", icon: "users" },
  totalTeachers: { labelKey: "dash.teachersStat", icon: "teachers" },
  classesToday: { labelKey: "dash.classesToday", icon: "calendar" },
  pendingGrades: { labelKey: "dash.pendingGrades", icon: "results" },
  attendanceRate: { labelKey: "dash.attendance", icon: "attendance" },
  upcomingAssignments: { labelKey: "dash.assignments", icon: "assign" },
  children: { labelKey: "dash.children", icon: "students" },
  alerts: { labelKey: "dash.alerts", icon: "alert" },
};

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function formatDate(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function attendanceStatusLabel(status: string, t: (key: string) => string) {
  const s = status.toUpperCase();
  if (s === "PRESENT") return t("common.present");
  if (s === "ABSENT") return t("common.absent");
  if (s === "LATE") return t("common.late");
  if (s === "EXCUSED") return t("common.excused");
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatStatValue(key: string, value: string | number) {
  if (key === "attendanceRate" && typeof value === "number") {
    return `${value}%`;
  }
  return String(value);
}

export function RoleDashboard({ role }: Props) {
  const { t, locale } = useLocale();
  const [workspaceRole] = useState<UserRole>(() => {
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
  const [studentResources, setStudentResources] = useState<LibraryResource[]>([]);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalyticsOverview | null>(null);
  const router = useRouter();

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard)
      .filter(([key]) => key !== "day")
      .map(([key, value]) => {
        const config = STAT_LABELS[key];
        return {
          key,
          value,
          label: config
            ? t(config.labelKey)
            : key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
          icon: (config?.icon ?? "overview") as DashIconName,
        };
      });
  }, [dashboard, t]);

  useEffect(() => {
    const load = async () => {
      const soft = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await promise;
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message === "Session expired" || message === "Not authenticated") {
            throw err;
          }
          return fallback;
        }
      };

      const withRetry = async <T,>(fn: () => Promise<T>, attempts = 2): Promise<T> => {
        let lastError: unknown;
        for (let i = 0; i < attempts; i++) {
          try {
            return await fn();
          } catch (err) {
            lastError = err;
            const message = err instanceof Error ? err.message : "";
            const retryable =
              message.includes("Request failed: 5") ||
              message.includes("API is unavailable") ||
              message.includes("Could not reach the server");
            if (!retryable || i === attempts - 1) throw err;
            await new Promise((r) => setTimeout(r, 600 * (i + 1)));
          }
        }
        throw lastError;
      };

      try {
        setError("");
        const dashboardData = await withRetry(() =>
          apiFetch<
            Record<string, string | number> & {
              day?: AdminDayOverview;
            }
          >("/dashboards/me"),
        );
        const announcementData = await soft(
          apiFetch<Announcement[]>("/announcements"),
          [] as Announcement[],
        );
        setDashboard(dashboardData);
        setAnnouncements(announcementData);
        if (dashboardData.day?.kind === "admin_day") {
          setAdminDay(dashboardData.day);
        }

        if (role === "student") {
          const [attendanceData, resultsData, summary, resources] = await Promise.all([
            soft(apiFetch<AttendanceRecord[]>("/attendance/student"), [] as AttendanceRecord[]),
            soft(apiFetch<ResultRecord[]>("/results/student"), [] as ResultRecord[]),
            soft(getAttendanceSummary(), null),
            soft(
              listLibraryResources({ status: "PUBLISHED", limit: 4 }),
              [] as LibraryResource[],
            ),
          ]);
          setAttendance(attendanceData);
          setResults(resultsData);
          setAttendanceSummary(summary);
          setStudentResources(resources);
        }

        if (canViewAdminDashboard) {
          if (isPrincipalView) {
            const [schoolRes, analyticsData] = await Promise.all([
              soft(apiFetch<{ school: SchoolInfo | null }>("/schools/me"), {
                school: null,
              }),
              soft(getAdminAnalytics(), null),
            ]);
            if (schoolRes.school) setSchoolInfo(schoolRes.school);
            if (analyticsData) setAdminAnalytics(analyticsData);
          } else {
            const [schoolRes, subscriptionData, setupStatus, analyticsData] =
              await Promise.all([
                apiFetch<{ school: SchoolInfo | null }>("/schools/me"),
                getSchoolSubscription(),
                getSetupStatus(),
                soft(getAdminAnalytics(), null),
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

  if (loading) {
    return (
      <div className="dash-loading dash-loading--pro">
        <span className="dash-loading-spinner" aria-hidden />
        <p>{t("dash.loadingWorkspace")}</p>
      </div>
    );
  }

  const schoolName = schoolInfo?.name ?? readSchoolBrand().name ?? BRAND_NAME;

  if (canViewAdminDashboard) {
    return (
      <DashboardShell role={workspaceRole} title={t("dash.dashboardTitle")}>
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
          <p className="dash-welcome-eyebrow">{t("dash.welcomeBack")}</p>
          <h2>{t("dash.classroomGlance")}</h2>
        </div>
      </section>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert">{error}</section>
      ) : null}

      {stats.length > 0 ? (
        <section className="dash-stats dash-stats--modern" aria-label={t("dash.keyMetrics")}>
          {stats.map((stat) => (
            <article key={stat.key} className="dash-stat dash-stat--modern">
              <div className="dash-stat-icon" aria-hidden>
                <DashIcon name={stat.icon} className="dash-icon--sm" />
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
            <h2 className="dash-panel-title">{t("dash.attendance")}</h2>
            {attendanceAnalytics ? (
              <span className="dash-panel-badge">
                {attendanceAnalytics.todayRate != null
                  ? t("dash.rateToday", { rate: attendanceAnalytics.todayRate })
                  : t("dash.today")}
              </span>
            ) : attendanceSummary ? (
              <span className="dash-panel-badge">
                {t("dash.ratePct", { rate: attendanceSummary.rate })}
              </span>
            ) : (
              <span className="dash-panel-badge">
                {t("dash.recordsCount", { count: attendance.length })}
              </span>
            )}
          </div>

          {attendanceAnalytics ? (
            <div className="att-stats-grid">
              <div className="att-stat">
                <span className="att-stat-value">
                  {attendanceAnalytics.todayRate != null ? `${attendanceAnalytics.todayRate}%` : "—"}
                </span>
                <span className="att-stat-label">{t("dash.today")}</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.markedToday}</span>
                <span className="att-stat-label">{t("dash.marked")}</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.absentToday}</span>
                <span className="att-stat-label">{t("common.absent")}</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{attendanceAnalytics.totalStudents}</span>
                <span className="att-stat-label">{t("dash.students")}</span>
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
                <li>
                  {t("dash.presentCount", { count: attendanceSummary.counts.present })}
                </li>
                <li>
                  {t("dash.absentCount", { count: attendanceSummary.counts.absent })}
                </li>
                <li>{t("dash.lateCount", { count: attendanceSummary.counts.late })}</li>
                <li>
                  {t("dash.excusedCount", { count: attendanceSummary.counts.excused })}
                </li>
              </ul>
            </div>
          ) : attendance.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon" aria-hidden>
                <DashIcon name="attendance" />
              </div>
              <p>{t("dash.noAttendanceRecords")}</p>
              <Link href="/teacher/attendance" className="dash-link-btn">
                {t("dash.markAttendance")}
              </Link>
            </div>
          ) : (
            <ul className="dash-list">
              {attendance.map((row) => (
                <li key={row.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{attendanceStatusLabel(row.status, t)}</p>
                    <p className="dash-list-meta">{formatDate(row.date, locale)}</p>
                  </div>
                  <span className="dash-tag">{attendanceStatusLabel(row.status, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">{t("dash.results")}</h2>
            <span className="dash-panel-badge">
              {t("dash.subjectsN", { count: results.length })}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon" aria-hidden>
                <DashIcon name="results" />
              </div>
              <p>{t("dash.noResultsYet")}</p>
              <Link href="/teacher/results" className="dash-link-btn">
                {t("dash.enterScores")}
              </Link>
            </div>
          ) : (
            <ul className="dash-list">
              {results.map((row) => (
                <li key={row.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{row.subject}</p>
                    <p className="dash-list-meta">
                      {t("dash.studentIdLabel", { id: row.studentId })}
                    </p>
                  </div>
                  <span className="dash-score">{row.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <article className="dash-panel dash-panel--flat">
        <div className="dash-panel-head">
          <h2 className="dash-panel-title">{t("dash.announcements")}</h2>
          <span className="dash-panel-badge">
            {t("dash.announcementsTotal", { count: announcements.length })}
          </span>
        </div>
        {announcements.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon" aria-hidden>
              <DashIcon name="announcements" />
            </div>
            <p>{t("dash.noAnnouncements")}</p>
          </div>
        ) : (
          <ul className="dash-list">
            {announcements.map((item) => (
              <li key={item.id} className="dash-list-item dash-list-item--stack">
                <div>
                  <p className="dash-list-title">{item.title}</p>
                  <p className="dash-list-meta">{formatDate(item.createdAt, locale)}</p>
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
