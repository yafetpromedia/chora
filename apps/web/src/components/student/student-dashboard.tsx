"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Announcement, AttendanceRecord, ResultRecord } from "@/lib/api";
import { DashIcon } from "@/components/dashboard/dash-icons";
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

function formatWeekday(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return "";
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function firstName(full: string | undefined) {
  if (!full?.trim()) return null;
  return full.trim().split(/\s+/)[0] ?? null;
}

function aggregateResultsBySubject(results: ResultRecord[]): ResultRecord[] {
  const map = new Map<
    string,
    { total: number; count: number; id: string; studentId: string; schoolId: string }
  >();
  for (const row of results) {
    const existing = map.get(row.subject);
    if (existing) {
      existing.total += row.score;
      existing.count += 1;
    } else {
      map.set(row.subject, {
        total: row.score,
        count: 1,
        id: row.id,
        studentId: row.studentId,
        schoolId: row.schoolId,
      });
    }
  }
  return [...map.entries()].map(([subject, data]) => ({
    id: data.id,
    studentId: data.studentId,
    schoolId: data.schoolId,
    subject,
    score: Math.round((data.total / data.count) * 10) / 10,
  }));
}

function AttendanceRing({ rate }: { rate: number | null }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const value = rate != null ? Math.max(0, Math.min(100, rate)) : 0;
  const offset = c - (value / 100) * c;
  const tone = rate == null ? "muted" : rate >= 75 ? "good" : "low";

  return (
    <div className={`stu-chart-ring stu-chart-ring--${tone}`}>
      <svg viewBox="0 0 108 108" aria-hidden>
        <circle className="stu-chart-ring__track" cx="54" cy="54" r={r} />
        <circle
          className="stu-chart-ring__value"
          cx="54"
          cy="54"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="stu-chart-ring__label">
        <strong>{rate != null ? `${rate}%` : "—"}</strong>
        <span>Attendance</span>
      </div>
    </div>
  );
}

function SubjectBars({ results }: { results: ResultRecord[] }) {
  const max = Math.max(100, ...results.map((r) => r.score), 1);
  if (results.length === 0) {
    return (
      <div className="stu-dash__empty stu-dash__empty--compact">
        <DashIcon name="results" className="dash-icon--lg" />
        <p>No published scores yet</p>
      </div>
    );
  }

  return (
    <div className="stu-chart-bars" role="img" aria-label="Subject scores">
      {results.slice(0, 8).map((row) => {
        const h = Math.max(8, Math.round((row.score / max) * 100));
        const tone =
          row.score >= 85
            ? "excellent"
            : row.score >= 70
              ? "good"
              : row.score >= 50
                ? "fair"
                : "low";
        return (
          <div
            key={row.id}
            className="stu-chart-bars__col"
            title={`${row.subject}: ${row.score}%`}
          >
            <span className="stu-chart-bars__val">{row.score}</span>
            <div className="stu-chart-bars__track">
              <div
                className={`stu-chart-bars__fill stu-chart-bars__fill--${tone}`}
                style={{ height: `${h}%` }}
              />
            </div>
            <span className="stu-chart-bars__label">{row.subject}</span>
          </div>
        );
      })}
    </div>
  );
}

function AttendanceBreakdown({
  counts,
}: {
  counts: AttendanceSummary["counts"];
}) {
  const total =
    counts.present + counts.absent + counts.late + counts.excused || 1;
  const segments = [
    { key: "present", label: "Present", value: counts.present, tone: "present" },
    { key: "absent", label: "Absent", value: counts.absent, tone: "absent" },
    { key: "late", label: "Late", value: counts.late, tone: "late" },
    { key: "excused", label: "Excused", value: counts.excused, tone: "excused" },
  ];

  return (
    <div className="stu-chart-stack">
      <div className="stu-chart-stack__bar" aria-hidden>
        {segments.map((s) =>
          s.value > 0 ? (
            <i
              key={s.key}
              className={`stu-chart-stack__seg stu-chart-stack__seg--${s.tone}`}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="stu-chart-stack__legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`stu-chart-stack__dot stu-chart-stack__dot--${s.tone}`} />
            <em>{s.label}</em>
            <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [todayShort, setTodayShort] = useState("");

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setToday(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    setTodayShort(
      now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
  }, []);

  const attendanceRate =
    typeof dashboard?.attendanceRate === "number"
      ? dashboard.attendanceRate
      : attendanceSummary?.rate ?? null;
  const upcomingAssignments =
    typeof dashboard?.upcomingAssignments === "number"
      ? dashboard.upcomingAssignments
      : 0;

  const recentAttendance = (
    attendanceSummary?.recent?.length
      ? attendanceSummary.recent
      : attendance.map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status,
          reason: r.reason ?? null,
        }))
  ).slice(0, 3);

  const studentName = attendanceSummary?.student.name;
  const hello = firstName(studentName);
  const classLabel = attendanceSummary
    ? [attendanceSummary.student.grade, attendanceSummary.student.section]
        .filter(Boolean)
        .join(" · ")
    : null;

  const subjectResults = useMemo(
    () => aggregateResultsBySubject(results),
    [results],
  );

  const avgScore = useMemo(() => {
    if (subjectResults.length === 0) return null;
    const sum = subjectResults.reduce((a, r) => a + r.score, 0);
    return Math.round((sum / subjectResults.length) * 10) / 10;
  }, [subjectResults]);

  const sortedResults = useMemo(
    () => [...subjectResults].sort((a, b) => b.score - a.score),
    [subjectResults],
  );

  return (
    <DashboardShell role="student" title="Student dashboard">
      <div className="stu-dash stu-dash--modern">
        {error ? (
          <div className="stu-dash__alert stu-dash__alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <header className="stu-dash__hero">
          <div className="stu-dash__hero-glow" aria-hidden />
          <div className="stu-dash__hero-inner">
            <div className="stu-dash__hero-main">
              {mounted && todayShort ? (
                <span className="stu-dash__hero-chip">{todayShort}</span>
              ) : null}
              <h2 className="stu-dash__hero-title">
                {hello ? `Hi, ${hello}` : "Your student workspace"}
              </h2>
              <p className="stu-dash__hero-sub">
                {mounted && today ? `${today} · ` : ""}
                {schoolName}
                {classLabel ? ` · ${classLabel}` : ""}. Check attendance, scores,
                and today&apos;s work.
              </p>
            </div>
            <div className="stu-dash__hero-stats">
              <div className="stu-dash__stat">
                <strong>{attendanceRate != null ? `${attendanceRate}%` : "—"}</strong>
                <span>Attendance</span>
              </div>
              <div className="stu-dash__stat">
                <strong>{avgScore != null ? `${avgScore}%` : "—"}</strong>
                <span>Avg score</span>
              </div>
              <Link href="/student/classwork" className="stu-dash__stat stu-dash__stat--link">
                <strong>{upcomingAssignments}</strong>
                <span>Tasks</span>
              </Link>
              <div className="stu-dash__stat stu-dash__stat--accent">
                <strong>{announcements.length}</strong>
                <span>News</span>
              </div>
            </div>
          </div>
        </header>

        <section className="stu-dash__kpis" aria-label="Shortcuts">
          <Link href="/student/attendance" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--green" aria-hidden>
              <DashIcon name="attendance" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">Attendance</p>
              <p className="stu-dash__kpi-value">
                {attendanceRate != null ? `${attendanceRate}%` : "—"}
              </p>
              <p className="stu-dash__kpi-hint">Overall rate</p>
            </div>
          </Link>
          <Link href="/student/results" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--teal" aria-hidden>
              <DashIcon name="results" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">Results</p>
              <p className="stu-dash__kpi-value">
                {avgScore != null ? `${avgScore}%` : "—"}
              </p>
              <p className="stu-dash__kpi-hint">
                {sortedResults.length > 0
                  ? `${sortedResults.length} subject${sortedResults.length === 1 ? "" : "s"}`
                  : "Published scores"}
              </p>
            </div>
          </Link>
          <Link href="/student/classwork" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--amber" aria-hidden>
              <DashIcon name="assign" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">Assignments</p>
              <p className="stu-dash__kpi-value">{upcomingAssignments}</p>
              <p className="stu-dash__kpi-hint">Open tasks</p>
            </div>
          </Link>
        </section>

        <div className="stu-dash__layout">
          <div className="stu-dash__main">
            <div className="stu-dash__charts">
              <article className="stu-dash__panel stu-dash__panel--chart">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">Attendance</h3>
                    <p className="stu-dash__panel-sub">Overall rate and status mix</p>
                  </div>
                  <Link href="/student/attendance" className="stu-dash__panel-link">
                    Details <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <div className="stu-dash__chart-layout">
                  <AttendanceRing rate={attendanceRate} />
                  {attendanceSummary ? (
                    <AttendanceBreakdown counts={attendanceSummary.counts} />
                  ) : (
                    <p className="stu-dash__muted">
                      Attendance summary will appear here once marked.
                    </p>
                  )}
                </div>
              </article>

              <article className="stu-dash__panel stu-dash__panel--chart">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">Subject scores</h3>
                    <p className="stu-dash__panel-sub">Published averages by subject</p>
                  </div>
                  <Link href="/student/results" className="stu-dash__panel-link">
                    View all <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <SubjectBars results={sortedResults} />
              </article>
            </div>

            <div className="stu-dash__grid">
              <article className="stu-dash__panel">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">Recent attendance</h3>
                    <p className="stu-dash__panel-sub">Latest roll call days</p>
                  </div>
                  <Link href="/student/attendance" className="stu-dash__panel-link">
                    Permission
                  </Link>
                </header>

                {recentAttendance.length === 0 ? (
                  <div className="stu-dash__empty">
                    <DashIcon name="attendance" className="dash-icon--lg" />
                    <p>No attendance records yet</p>
                  </div>
                ) : (
                  <ul className="stu-dash__list">
                    {recentAttendance.map((row) => (
                      <li key={row.id} className="stu-dash__list-row">
                        <div className="stu-dash__list-date">
                          <span className="stu-dash__list-weekday">
                            {formatWeekday(row.date)}
                          </span>
                          <p className="stu-dash__list-title">{formatDate(row.date)}</p>
                        </div>
                        <span
                          className={`stu-dash__badge stu-dash__badge--${row.status}`}
                        >
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
                    <h3 className="stu-dash__panel-title">Top subjects</h3>
                    <p className="stu-dash__panel-sub">Highest published scores</p>
                  </div>
                  <Link href="/student/report-card" className="stu-dash__panel-link">
                    Report card
                  </Link>
                </header>

                {sortedResults.length === 0 ? (
                  <div className="stu-dash__empty">
                    <DashIcon name="results" className="dash-icon--lg" />
                    <p>No results published yet</p>
                  </div>
                ) : (
                  <ul className="stu-dash__list stu-dash__list--scores">
                    {sortedResults.slice(0, 5).map((row, index) => (
                      <li key={row.id} className="stu-dash__score-row">
                        <span className="stu-dash__score-rank">{index + 1}</span>
                        <span className="stu-dash__score-subject">{row.subject}</span>
                        <strong className="stu-dash__score-value">{row.score}%</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>

            <article className="stu-dash__panel">
              <header className="stu-dash__panel-head">
                <div>
                  <h3 className="stu-dash__panel-title">Learning resources</h3>
                  <p className="stu-dash__panel-sub">Books and materials from your school</p>
                </div>
                <Link
                  href="/student/library"
                  className="stu-dash__panel-link stu-dash__panel-link--primary"
                >
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
                  {studentResources.slice(0, 4).map((resource) => {
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
          </div>

          <aside className="stu-dash__aside">
            <article className="stu-dash__panel stu-dash__panel--aside">
              <header className="stu-dash__panel-head">
                <div>
                  <h3 className="stu-dash__panel-title">Announcements</h3>
                  <p className="stu-dash__panel-sub">News from your school</p>
                </div>
                <span className="stu-dash__panel-badge">{announcements.length}</span>
              </header>

              {announcements.length === 0 ? (
                <div className="stu-dash__empty stu-dash__empty--compact">
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
                        <p className="stu-dash__announce-meta">
                          {formatDate(item.createdAt)}
                        </p>
                        {item.body ? (
                          <p className="stu-dash__announce-body">{item.body}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
