"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Announcement,
  apiFetch,
  AttendanceRecord,
  ResultRecord,
  type SchoolInfo,
} from "@/lib/api";
import {
  AUTH_ROLE_KEY,
  AUTH_SCHOOL_JOIN_CODE_KEY,
  AUTH_SCHOOL_NAME_KEY,
  AUTH_TOKEN_KEY,
  clearSessionStorage,
  UserRole,
} from "@/lib/auth";
import { AdminInvitePanel } from "@/components/auth/admin-invite-panel";
import { useRouter } from "next/navigation";

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

const ROLE_TITLES: Record<UserRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, string | number> | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const router = useRouter();

  const studentId = useMemo(() => "3", []);

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard).map(([key, value]) => ({
      key,
      value,
      ...(STAT_LABELS[key] ?? {
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        icon: "•",
      }),
    }));
  }, [dashboard]);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedRole = localStorage.getItem(AUTH_ROLE_KEY);

    if (!token || !storedRole) {
      router.replace("/login");
      return;
    }

    if (storedRole !== role) {
      router.replace(`/${storedRole}`);
      return;
    }

    const load = async () => {
      try {
        const requests: Promise<unknown>[] = [
          apiFetch<Record<string, string | number>>("/dashboards/me"),
          apiFetch<AttendanceRecord[]>(`/attendance/student?studentId=${studentId}`),
          apiFetch<ResultRecord[]>(`/results/student?studentId=${studentId}`),
          apiFetch<Announcement[]>("/announcements"),
        ];

        if (role === "admin") {
          requests.push(apiFetch<{ school: SchoolInfo | null }>("/schools/me"));
        }

        const [dashboardData, attendanceData, resultsData, announcementData, schoolRes] =
          await Promise.all(requests);

        setDashboard(dashboardData as Record<string, string | number>);
        setAttendance(attendanceData as AttendanceRecord[]);
        setResults(resultsData as ResultRecord[]);
        setAnnouncements(announcementData as Announcement[]);

        if (role === "admin" && schoolRes) {
          const data = schoolRes as { school: SchoolInfo | null };
          if (data.school) {
            setSchoolInfo(data.school);
          }
        } else {
          const joinCode = localStorage.getItem(AUTH_SCHOOL_JOIN_CODE_KEY);
          const name = localStorage.getItem(AUTH_SCHOOL_NAME_KEY);
          if (joinCode && name) {
            setSchoolInfo({ id: "", name, joinCode });
          }
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Load failed";
        if (message === "Session expired" || message === "Not authenticated") {
          clearSessionStorage();
          router.replace("/login");
          return;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [role, router, studentId]);

  const logout = () => {
    clearSessionStorage();
    router.push("/login");
  };

  const copyJoinCode = () => {
    if (!schoolInfo?.joinCode) return;
    void navigator.clipboard.writeText(schoolInfo.joinCode);
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <span className="dash-loading-spinner" aria-hidden />
        Loading your dashboard…
      </div>
    );
  }

  const schoolName = schoolInfo?.name ?? "CampusOne";

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar" aria-label="Dashboard navigation">
        <div className="dash-sidebar-brand">
          <span className="logo-mark" aria-hidden>
            C1
          </span>
          <span>CampusOne</span>
        </div>
        <nav className="dash-nav">
          <span className="dash-nav-item dash-nav-item--active">
            <span className="dash-nav-dot" aria-hidden />
            Overview
          </span>
          <span className="dash-nav-item">Attendance</span>
          <span className="dash-nav-item">Results</span>
          <span className="dash-nav-item">Announcements</span>
        </nav>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar-brand">
            <span className="logo-mark" aria-hidden>
              C1
            </span>
            <div>
              <h1 className="dash-topbar-title" style={{ fontSize: "1.1rem" }}>
                {ROLE_TITLES[role]}
              </h1>
              <p className="dash-topbar-sub">CampusOne</p>
            </div>
          </div>
          <div className="dash-topbar-heading">
            <h1 className="dash-topbar-title">{ROLE_TITLES[role]} dashboard</h1>
            <p className="dash-topbar-sub">
              {schoolName} · Attendance, results & announcements
            </p>
          </div>
          <button type="button" onClick={logout} className="dash-logout">
            Log out
          </button>
        </header>

        <div className="dash-content">
          <section className="dash-welcome">
            <h2>Welcome back</h2>
            <p>
              {role === "admin"
                ? `Manage ${schoolName}, invite your team, and keep everyone in the loop.`
                : `Here’s what’s happening at ${schoolName} today.`}
            </p>
          </section>

          {error ? (
            <section className="auth-alert auth-alert--error" style={{ marginBottom: "1.25rem" }}>
              {error}
            </section>
          ) : null}

          {role === "admin" && schoolInfo ? (
            <>
              <section className="dash-panel" style={{ marginBottom: "1.25rem" }}>
                <div className="dash-panel-head">
                  <h2 className="dash-panel-title">School join code</h2>
                  <span className="dash-panel-badge">Share at /join</span>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--brand-muted)" }}>
                  Teachers, students, and parents can enter this code on the join page — or send
                  invitation links below.
                </p>
                <div className="dash-code-box">
                  <code className="dash-code">{schoolInfo.joinCode}</code>
                  <span style={{ fontSize: "0.9rem", color: "var(--brand-muted)" }}>
                    {schoolInfo.name}
                  </span>
                  <button type="button" className="dash-copy-btn" onClick={copyJoinCode}>
                    {codeCopied ? "Copied!" : "Copy code"}
                  </button>
                </div>
              </section>
              <AdminInvitePanel />
            </>
          ) : null}

          {stats.length > 0 ? (
            <section className="dash-stats" aria-label="Key metrics">
              {stats.map((stat) => (
                <article key={stat.key} className="dash-stat">
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
            <article className="dash-panel">
              <div className="dash-panel-head">
                <h2 className="dash-panel-title">Attendance</h2>
                <span className="dash-panel-badge">{attendance.length} records</span>
              </div>
              {attendance.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-icon" aria-hidden>
                    📋
                  </div>
                  <p>No attendance records yet.</p>
                </div>
              ) : (
                <ul className="dash-list">
                  {attendance.map((row) => (
                    <li key={row.id} className="dash-list-item">
                      <div>
                        <p className="dash-list-title">Student {row.studentId}</p>
                        <p className="dash-list-meta">{formatDate(row.date)}</p>
                      </div>
                      <span className="dash-tag">{row.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="dash-panel">
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

          <article className="dash-panel">
            <div className="dash-panel-head">
              <h2 className="dash-panel-title">Announcements</h2>
              <span className="dash-panel-badge">{announcements.length} total</span>
            </div>
            {announcements.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon" aria-hidden>
                  📣
                </div>
                <p>No announcements yet. Post one from the admin tools when ready.</p>
              </div>
            ) : (
              <ul className="dash-list">
                {announcements.map((item) => (
                  <li key={item.id} className="dash-list-item">
                    <div>
                      <p className="dash-list-title">{item.title}</p>
                      <p className="dash-list-meta">{formatDate(item.createdAt)}</p>
                      {item.body ? (
                        <p
                          style={{
                            margin: "0.35rem 0 0",
                            fontSize: "0.85rem",
                            color: "var(--brand-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {item.body}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
