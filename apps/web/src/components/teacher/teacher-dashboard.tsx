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
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function todayShort(locale: AppLocale) {
  return new Date().toLocaleDateString(localeTag(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDate(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function subjectInitial(name: string) {
  const word = name.trim().split(/\s+/)[0] ?? "?";
  return word.charAt(0).toUpperCase();
}

const AVATAR_TONES = ["teal", "blue", "amber", "violet", "rose", "emerald"] as const;

function avatarTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length];
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
  const { t } = useLocale();
  const hasData = trend.some((d) => d.rate != null);
  return (
    <div
      className="tch-chart__bars"
      role="img"
      aria-label={t("dash.attendanceTrendAria")}
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
                    ? t("dash.weekdayRatePct", { weekday: day.weekday, rate: day.rate })
                    : t("dash.weekdayNoMarks", { weekday: day.weekday })
                }
              />
            </div>
            <span className="tch-chart__bar-label">{day.weekday}</span>
          </div>
        );
      })}
      {!hasData ? (
        <p className="tch-chart__empty-overlay">{t("dash.noMarksWeek")}</p>
      ) : null}
    </div>
  );
}

function InsightsPanel({
  analytics,
  showAttendance,
}: {
  analytics: TeacherDashboardAnalytics;
  showAttendance: boolean;
}) {
  const { t } = useLocale();
  const grade = analytics.grading;
  const cw = analytics.classwork;
  const att = analytics.attendanceToday;
  const gradingPct = grade.progressPct ?? (grade.termName ? 0 : null);

  return (
    <section className="tch-ov__insights" aria-label={t("dash.insights")}>
      <div className="tch-ov__charts">
        <article className="tch-chart tch-chart--donut">
          <header className="tch-chart__head">
            <div>
              <h3>{t("dash.gradingProgress")}</h3>
              <p>{grade.termName ?? t("dash.noActiveTerm")}</p>
            </div>
            <Link href="/teacher/results" className="tch-chart__link">
              {t("dash.results")}
            </Link>
          </header>
          <div className="tch-chart__donut-wrap">
            <GradingDonut pct={gradingPct ?? 0} />
            <div className="tch-chart__donut-center">
              <strong>{gradingPct != null ? `${gradingPct}%` : "—"}</strong>
              <span>{t("dash.complete")}</span>
            </div>
          </div>
          <p className="tch-chart__footnote">
            {grade.missingScores > 0
              ? t("dash.scoresStillMissing", { count: grade.missingScores })
              : grade.termName
                ? t("dash.allScoresUpToDate")
                : t("dash.openTermToTrackGrading")}
          </p>
        </article>

        <article className="tch-chart tch-chart--bars">
          <header className="tch-chart__head">
            <div>
              <h3>
                {showAttendance ? t("dash.attendanceTrend") : t("dash.classworkInbox")}
              </h3>
              <p>
                {showAttendance
                  ? att.rate != null
                    ? t("dash.todayRateMarked", {
                        rate: att.rate,
                        marked: att.marked,
                        total: att.total,
                      })
                    : t("dash.classesMarkedToday", {
                        marked: att.marked,
                        total: att.total,
                      })
                  : cw.submissionsToGrade > 0
                    ? cw.submissionsToGrade === 1
                      ? t("dash.onePaperWaiting")
                      : t("dash.papersWaiting", { count: cw.submissionsToGrade })
                    : t("dash.allCaughtUp")}
              </p>
            </div>
            <Link
              href={showAttendance ? "/teacher/attendance" : "/teacher/classwork"}
              className="tch-chart__link"
            >
              {showAttendance ? t("dash.mark") : t("dash.inbox")}
            </Link>
          </header>
          {showAttendance ? (
            <AttendanceBars trend={analytics.attendanceTrend} />
          ) : (
            <div className="tch-chart__cw">
              <div className="tch-chart__cw-stat">
                <strong>{cw.submissionsToGrade}</strong>
                <span>{t("dash.toReview")}</span>
              </div>
              <div className="tch-chart__cw-stat">
                <strong>{cw.published}</strong>
                <span>{t("dash.live")}</span>
              </div>
              <div className="tch-chart__cw-stat">
                <strong>{cw.draft}</strong>
                <span>{t("dash.drafts")}</span>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export function TeacherDashboard() {
  const { t, locale } = useLocale();
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
          meta: t("dash.notMarkedToday", { count: p.pendingCount }),
          href: `/teacher/attendance?gradeId=${p.gradeId}${p.sectionId ? `&sectionId=${p.sectionId}` : ""}`,
          action: t("dash.mark"),
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
        meta: t("dash.missingSubjects", {
          missing: row.missing,
          subjects: row.parts.slice(0, 3).join(", "),
        }),
        href: "/teacher/results",
        action: t("dash.grade"),
      });
    }

    const inbox = overview.analytics?.classwork.submissionsToGrade ?? 0;
    if (inbox > 0) {
      items.push({
        key: "cw",
        type: "classwork",
        title: t("dash.assignmentSubmissions"),
        meta:
          inbox === 1
            ? t("dash.onePaperWaiting")
            : t("dash.papersWaiting", { count: inbox }),
        href: "/teacher/classwork",
        action: t("dash.review"),
      });
    }

    return items.slice(0, 5);
  }, [overview, t]);

  const taskTypeLabel = (type: "attendance" | "grading" | "classwork") => {
    if (type === "attendance") return t("dash.taskTypeAttendance");
    if (type === "grading") return t("dash.taskTypeGrading");
    return t("dash.taskTypeClasswork");
  };

  if (loading) {
    return (
      <DashboardShell role="teacher">
        <div className="tch-ov tch-ov--loading">
          <div className="tch-day__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("dash.loadingOverview")}</p>
          </div>
        </div>
      </DashboardShell>
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
  const hasClasses = (overview?.teachingSlots.length ?? 0) > 0;
  const termLabel = overview?.currentTerm?.name ?? t("dash.currentTerm");

  return (
    <DashboardShell role="teacher">
      <div className="tch-ov">
        <header className="tch-ov__hero">
          <div className="tch-ov__hero-inner">
            <div className="tch-ov__hero-main">
              <div className="tch-ov__hero-brand">
                <span className="tch-ov__hero-chip">{t("dash.overview")}</span>
                <span className="tch-ov__hero-icon" aria-hidden>
                  <DashIcon name="overview" className="dash-icon--sm" />
                </span>
              </div>
              <h1 className="tch-ov__hero-title">
                {firstName ? t("dash.hi", { name: firstName }) : t("dash.yourDay")}
              </h1>
              <p className="tch-ov__hero-sub">
                {todayShort(locale)} · {termLabel}
                {homeroomLabel ? ` · ${t("dash.homeroomLabel", { label: homeroomLabel })}` : ""}
                {hasClasses ? t("dash.heroSubWithClasses") : t("dash.heroSubNoClasses")}
              </p>
            </div>
            <div className="tch-ov__hero-stats" aria-label={t("dash.overviewSummary")}>
              <div className="tch-ov__hero-stat">
                <strong>{subjectCount}</strong>
                <span>{t("dash.classes")}</span>
              </div>
              <div className="tch-ov__hero-stat">
                <strong>{studentCount}</strong>
                <span>{t("dash.students")}</span>
              </div>
              <Link href="/teacher/results" className="tch-ov__hero-stat">
                <strong>{gradingPct != null ? `${gradingPct}%` : "—"}</strong>
                <span>{t("dash.grading")}</span>
              </Link>
              <Link
                href="/teacher/classwork"
                className={`tch-ov__hero-stat${classworkInbox > 0 ? " tch-ov__hero-stat--accent" : ""}`}
              >
                <strong>{classworkInbox}</strong>
                <span>{t("dash.inbox")}</span>
              </Link>
            </div>
          </div>
        </header>

        {error ? <p className="tch-day__error">{error}</p> : null}

        <nav className="tch-ov__shortcuts" aria-label={t("dash.quickLinks")}>
          <Link href="/teacher/classes-today" className="tch-ov__shortcut">
            <DashIcon name="calendar" className="dash-icon--xs" />
            {t("dash.myClassesNav")}
          </Link>
          <Link href="/teacher/results" className="tch-ov__shortcut">
            <DashIcon name="results" className="dash-icon--xs" />
            {t("dash.scores")}
          </Link>
          <Link href="/teacher/classwork" className="tch-ov__shortcut">
            <DashIcon name="assign" className="dash-icon--xs" />
            {t("dash.assignments")}
          </Link>
          <Link href="/teacher/timetable" className="tch-ov__shortcut">
            <DashIcon name="calendar" className="dash-icon--xs" />
            {t("dash.timetable")}
          </Link>
        </nav>

        <div className="tch-ov__layout">
          <div className="tch-ov__main">
            {analytics && hasClasses ? (
              <InsightsPanel
                analytics={analytics}
                showAttendance={canTakeAttendance}
              />
            ) : null}

            {hasClasses && overview ? (
              <section className="tch-ov__card tch-ov__card--classes">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>{t("dash.myClasses")}</h2>
                    <p>{t("dash.jumpScoresClasswork")}</p>
                  </div>
                  <span className="tch-ov__count">{overview.teachingSlots.length}</span>
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
                          <div className="tch-ov__class-score-top">
                            <small>{t("dash.avg")}</small>
                            <strong>
                              {perf?.averageScore != null
                                ? `${perf.averageScore}%`
                                : "—"}
                            </strong>
                          </div>
                          <div
                            className="tch-ov__class-score-track"
                            aria-hidden={perf?.averageScore == null}
                          >
                            <span
                              className={`tch-ov__class-score-fill${
                                perf?.averageScore == null
                                  ? " tch-ov__class-score-fill--empty"
                                  : ""
                              }`}
                              style={{
                                width: `${
                                  perf?.averageScore != null
                                    ? Math.max(0, Math.min(100, perf.averageScore))
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="tch-ov__class-actions">
                          <Link
                            href={`/teacher/results?classSubjectId=${slot.classSubjectId}`}
                            className="tch-ov__class-btn tch-ov__class-btn--primary"
                          >
                            {t("dash.scores")}
                          </Link>
                          <Link
                            href={`/teacher/classwork?classSubjectId=${slot.classSubjectId}`}
                            className="tch-ov__class-btn"
                          >
                            {t("dash.assign")}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <section className="tch-ov__empty tch-ov__empty--card">
                <div className="tch-ov__empty-icon" aria-hidden>
                  <DashIcon name="students" />
                </div>
                <h2>{t("dash.noClassesAssigned")}</h2>
                <p>{t("dash.noClassesAssignedLong")}</p>
                <div className="tch-ov__empty-actions">
                  <Link href="/teacher/timetable" className="tch-ov__empty-btn">
                    {t("dash.checkTimetable")}
                  </Link>
                  <Link href="/teacher/profile" className="tch-ov__empty-btn tch-ov__empty-btn--ghost">
                    {t("dash.viewProfile")}
                  </Link>
                </div>
              </section>
            )}
          </div>

          <aside className="tch-ov__aside">
            <section className="tch-ov__card tch-ov__card--schedule">
              <header className="tch-ov__card-head">
                <div>
                  <h2>{t("dash.todaysTimetable")}</h2>
                  <p>{todayShort(locale)}</p>
                </div>
                <Link href="/teacher/timetable" className="tch-ov__link">
                  {t("dash.fullWeek")}
                </Link>
              </header>
              {hasSchedule && overview?.todaySchedule ? (
                <TimetableDayList
                  slots={overview.todaySchedule.slots}
                  emptyMessage=""
                  layout="timeline"
                  showTeacher={false}
                />
              ) : (
                <div className="tch-ov__schedule-empty">
                  <div className="tch-ov__empty-icon tch-ov__empty-icon--sm" aria-hidden>
                    <DashIcon name="calendar" className="dash-icon--sm" />
                  </div>
                  <p>{t("dash.noClassesToday")}</p>
                  <Link href="/teacher/timetable" className="tch-ov__link">
                    {t("dash.seeFullWeek")}
                  </Link>
                </div>
              )}
            </section>

            {attentionItems.length > 0 ? (
              <section className="tch-ov__card tch-ov__card--todo">
                <header className="tch-ov__card-head">
                  <div>
                    <h2>{t("dash.needsAttention")}</h2>
                    <p>
                      {attentionItems.length === 1
                        ? t("dash.oneItemToday")
                        : t("dash.itemsToday", { count: attentionItems.length })}
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
                        <span className="tch-ov__task-type">{taskTypeLabel(item.type)}</span>
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
                    <h2>{t("dash.schoolNews")}</h2>
                    <p>{t("dash.latestAnnouncements")}</p>
                  </div>
                </header>
                <ul className="tch-ov__news">
                  {announcements.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{formatDate(item.createdAt, locale)}</span>
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
