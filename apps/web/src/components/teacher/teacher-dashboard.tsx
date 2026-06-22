"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import { TeacherAnalyticsSection } from "@/components/teacher/teacher-analytics-section";

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

function pluralCount(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function subjectInitial(name: string) {
  const word = name.trim().split(/\s+/)[0] ?? "?";
  return word.charAt(0).toUpperCase();
}

const SUBJECT_TONES = ["teal", "blue", "amber", "violet", "rose", "emerald"] as const;

function subjectTone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % SUBJECT_TONES.length;
  return SUBJECT_TONES[hash];
}

const QUICK_ACTIONS = [
  { href: "/teacher/results", label: "Enter scores", icon: "results" as DashIconName },
  { href: "/teacher/classwork", label: "New assignment", icon: "library" as DashIconName },
  { href: "/teacher/timetable", label: "View timetable", icon: "calendar" as DashIconName },
];

function ClassPerformanceBars({
  items,
}: {
  items: TeacherDashboardAnalytics["classPerformance"];
}) {
  if (items.length === 0) return null;

  return (
    <article className="tch-panel tch-panel--perf">
      <header className="tch-panel__head">
        <h3 className="tch-panel__title">Class averages</h3>
        <span className="tch-panel__meta">Current term</span>
      </header>
      <ul className="tch-perf-list">
        {items.slice(0, 6).map((item) => {
          const hasScore = item.averageScore != null;
          return (
            <li key={item.classSubjectId} className="tch-perf-list__item">
              <div className="tch-perf-list__head">
                <span className="tch-perf-list__label">{item.label}</span>
                <strong
                  className={`tch-perf-list__value${hasScore ? "" : " tch-perf-list__value--muted"}`}
                >
                  {hasScore ? `${item.averageScore}%` : "—"}
                </strong>
              </div>
              <div className="tch-perf-list__track">
                <div
                  className={`tch-perf-list__fill${hasScore ? "" : " tch-perf-list__fill--empty"}`}
                  style={{
                    width: hasScore ? `${Math.min(100, item.averageScore ?? 0)}%` : "0%",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

type MetricCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: DashIconName;
  tone: "teal" | "blue" | "amber" | "violet";
  href?: string;
};

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

  if (loading) {
    return (
      <div className="dash-loading dash-loading--pro">
        <span className="dash-loading-spinner" aria-hidden />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  const homeroomLabel = overview?.homeroom
    ? `${overview.homeroom.gradeName}${overview.homeroom.sectionName ? ` ${overview.homeroom.sectionName}` : ""}`
    : null;
  const analytics = overview?.analytics;
  const canTakeAttendance = overview?.canTakeAttendance ?? false;
  const attPending = canTakeAttendance ? (overview?.attendancePendingCount ?? 0) : 0;
  const classworkInbox = analytics?.classwork.submissionsToGrade ?? 0;
  const subjectCount = analytics?.subjectsTeaching ?? overview?.teachingSlots.length ?? 0;
  const studentCount = analytics?.totalStudents ?? 0;
  const grading = analytics?.grading;
  const att = analytics?.attendanceToday;
  const gradingPct =
    grading?.progressPct ?? (grading?.termName ? 0 : null);
  const gradingLabel = gradingPct != null ? `${gradingPct}%` : "—";
  const hasSchedule = (overview?.todaySchedule?.slots.length ?? 0) > 0;

  const attentionItems: Array<{
    key: string;
    type: string;
    title: string;
    meta: string;
    href: string;
    action: string;
  }> = [];

  if (canTakeAttendance && attPending > 0) {
    for (const p of overview?.attendancePending ?? []) {
      attentionItems.push({
        key: `${p.gradeId}-${p.sectionId ?? "all"}`,
        type: "Attendance",
        title: p.label,
        meta: `${p.pendingCount} of ${p.studentCount} not marked`,
        href: `/teacher/attendance?gradeId=${p.gradeId}${p.sectionId ? `&sectionId=${p.sectionId}` : ""}`,
        action: "Mark",
      });
    }
  }

  for (const r of (overview?.resultsPending ?? []).slice(0, 4)) {
    attentionItems.push({
      key: r.assessmentId,
      type: "Grading",
      title: r.name,
      meta: `${r.classLabel} · ${pluralCount(r.missingCount, "score")} missing`,
      href: `/teacher/results?assessmentId=${r.assessmentId}`,
      action: "Grade",
    });
  }

  if (classworkInbox > 0) {
    attentionItems.push({
      key: "classwork",
      type: "Assignments",
      title: `${pluralCount(classworkInbox, "submission")} to review`,
      meta: "Waiting in your inbox",
      href: "/teacher/classwork",
      action: "Open",
    });
  }

  const firstName = overview?.teacherName?.split(" ")[0];

  const metrics: MetricCard[] = [
    {
      key: "students",
      label: "Students",
      value: String(studentCount),
      hint: pluralCount(subjectCount, "class", "classes"),
      icon: "students",
      tone: "teal",
    },
    {
      key: "grading",
      label: "Grading",
      value: gradingLabel,
      hint:
        grading && grading.missingScores > 0
          ? `${pluralCount(grading.missingScores, "score")} missing`
          : grading?.termName ?? "Set up term",
      icon: "results",
      tone: "amber",
      href: "/teacher/results",
    },
    ...(canTakeAttendance
      ? [
          {
            key: "attendance",
            label: "Homeroom today",
            value: att?.rate != null ? `${att.rate}%` : "—",
            hint:
              attPending > 0
                ? `${attPending} class${attPending === 1 ? "" : "es"} pending`
                : `${att?.marked ?? 0}/${att?.total ?? 0} marked`,
            icon: "attendance" as DashIconName,
            tone: "blue" as const,
            href: "/teacher/attendance",
          },
        ]
      : []),
    {
      key: "inbox",
      label: "To review",
      value: String(classworkInbox),
      hint:
        classworkInbox > 0
          ? "Submissions waiting"
          : analytics?.classwork.published
            ? `${analytics.classwork.published} published`
            : "All caught up",
      icon: "library",
      tone: "violet",
      href: "/teacher/classwork",
    },
  ];

  const navLinks = [
    { href: "/teacher/results", label: "Scores", icon: "results" as DashIconName },
    { href: "/teacher/classwork", label: "Assignments", icon: "library" as DashIconName },
    { href: "/teacher/worksheets", label: "Worksheets", icon: "library" as DashIconName },
    { href: "/teacher/timetable", label: "Timetable", icon: "calendar" as DashIconName },
    { href: "/teacher/library", label: "eLibrary", icon: "library" as DashIconName },
  ];

  return (
    <DashboardShell role="teacher">
      <div className="tch-dash tch-dash--v4">
        <header className="tch-hero-v4">
          <div className="tch-hero-v4__glow" aria-hidden />
          <div className="tch-hero-v4__inner">
            <div className="tch-hero-v4__main">
              <p className="tch-hero-v4__date">{todayLabel()}</p>
              <h1 className="tch-hero-v4__title">
                {firstName ? `Good day, ${firstName}` : "Teacher workspace"}
              </h1>
              <p className="tch-hero-v4__sub">
                {subjectCount > 0
                  ? `Teaching ${pluralCount(subjectCount, "class", "classes")} · ${pluralCount(studentCount, "student")}`
                  : "No classes assigned yet"}
                {overview?.currentTerm ? ` · ${overview.currentTerm.name}` : ""}
              </p>
              <div className="tch-hero-v4__tags">
                <span
                  className={`tch-hero-v4__tag${canTakeAttendance ? " tch-hero-v4__tag--homeroom" : ""}`}
                >
                  {canTakeAttendance ? "Homeroom teacher" : "Subject teacher"}
                </span>
                {homeroomLabel ? (
                  <span className="tch-hero-v4__tag">{homeroomLabel}</span>
                ) : null}
                {overview?.academicYear ? (
                  <span className="tch-hero-v4__tag">{overview.academicYear.name}</span>
                ) : null}
              </div>
            </div>
            <div className="tch-hero-v4__nav-wrap">
              <nav className="tch-hero-v4__nav" aria-label="Workspace shortcuts">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="tch-hero-v4__nav-link">
                    <span className="tch-hero-v4__nav-icon">
                      <DashIcon name={link.icon} className="dash-icon--xs" />
                    </span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {error ? <p className="tch-alert tch-alert--error">{error}</p> : null}

        <div className="tch-metrics-v4" role="list" aria-label="Workspace metrics">
          {metrics.map((m) => {
            const inner = (
              <>
                <div className={`tch-metrics-v4__icon tch-metrics-v4__icon--${m.tone}`}>
                  <DashIcon name={m.icon} className="dash-icon--sm" />
                </div>
                <div className="tch-metrics-v4__body">
                  <p className="tch-metrics-v4__label">{m.label}</p>
                  <p className="tch-metrics-v4__value">{m.value}</p>
                  <p className="tch-metrics-v4__hint">{m.hint}</p>
                </div>
                {m.key === "grading" && gradingPct != null ? (
                  <div
                    className="tch-metrics-v4__ring"
                    style={{ "--pct": gradingPct } as CSSProperties}
                    aria-hidden
                  >
                    <svg viewBox="0 0 36 36">
                      <circle className="tch-metrics-v4__ring-bg" cx="18" cy="18" r="15.5" />
                      <circle className="tch-metrics-v4__ring-fg" cx="18" cy="18" r="15.5" />
                    </svg>
                  </div>
                ) : null}
              </>
            );
            return m.href ? (
              <Link
                key={m.key}
                href={m.href}
                className={`tch-metrics-v4__card tch-metrics-v4__card--${m.tone} tch-metrics-v4__card--link`}
                role="listitem"
              >
                {inner}
              </Link>
            ) : (
              <article
                key={m.key}
                className={`tch-metrics-v4__card tch-metrics-v4__card--${m.tone}`}
                role="listitem"
              >
                {inner}
              </article>
            );
          })}
        </div>

        <div className="tch-layout-v4">
          <div className="tch-layout-v4__main">
            {overview && overview.teachingSlots.length > 0 ? (
              <section className="tch-panel-v4 tch-panel-v4--classes">
                <header className="tch-panel-v4__head">
                  <div>
                    <h2 className="tch-panel-v4__title">My classes</h2>
                    <p className="tch-panel-v4__meta">Jump into scores or classwork</p>
                  </div>
                  <span className="tch-panel-v4__badge">{overview.teachingSlots.length}</span>
                </header>
                <ul className="tch-class-rows-v4">
                  {overview.teachingSlots.map((slot) => {
                    const perf = analytics?.classPerformance.find(
                      (p) => p.classSubjectId === slot.classSubjectId,
                    );
                    const avg = perf?.averageScore;
                    const tone = subjectTone(slot.subjectName);
                    return (
                      <li key={slot.classSubjectId} className="tch-class-row-v4">
                        <div className="tch-class-row-v4__identity">
                          <span
                            className={`tch-class-row-v4__avatar tch-class-row-v4__avatar--${tone}`}
                            aria-hidden
                          >
                            {subjectInitial(slot.subjectName)}
                          </span>
                          <div className="tch-class-row-v4__info">
                            <p className="tch-class-row-v4__name">{slot.label}</p>
                            <p className="tch-class-row-v4__sub">{slot.subjectName}</p>
                          </div>
                        </div>
                        <div className="tch-class-row-v4__stat">
                          {avg != null ? (
                            <>
                              <span className="tch-class-row-v4__stat-label">Avg</span>
                              <strong className="tch-class-row-v4__stat-value">{avg}%</strong>
                            </>
                          ) : (
                            <span className="tch-class-row-v4__stat-empty">No scores yet</span>
                          )}
                        </div>
                        <div className="tch-class-row-v4__actions">
                          <Link
                            href={`/teacher/results?classSubjectId=${slot.classSubjectId}`}
                            className="tch-class-row-v4__btn tch-class-row-v4__btn--primary"
                          >
                            Scores
                          </Link>
                          <Link
                            href={`/teacher/classwork?classSubjectId=${slot.classSubjectId}`}
                            className="tch-class-row-v4__btn"
                          >
                            Assign
                          </Link>
                          <Link
                            href={`/teacher/worksheets?classSubjectId=${slot.classSubjectId}`}
                            className="tch-class-row-v4__btn"
                          >
                            Sheets
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : overview && overview.classes.length === 0 ? (
              <section className="tch-empty">
                <div className="tch-empty__icon" aria-hidden>
                  <DashIcon name="students" className="dash-icon--lg" />
                </div>
                <h2 className="tch-empty__title">No classes yet</h2>
                <p className="tch-empty__text">
                  Ask your school admin to assign your homeroom or subject classes.
                </p>
              </section>
            ) : null}

            {analytics ? (
              <section className="tch-insights" aria-label="Analytics">
                <header className="tch-insights__head">
                  <h2 className="tch-insights__title">Insights</h2>
                  <p className="tch-insights__sub">Grading, classwork, and performance this term</p>
                </header>
                <TeacherAnalyticsSection
                  analytics={analytics}
                  showAttendance={canTakeAttendance}
                  chartsOnly
                />
                <ClassPerformanceBars items={analytics.classPerformance} />
              </section>
            ) : null}
          </div>

          <aside className="tch-layout-v4__aside">
            <section className="tch-panel-v4 tch-panel-v4--attention">
              <header className="tch-panel-v4__head">
                <h3 className="tch-panel-v4__title">Action queue</h3>
                {attentionItems.length > 0 ? (
                  <span className="tch-panel-v4__badge tch-panel-v4__badge--alert">
                    {attentionItems.length}
                  </span>
                ) : null}
              </header>
              {attentionItems.length === 0 ? (
                <div className="tch-aside-v4__ok">
                  <div className="tch-aside-v4__ok-top">
                    <div className="tch-aside-v4__ok-icon" aria-hidden>
                      <DashIcon name="attendance" className="dash-icon--sm" />
                    </div>
                    <div>
                      <p className="tch-aside-v4__ok-title">All caught up</p>
                      <p className="tch-aside-v4__ok-text">
                        No pending attendance, grading, or reviews.
                      </p>
                    </div>
                  </div>
                  <div className="tch-quick-v4">
                    {QUICK_ACTIONS.map((action) => (
                      <Link key={action.href} href={action.href} className="tch-quick-v4__link">
                        <DashIcon name={action.icon} className="dash-icon--xs" />
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="tch-queue">
                  {attentionItems.map((item) => (
                    <li key={item.key} className="tch-queue__item">
                      <div className="tch-queue__content">
                        <span
                          className={`tch-queue__type tch-queue__type--${item.type.toLowerCase()}`}
                        >
                          {item.type}
                        </span>
                        <p className="tch-queue__title">{item.title}</p>
                        <p className="tch-queue__meta">{item.meta}</p>
                      </div>
                      <Link href={item.href} className="tch-queue__action">
                        {item.action}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="tch-panel-v4 tch-panel-v4--schedule">
              <header className="tch-panel-v4__head">
                <h3 className="tch-panel-v4__title">
                  {overview?.todaySchedule
                    ? `Today — ${overview.todaySchedule.weekdayLabel}`
                    : "Today's schedule"}
                </h3>
                <Link href="/teacher/timetable" className="tch-panel-v4__link">
                  Week view
                </Link>
              </header>
              {hasSchedule && overview?.todaySchedule ? (
                <TimetableDayList
                  slots={overview.todaySchedule.slots}
                  emptyMessage=""
                  layout="timeline"
                />
              ) : (
                <div className="tch-schedule-empty">
                  <DashIcon name="calendar" className="dash-icon--sm" />
                  <p>No lessons scheduled for today.</p>
                  <Link href="/teacher/timetable" className="tch-schedule-empty__link">
                    Open timetable
                  </Link>
                </div>
              )}
            </section>

            <section className="tch-panel-v4">
              <header className="tch-panel-v4__head">
                <h3 className="tch-panel-v4__title">Announcements</h3>
                {announcements.length > 0 ? (
                  <span className="tch-panel-v4__badge">{announcements.length}</span>
                ) : null}
              </header>
              {announcements.length === 0 ? (
                <div className="tch-announce-empty">
                  <DashIcon name="announcements" className="dash-icon--sm" />
                  <p>No announcements from your school yet.</p>
                </div>
              ) : (
                <ul className="tch-announce-list">
                  {announcements.slice(0, 4).map((item) => (
                    <li key={item.id} className="tch-announce-list__item">
                      <p className="tch-announce-list__title">{item.title}</p>
                      <p className="tch-announce-list__date">{formatDate(item.createdAt)}</p>
                      {item.body ? (
                        <p className="tch-announce-list__body">{item.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
