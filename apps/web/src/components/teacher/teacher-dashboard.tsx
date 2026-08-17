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

function shortClassLabel(label: string) {
  const cleaned = label.replace(/\s*[·—-]\s*/g, " · ").trim();
  const parts = cleaned.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const subject = parts[parts.length - 1]!;
    const klass = parts.slice(0, -1).join(" · ");
    return { primary: klass, subject };
  }
  return { primary: cleaned, subject: null as string | null };
}

function GradingDonut({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;
  return (
    <svg className="tch-chart__donut" viewBox="0 0 108 108" aria-hidden>
      <circle className="tch-chart__donut-track" cx="54" cy="54" r={r} />
      <circle
        className="tch-chart__donut-value"
        cx="54"
        cy="54"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function AttendanceBars({
  trend,
}: {
  trend: TeacherDashboardAnalytics["attendanceTrend"];
}) {
  const hasData = trend.some((d) => d.rate != null);
  return (
    <div
      className="tch-chart__bars"
      role="img"
      aria-label="Attendance trend for the last 7 days"
    >
      {trend.map((day) => {
        const h = day.rate != null ? Math.max(6, day.rate) : 0;
        return (
          <div key={day.date} className="tch-chart__bar-col">
            <span className="tch-chart__bar-val">
              {day.rate != null ? `${day.rate}` : "—"}
            </span>
            <div className="tch-chart__bar-track">
              <div
                className={`tch-chart__bar${day.rate == null ? " tch-chart__bar--empty" : ""}`}
                style={{ height: `${h}%` }}
                title={
                  day.rate != null
                    ? `${day.weekday}: ${day.rate}%`
                    : `${day.weekday}: no marks`
                }
              />
            </div>
            <span className="tch-chart__bar-label">{day.weekday}</span>
          </div>
        );
      })}
      {!hasData ? (
        <p className="tch-chart__empty-overlay">No marks this week yet</p>
      ) : null}
    </div>
  );
}

function ClassAvgBars({
  rows,
}: {
  rows: TeacherDashboardAnalytics["classPerformance"];
}) {
  if (rows.length === 0) {
    return <p className="tch-chart__empty">No scores entered yet.</p>;
  }
  return (
    <ul className="tch-chart__hbar-list">
      {rows.map((item) => {
        const pct = item.averageScore ?? 0;
        const { primary, subject } = shortClassLabel(item.label);
        return (
          <li key={item.classSubjectId} className="tch-chart__hbar-row">
            <div className="tch-chart__hbar-name" title={item.label}>
              <span className="tch-chart__hbar-class">{primary}</span>
              {subject ? (
                <span className="tch-chart__hbar-subject">{subject}</span>
              ) : null}
            </div>
            <div className="tch-chart__hbar-track">
              <span
                className="tch-chart__hbar-fill"
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
            <strong className="tch-chart__hbar-val">
              {item.averageScore != null ? `${item.averageScore}%` : "—"}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

function InsightsPanel({
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
  const topClasses = analytics.classPerformance.slice(0, 5);

  return (
    <section className="tch-ov__insights" aria-label="Insights">
      <div className="tch-ov__charts">
        <article className="tch-chart tch-chart--donut">
          <header className="tch-chart__head">
            <div>
              <h3>Grading progress</h3>
              <p>{grade.termName ?? "No active term"}</p>
            </div>
            <Link href="/teacher/results" className="tch-chart__link">
              Results
            </Link>
          </header>
          <div className="tch-chart__donut-wrap">
            <GradingDonut pct={gradingPct ?? 0} />
            <div className="tch-chart__donut-center">
              <strong>{gradingPct != null ? `${gradingPct}%` : "—"}</strong>
              <span>complete</span>
            </div>
          </div>
          <p className="tch-chart__footnote">
            {grade.missingScores > 0
              ? `${grade.missingScores} scores still missing`
              : grade.termName
                ? "All entered scores are up to date"
                : "Open a term to track grading"}
          </p>
        </article>

        <article className="tch-chart tch-chart--bars">
          <header className="tch-chart__head">
            <div>
              <h3>{showAttendance ? "Attendance trend" : "Classwork inbox"}</h3>
              <p>
                {showAttendance
                  ? att.rate != null
                    ? `Today ${att.rate}% · ${att.marked}/${att.total} marked`
                    : `${att.marked}/${att.total} classes marked today`
                  : cw.submissionsToGrade > 0
                    ? `${cw.submissionsToGrade} papers waiting`
                    : "All caught up"}
              </p>
            </div>
            <Link
              href={showAttendance ? "/teacher/attendance" : "/teacher/classwork"}
              className="tch-chart__link"
            >
              {showAttendance ? "Mark" : "Inbox"}
            </Link>
          </header>
          {showAttendance ? (
            <AttendanceBars trend={analytics.attendanceTrend} />
          ) : (
            <div className="tch-chart__cw">
              <div className="tch-chart__cw-stat">
                <strong>{cw.submissionsToGrade}</strong>
                <span>To review</span>
              </div>
              <div className="tch-chart__cw-stat">
                <strong>{cw.published}</strong>
                <span>Live</span>
              </div>
              <div className="tch-chart__cw-stat">
                <strong>{cw.draft}</strong>
                <span>Drafts</span>
              </div>
            </div>
          )}
        </article>

        <article className="tch-chart tch-chart--hbar">
          <header className="tch-chart__head">
            <div>
              <h3>Class averages</h3>
              <p>{grade.termName ?? "Current term"}</p>
            </div>
            <Link href="/teacher/results" className="tch-chart__link">
              Scores
            </Link>
          </header>
          <ClassAvgBars rows={topClasses} />
        </article>
      </div>
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

  return (
    <DashboardShell role="teacher">
      <div className="tch-ov">
        <header className="tch-ov__hero">
          <div className="tch-ov__hero-glow" aria-hidden />
          <div className="tch-ov__hero-inner">
            <div className="tch-ov__hero-main">
              <span className="tch-ov__hero-chip">{todayShort()}</span>
              <h1 className="tch-ov__hero-title">
                {firstName ? `Hi, ${firstName}` : "Overview"}
              </h1>
              <p className="tch-ov__hero-sub">
                {overview?.currentTerm?.name ?? "Current term"}
                {subjectCount > 0
                  ? ` · ${subjectCount} class${subjectCount === 1 ? "" : "es"}`
                  : ""}
                {homeroomLabel ? ` · Homeroom ${homeroomLabel}` : ""}
                . Mark attendance, finish grading, and open today&apos;s work.
              </p>
            </div>
            <div className="tch-ov__hero-stats">
              <div className="tch-ov__hero-stat">
                <strong>{subjectCount}</strong>
                <span>Classes</span>
              </div>
              <div className="tch-ov__hero-stat">
                <strong>{studentCount}</strong>
                <span>Students</span>
              </div>
              <Link href="/teacher/results" className="tch-ov__hero-stat">
                <strong>{gradingPct != null ? `${gradingPct}%` : "—"}</strong>
                <span>Grading</span>
              </Link>
              <Link
                href="/teacher/classwork"
                className="tch-ov__hero-stat tch-ov__hero-stat--accent"
              >
                <strong>{classworkInbox}</strong>
                <span>Inbox</span>
              </Link>
            </div>
          </div>
        </header>

        {error ? <p className="tch-alert tch-alert--error">{error}</p> : null}

        <div className="tch-ov__layout">
          <div className="tch-ov__main">
            {analytics ? (
              <InsightsPanel
                analytics={analytics}
                showAttendance={canTakeAttendance}
              />
            ) : null}

            {overview && overview.teachingSlots.length > 0 ? (
              <section className="tch-ov__card tch-ov__card--classes">
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
                  <h2>Today&apos;s timetable</h2>
                  <p>{todayShort()}</p>
                </div>
                <Link href="/teacher/timetable" className="tch-ov__link">
                  Full week
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

            {attentionItems.length > 0 ? (
              <section className="tch-ov__card tch-ov__card--todo">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>Needs attention</h2>
                    <p>
                      {attentionItems.length} item
                      {attentionItems.length === 1 ? "" : "s"} today
                    </p>
                  </div>
                  <span className="tch-ov__count">{attentionItems.length}</span>
                </header>
                <ul className="tch-ov__tasks">
                  {attentionItems.map((item) => (
                    <li
                      key={item.key}
                      className={`tch-ov__task tch-ov__task--${item.type}`}
                    >
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

            {announcements.length > 0 ? (
              <section className="tch-ov__card tch-ov__card--news">
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
