"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Announcement, apiFetch } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getTeacherDashboard,
  type TeacherDashboardAnalytics,
  type TeacherDashboardOverview,
} from "@/lib/teachers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { TimetableDayList } from "@/components/timetable/timetable-day-list";

function todayShort() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function pluralCount(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function subjectInitial(name: string) {
  const word = name.trim().split(/\s+/)[0] ?? "?";
  return word.charAt(0).toUpperCase();
}

const AVATAR_TONES = ["teal", "blue", "amber", "violet", "rose", "emerald"] as const;

function avatarTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length];
}

function AnalyticsStrip({
  analytics,
  showAttendance,
}: {
  analytics: TeacherDashboardAnalytics;
  showAttendance: boolean;
}) {
  const grade = analytics.grading;
  const cw = analytics.classwork;
  const att = analytics.attendanceToday;
  const gradingPct = grade.progressPct ?? (grade.termName ? 0 : null);
  const topClasses = analytics.classPerformance.slice(0, 4);
  const maxAvg = Math.max(100, ...topClasses.map((c) => c.averageScore ?? 0));

  return (
    <section className="tch-ov__analytics" aria-label="Analytics">
      <article className="tch-ov__metric">
        <header className="tch-ov__metric-head">
          <span className="tch-ov__metric-icon tch-ov__metric-icon--grade">
            <DashIcon name="results" className="dash-icon--xs" />
          </span>
          <div>
            <h3>Grading</h3>
            <Link href="/teacher/results">Open results</Link>
          </div>
          {gradingPct != null ? (
            <span className="tch-ov__metric-ring" aria-hidden>
              <svg viewBox="0 0 36 36">
                <circle className="tch-ov__metric-ring-bg" cx="18" cy="18" r="15.5" />
                <circle
                  className="tch-ov__metric-ring-fg"
                  cx="18"
                  cy="18"
                  r="15.5"
                  style={{ "--pct": gradingPct } as React.CSSProperties}
                />
              </svg>
            </span>
          ) : null}
        </header>
        <p className="tch-ov__metric-value">
          {gradingPct != null ? `${gradingPct}%` : "—"}
        </p>
        <p className="tch-ov__metric-meta">
          {grade.missingScores > 0
            ? `${grade.missingScores} scores missing`
            : grade.termName ?? "No active term"}
        </p>
        <div className="tch-ov__track">
          <span className="tch-ov__track-fill" style={{ width: `${gradingPct ?? 0}%` }} />
        </div>
      </article>

      {showAttendance ? (
        <article className="tch-ov__metric">
          <header className="tch-ov__metric-head">
            <span className="tch-ov__metric-icon tch-ov__metric-icon--att">
              <DashIcon name="attendance" className="dash-icon--xs" />
            </span>
            <div>
              <h3>Attendance</h3>
              <Link href="/teacher/attendance">Mark today</Link>
            </div>
          </header>
          <p className="tch-ov__metric-value">
            {att.rate != null ? `${att.rate}%` : "—"}
          </p>
          <p className="tch-ov__metric-meta">
            {att.marked}/{att.total} classes marked
          </p>
          <div className="tch-ov__spark" role="img" aria-label="Last 7 days">
            {analytics.attendanceTrend.map((day) => (
              <span
                key={day.date}
                className={`tch-ov__spark-bar${day.rate == null ? " is-empty" : ""}`}
                style={{
                  height: day.rate != null ? `${Math.max(14, day.rate)}%` : "14%",
                }}
                title={day.rate != null ? `${day.weekday}: ${day.rate}%` : day.weekday}
              />
            ))}
          </div>
        </article>
      ) : (
        <article className="tch-ov__metric">
          <header className="tch-ov__metric-head">
            <span className="tch-ov__metric-icon tch-ov__metric-icon--cw">
              <DashIcon name="library" className="dash-icon--xs" />
            </span>
            <div>
              <h3>Classwork</h3>
              <Link href="/teacher/classwork">Open inbox</Link>
            </div>
          </header>
          <p className="tch-ov__metric-value">{cw.submissionsToGrade}</p>
          <p className="tch-ov__metric-meta">
            {cw.submissionsToGrade > 0 ? "papers to review" : "All caught up"}
          </p>
          <div className="tch-ov__chips">
            <span>{cw.published} live</span>
            <span>{cw.draft} drafts</span>
          </div>
        </article>
      )}

      <article className="tch-ov__metric">
        <header className="tch-ov__metric-head">
          <span className="tch-ov__metric-icon tch-ov__metric-icon--avg">
            <DashIcon name="students" className="dash-icon--xs" />
          </span>
          <div>
            <h3>Class averages</h3>
            <span className="tch-ov__metric-tag">{grade.termName ?? "Term"}</span>
          </div>
        </header>
        {topClasses.length > 0 ? (
          <ul className="tch-ov__avg-list">
            {topClasses.map((item) => (
              <li key={item.classSubjectId}>
                <span className="tch-ov__avg-name">
                  {item.label.split(" — ").pop()}
                </span>
                <div className="tch-ov__track tch-ov__track--sm">
                  <span
                    className="tch-ov__track-fill"
                    style={{
                      width: item.averageScore
                        ? `${(item.averageScore / maxAvg) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <strong>{item.averageScore != null ? `${item.averageScore}%` : "—"}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tch-ov__metric-empty">No scores entered yet.</p>
        )}
      </article>
    </section>
  );
}

export function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<TeacherDashboardOverview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }

    void (async () => {
      try {
        const [dash, posts] = await Promise.all([
          getTeacherDashboard(),
          apiFetch<Announcement[]>("/announcements"),
        ]);
        setOverview(dash);
        setAnnouncements(posts);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Load failed";
        if (message === "Session expired" || message === "Not authenticated") {
          router.replace("/login");
          return;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const attentionItems = useMemo(() => {
    if (!overview) return [];
    const items: Array<{
      key: string;
      type: "attendance" | "grading" | "classwork";
      title: string;
      meta: string;
      href: string;
      action: string;
    }> = [];
    const canTakeAttendance = overview.canTakeAttendance ?? false;

    if (canTakeAttendance && (overview.attendancePendingCount ?? 0) > 0) {
      for (const p of overview.attendancePending ?? []) {
        items.push({
          key: `att-${p.gradeId}-${p.sectionId ?? "all"}`,
          type: "attendance",
          title: p.label,
          meta: `${p.pendingCount} not marked today`,
          href: `/teacher/attendance?gradeId=${p.gradeId}${p.sectionId ? `&sectionId=${p.sectionId}` : ""}`,
          action: "Mark",
        });
      }
    }

    const byClass = new Map<string, { missing: number; parts: string[] }>();
    for (const r of overview.resultsPending ?? []) {
      const row = byClass.get(r.classLabel) ?? { missing: 0, parts: [] };
      row.missing += r.missingCount;
      row.parts.push(r.name);
      byClass.set(r.classLabel, row);
    }
    for (const [classLabel, row] of byClass) {
      items.push({
        key: `grade-${classLabel}`,
        type: "grading",
        title: classLabel,
        meta: `${row.missing} missing · ${row.parts.slice(0, 3).join(", ")}`,
        href: "/teacher/results",
        action: "Grade",
      });
    }

    const inbox = overview.analytics?.classwork.submissionsToGrade ?? 0;
    if (inbox > 0) {
      items.push({
        key: "cw",
        type: "classwork",
        title: "Assignment submissions",
        meta: pluralCount(inbox, "paper") + " waiting",
        href: "/teacher/classwork",
        action: "Review",
      });
    }

    return items.slice(0, 5);
  }, [overview]);

  if (loading) {
    return (
      <div className="dash-loading dash-loading--pro">
        <span className="dash-loading-spinner" aria-hidden />
        <p>Loading…</p>
      </div>
    );
  }

  const analytics = overview?.analytics;
  const canTakeAttendance = overview?.canTakeAttendance ?? false;
  const subjectCount = analytics?.subjectsTeaching ?? overview?.teachingSlots.length ?? 0;
  const studentCount = analytics?.totalStudents ?? 0;
  const grading = analytics?.grading;
  const gradingPct = grading?.progressPct ?? (grading?.termName ? 0 : null);
  const classworkInbox = analytics?.classwork.submissionsToGrade ?? 0;
  const firstName = overview?.teacherName?.split(" ")[0];
  const homeroomLabel = overview?.homeroom
    ? `${overview.homeroom.gradeName}${overview.homeroom.sectionName ? ` ${overview.homeroom.sectionName}` : ""}`
    : null;
  const hasSchedule = (overview?.todaySchedule?.slots.length ?? 0) > 0;

  const statPills = [
    { label: "Classes", value: String(subjectCount) },
    { label: "Students", value: String(studentCount) },
    { label: "Grading", value: gradingPct != null ? `${gradingPct}%` : "—", href: "/teacher/results" },
    { label: "Inbox", value: String(classworkInbox), href: "/teacher/classwork" },
  ];

  return (
    <DashboardShell role="teacher">
      <div className="tch-ov">
        <header className="tch-ov__hero">
          <div className="tch-ov__hero-glow" aria-hidden />
          <div className="tch-ov__hero-inner">
            <div className="tch-ov__hero-text">
              <p className="tch-ov__hero-date">{todayShort()}</p>
              <h1 className="tch-ov__hero-title">
                {firstName ? `Hi, ${firstName}` : "Overview"}
              </h1>
              <p className="tch-ov__hero-sub">
                {overview?.currentTerm?.name ?? "Current term"}
                {subjectCount > 0 ? ` · ${subjectCount} classes` : ""}
                {homeroomLabel ? ` · Homeroom ${homeroomLabel}` : ""}
              </p>
            </div>
            <div className="tch-ov__hero-stats">
              {statPills.map((pill) =>
                pill.href ? (
                  <Link key={pill.label} href={pill.href} className="tch-ov__stat">
                    <span>{pill.label}</span>
                    <strong>{pill.value}</strong>
                  </Link>
                ) : (
                  <div key={pill.label} className="tch-ov__stat">
                    <span>{pill.label}</span>
                    <strong>{pill.value}</strong>
                  </div>
                ),
              )}
            </div>
          </div>
        </header>

        {error ? <p className="tch-alert tch-alert--error">{error}</p> : null}

        <div className="tch-ov__layout">
          <div className="tch-ov__main">
            {analytics ? (
              <AnalyticsStrip analytics={analytics} showAttendance={canTakeAttendance} />
            ) : null}

            {attentionItems.length > 0 ? (
              <section className="tch-ov__card tch-ov__card--todo">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>Needs attention</h2>
                    <p>{attentionItems.length} item{attentionItems.length === 1 ? "" : "s"} today</p>
                  </div>
                  <span className="tch-ov__count">{attentionItems.length}</span>
                </header>
                <ul className="tch-ov__tasks">
                  {attentionItems.map((item) => (
                    <li key={item.key} className={`tch-ov__task tch-ov__task--${item.type}`}>
                      <div className="tch-ov__task-body">
                        <span className="tch-ov__task-type">{item.type}</span>
                        <p>{item.title}</p>
                        <small>{item.meta}</small>
                      </div>
                      <Link href={item.href} className="tch-ov__task-btn">
                        {item.action}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {overview && overview.teachingSlots.length > 0 ? (
              <section className="tch-ov__card">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>My classes</h2>
                    <p>Jump to scores or create classwork</p>
                  </div>
                </header>
                <ul className="tch-ov__classes">
                  {overview.teachingSlots.map((slot, index) => {
                    const perf = analytics?.classPerformance.find(
                      (p) => p.classSubjectId === slot.classSubjectId,
                    );
                    const tone = avatarTone(index);
                    return (
                      <li key={slot.classSubjectId} className="tch-ov__class-row">
                        <span className={`tch-ov__class-avatar tch-ov__class-avatar--${tone}`}>
                          {subjectInitial(slot.subjectName)}
                        </span>
                        <div className="tch-ov__class-info">
                          <strong>{slot.label}</strong>
                          <span>{slot.subjectName}</span>
                        </div>
                        <div className="tch-ov__class-score">
                          <small>Avg</small>
                          <strong>
                            {perf?.averageScore != null ? `${perf.averageScore}%` : "—"}
                          </strong>
                        </div>
                        <div className="tch-ov__class-actions">
                          <Link
                            href={`/teacher/results?classSubjectId=${slot.classSubjectId}`}
                            className="tch-ov__class-btn tch-ov__class-btn--primary"
                          >
                            Scores
                          </Link>
                          <Link
                            href={`/teacher/classwork?classSubjectId=${slot.classSubjectId}`}
                            className="tch-ov__class-btn"
                          >
                            Assign
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <section className="tch-ov__empty">
                <DashIcon name="students" className="dash-icon--sm" />
                <p>No classes assigned yet.</p>
              </section>
            )}
          </div>

          <aside className="tch-ov__aside">
            <section className="tch-ov__card tch-ov__card--schedule">
              <header className="tch-ov__card-head">
                <div>
                  <h2>Today</h2>
                  <p>Your timetable</p>
                </div>
                <Link href="/teacher/timetable" className="tch-ov__link">
                  Week
                </Link>
              </header>
              {hasSchedule && overview?.todaySchedule ? (
                <TimetableDayList
                  slots={overview.todaySchedule.slots}
                  emptyMessage=""
                  layout="timeline"
                />
              ) : (
                <div className="tch-ov__schedule-empty">
                  <DashIcon name="calendar" className="dash-icon--sm" />
                  <p>No lessons scheduled today.</p>
                </div>
              )}
            </section>

            <nav className="tch-ov__nav" aria-label="Quick links">
              <Link href="/teacher/results" className="tch-ov__nav-item">
                <span className="tch-ov__nav-icon">
                  <DashIcon name="results" className="dash-icon--xs" />
                </span>
                Results
              </Link>
              <Link href="/teacher/classwork" className="tch-ov__nav-item">
                <span className="tch-ov__nav-icon">
                  <DashIcon name="library" className="dash-icon--xs" />
                </span>
                Assignments
              </Link>
              <Link href="/teacher/library" className="tch-ov__nav-item">
                <span className="tch-ov__nav-icon">
                  <DashIcon name="library" className="dash-icon--xs" />
                </span>
                eLibrary
              </Link>
            </nav>

            {announcements.length > 0 ? (
              <section className="tch-ov__card">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>School news</h2>
                    <p>Latest announcements</p>
                  </div>
                </header>
                <ul className="tch-ov__news">
                  {announcements.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{formatDate(item.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
