"use client";

import Link from "next/link";
import { Announcement, AttendanceRecord, ResultRecord } from "@/lib/api";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  resolveLibraryAssetUrl,
  type LibraryResource,
} from "@/lib/library";
import type { AttendanceSummary } from "@/lib/attendance";

type Props = {
  schoolName: string;
  dashboard: Record<string, string | number> | null;
  attendanceSummary: AttendanceSummary | null;
  attendance: AttendanceRecord[];
  results: ResultRecord[];
  announcements: Announcement[];
  studentResources: LibraryResource[];
  error: string;
};

const QUICK_LINKS: {
  href: string;
  label: string;
  desc: string;
  icon: DashIconName;
}[] = [
  {
    href: "/student/results",
    label: "Results",
    desc: "View subject scores and report card",
    icon: "results",
  },
  {
    href: "/student/fees",
    label: "Fees",
    desc: "Check balance and payment history",
    icon: "fees",
  },
  {
    href: "/student/timetable",
    label: "Timetable",
    desc: "Today and weekly class schedule",
    icon: "calendar",
  },
  {
    href: "/student/library",
    label: "eLibrary",
    desc: "Learning resources and notes",
    icon: "library",
  },
  {
    href: "/student/id-card",
    label: "Campus ID",
    desc: "Your ID card and print view",
    icon: "profile",
  },
  {
    href: "/student/classwork",
    label: "Assignments",
    desc: "Homework and graded tasks",
    icon: "chart",
  },
];

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

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

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function StudentDashboard({
  schoolName,
  dashboard,
  attendanceSummary,
  attendance,
  results,
  announcements,
  studentResources,
  error,
}: Props) {
  const attendanceRate =
    typeof dashboard?.attendanceRate === "number"
      ? dashboard.attendanceRate
      : attendanceSummary?.rate ?? null;
  const upcomingAssignments =
    typeof dashboard?.upcomingAssignments === "number"
      ? dashboard.upcomingAssignments
      : 0;

  const recentAttendance =
    attendanceSummary?.recent?.length
      ? attendanceSummary.recent
      : attendance.slice(0, 5).map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status,
          reason: r.reason ?? null,
        }));

  const studentName = attendanceSummary?.student.name;

  return (
    <DashboardShell role="student" title="Student dashboard">
      <div className="stu-dash">
        {error ? (
          <div className="stu-dash__alert stu-dash__alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <header className="stu-dash__hero">
          <div className="stu-dash__hero-glow" aria-hidden />
          <div className="stu-dash__hero-inner">
            <div className="stu-dash__hero-main">
              <p className="stu-dash__eyebrow">Welcome back</p>
              <h2 className="stu-dash__hero-title">
                {studentName ? `Hi, ${studentName.split(" ")[0]}` : "Your student workspace"}
              </h2>
              <p className="stu-dash__hero-sub">
                {todayLabel()} · {schoolName}
              </p>
            </div>
            <div className="stu-dash__hero-stats">
              <div className="stu-dash__stat">
                <strong>{attendanceRate != null ? `${attendanceRate}%` : "—"}</strong>
                <span>Attendance</span>
              </div>
              <div className="stu-dash__stat">
                <strong>{results.length}</strong>
                <span>Subjects</span>
              </div>
              <div className="stu-dash__stat stu-dash__stat--accent">
                <strong>{upcomingAssignments}</strong>
                <span>Tasks</span>
              </div>
              <div className="stu-dash__stat">
                <strong>{announcements.length}</strong>
                <span>News</span>
              </div>
            </div>
          </div>
        </header>

        <section className="stu-dash__quick" aria-label="Quick access">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="stu-dash__quick-card">
              <span className="stu-dash__quick-icon" aria-hidden>
                <DashIcon name={link.icon} className="dash-icon--sm" />
              </span>
              <span className="stu-dash__quick-label">{link.label}</span>
              <span className="stu-dash__quick-desc">{link.desc}</span>
            </Link>
          ))}
        </section>

        <div className="stu-dash__grid">
          <article className="stu-dash__panel">
            <header className="stu-dash__panel-head">
              <div>
                <h3 className="stu-dash__panel-title">Attendance</h3>
                <p className="stu-dash__panel-sub">Your recent roll call record</p>
              </div>
              <Link href="/student/attendance" className="stu-dash__panel-link">
                Permission
              </Link>
            </header>

            {attendanceSummary ? (
              <div className="stu-dash__att-summary">
                <div className="stu-dash__att-rate">
                  <strong>{attendanceSummary.rate}%</strong>
                  <span>Overall rate</span>
                </div>
                <ul className="stu-dash__att-counts">
                  <li>
                    <span>Present</span>
                    <strong>{attendanceSummary.counts.present}</strong>
                  </li>
                  <li>
                    <span>Absent</span>
                    <strong>{attendanceSummary.counts.absent}</strong>
                  </li>
                  <li>
                    <span>Late</span>
                    <strong>{attendanceSummary.counts.late}</strong>
                  </li>
                  <li>
                    <span>Excused</span>
                    <strong>{attendanceSummary.counts.excused}</strong>
                  </li>
                </ul>
              </div>
            ) : null}

            {recentAttendance.length === 0 ? (
              <div className="stu-dash__empty">
                <DashIcon name="attendance" className="dash-icon--lg" />
                <p>No attendance records yet</p>
              </div>
            ) : (
              <ul className="stu-dash__list">
                {recentAttendance.map((row) => (
                  <li key={row.id} className="stu-dash__list-row">
                    <div>
                      <p className="stu-dash__list-title">{formatDate(row.date)}</p>
                      <p className="stu-dash__list-meta">{statusLabel(row.status)}</p>
                    </div>
                    <span className={`stu-dash__badge stu-dash__badge--${row.status}`}>
                      {statusLabel(row.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="stu-dash__panel">
            <header className="stu-dash__panel-head">
              <div>
                <h3 className="stu-dash__panel-title">Results</h3>
                <p className="stu-dash__panel-sub">Published subject scores</p>
              </div>
              <Link href="/student/results" className="stu-dash__panel-link">
                View all
              </Link>
            </header>

            {results.length === 0 ? (
              <div className="stu-dash__empty">
                <DashIcon name="results" className="dash-icon--lg" />
                <p>No results published yet</p>
              </div>
            ) : (
              <ul className="stu-dash__list stu-dash__list--scores">
                {results.slice(0, 6).map((row) => (
                  <li key={row.id} className="stu-dash__score-row">
                    <span className="stu-dash__score-subject">{row.subject}</span>
                    <strong className="stu-dash__score-value">{row.score}%</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <article className="stu-dash__panel stu-dash__panel--wide">
          <header className="stu-dash__panel-head">
            <div>
              <h3 className="stu-dash__panel-title">Learning resources</h3>
              <p className="stu-dash__panel-sub">Books and materials from your school</p>
            </div>
            <Link href="/student/library" className="stu-dash__panel-link stu-dash__panel-link--primary">
              Open eLibrary
            </Link>
          </header>

          {studentResources.length === 0 ? (
            <div className="stu-dash__empty">
              <DashIcon name="library" className="dash-icon--lg" />
              <p>No resources published yet</p>
            </div>
          ) : (
            <ul className="stu-dash__resource-list">
              {studentResources.map((resource) => {
                const href =
                  resolveLibraryAssetUrl(resource.fileUrl) ??
                  resource.externalUrl ??
                  "/student/library";
                return (
                  <li key={resource.id} className="stu-dash__resource-row">
                    <div className="stu-dash__resource-icon" aria-hidden>
                      <DashIcon name="library" className="dash-icon--sm" />
                    </div>
                    <div className="stu-dash__resource-main">
                      <p className="stu-dash__resource-title">{resource.title}</p>
                      <p className="stu-dash__resource-meta">
                        {resource.category.name} · {resource.resourceTypeLabel}
                      </p>
                    </div>
                    <Link
                      href={href}
                      className="stu-dash__resource-btn"
                      target={resource.externalUrl ? "_blank" : undefined}
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="stu-dash__panel stu-dash__panel--wide">
          <header className="stu-dash__panel-head">
            <div>
              <h3 className="stu-dash__panel-title">Announcements</h3>
              <p className="stu-dash__panel-sub">News from your school</p>
            </div>
            <span className="stu-dash__panel-badge">{announcements.length}</span>
          </header>

          {announcements.length === 0 ? (
            <div className="stu-dash__empty">
              <DashIcon name="announcements" className="dash-icon--lg" />
              <p>No announcements yet</p>
            </div>
          ) : (
            <ul className="stu-dash__announce-list">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="stu-dash__announce-row">
                  <span className="stu-dash__announce-dot" aria-hidden />
                  <div>
                    <p className="stu-dash__announce-title">{item.title}</p>
                    <p className="stu-dash__announce-meta">{formatDate(item.createdAt)}</p>
                    {item.body ? (
                      <p className="stu-dash__announce-body">{item.body}</p>
                    ) : null}
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
