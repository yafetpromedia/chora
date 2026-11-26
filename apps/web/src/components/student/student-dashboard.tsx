"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHydrated } from "@/lib/use-client-snapshot";
import { Announcement, AttendanceRecord, ResultRecord } from "@/lib/api";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  resolveLibraryAssetUrl,
  type LibraryResource,
} from "@/lib/library";
import type { AttendanceSummary } from "@/lib/attendance";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

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

function formatWeekday(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), { weekday: "short" });
  } catch {
    return "";
  }
}

function statusLabel(status: string, t: (key: string) => string) {
  const s = status.toUpperCase();
  if (s === "PRESENT") return t("common.present");
  if (s === "ABSENT") return t("common.absent");
  if (s === "LATE") return t("common.late");
  if (s === "EXCUSED") return t("common.excused");
  if (!status || s === "UNKNOWN" || s === "NOT_MARKED") return t("common.notMarked");
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

function AttendanceRing({
  rate,
  attendanceLabel,
}: {
  rate: number | null;
  attendanceLabel: string;
}) {
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
        <span>{attendanceLabel}</span>
      </div>
    </div>
  );
}

function SubjectBars({
  results,
  emptyText,
  chartAria,
}: {
  results: ResultRecord[];
  emptyText: string;
  chartAria: string;
}) {
  const max = Math.max(100, ...results.map((r) => r.score), 1);
  if (results.length === 0) {
    return (
      <div className="stu-dash__empty stu-dash__empty--compact">
        <DashIcon name="results" className="dash-icon--lg" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="stu-chart-bars" role="img" aria-label={chartAria}>
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
  labels,
}: {
  counts: AttendanceSummary["counts"];
  labels: { present: string; absent: string; late: string; excused: string };
}) {
  const total =
    counts.present + counts.absent + counts.late + counts.excused || 1;
  const segments = [
    { key: "present", label: labels.present, value: counts.present, tone: "present" },
    { key: "absent", label: labels.absent, value: counts.absent, tone: "absent" },
    { key: "late", label: labels.late, value: counts.late, tone: "late" },
    { key: "excused", label: labels.excused, value: counts.excused, tone: "excused" },
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
  const { t, locale } = useLocale();
  const mounted = useHydrated();
  const dateLocale = localeTag(locale);
  const now = mounted ? new Date() : null;
  const today = now
    ? now.toLocaleDateString(dateLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const todayShort = now
    ? now.toLocaleDateString(dateLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const attendanceBreakdownLabels = {
    present: t("common.present"),
    absent: t("common.absent"),
    late: t("common.late"),
    excused: t("common.excused"),
  };

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
    <DashboardShell role="student" title={t("dash.studentDashboard")}>
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
                {hello ? t("dash.hi", { name: hello }) : t("dash.studentWorkspace")}
              </h2>
              <p className="stu-dash__hero-sub">
                {mounted && today ? `${today} · ` : ""}
                {schoolName}
                {classLabel ? ` · ${classLabel}` : ""}. {t("dash.heroStudentSub")}
              </p>
            </div>
            <div className="stu-dash__hero-stats">
              <div className="stu-dash__stat">
                <strong>{attendanceRate != null ? `${attendanceRate}%` : "—"}</strong>
                <span>{t("dash.attendance")}</span>
              </div>
              <div className="stu-dash__stat">
                <strong>{avgScore != null ? `${avgScore}%` : "—"}</strong>
                <span>{t("dash.avgScore")}</span>
              </div>
              <Link href="/student/classwork" className="stu-dash__stat stu-dash__stat--link">
                <strong>{upcomingAssignments}</strong>
                <span>{t("dash.tasks")}</span>
              </Link>
              <div className="stu-dash__stat stu-dash__stat--accent">
                <strong>{announcements.length}</strong>
                <span>{t("dash.news")}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="stu-dash__kpis" aria-label={t("dash.shortcuts")}>
          <Link href="/student/attendance" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--green" aria-hidden>
              <DashIcon name="attendance" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">{t("dash.attendance")}</p>
              <p className="stu-dash__kpi-value">
                {attendanceRate != null ? `${attendanceRate}%` : "—"}
              </p>
              <p className="stu-dash__kpi-hint">{t("dash.overallRate")}</p>
            </div>
          </Link>
          <Link href="/student/results" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--teal" aria-hidden>
              <DashIcon name="results" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">{t("dash.results")}</p>
              <p className="stu-dash__kpi-value">
                {avgScore != null ? `${avgScore}%` : "—"}
              </p>
              <p className="stu-dash__kpi-hint">
                {sortedResults.length > 0
                  ? sortedResults.length === 1
                    ? t("dash.subjectOne")
                    : t("dash.subjectsCount", { count: sortedResults.length })
                  : t("dash.publishedScores")}
              </p>
            </div>
          </Link>
          <Link href="/student/classwork" className="stu-dash__kpi">
            <span className="stu-dash__kpi-icon stu-dash__kpi-icon--amber" aria-hidden>
              <DashIcon name="assign" />
            </span>
            <div>
              <p className="stu-dash__kpi-label">{t("dash.assignments")}</p>
              <p className="stu-dash__kpi-value">{upcomingAssignments}</p>
              <p className="stu-dash__kpi-hint">{t("dash.openTasks")}</p>
            </div>
          </Link>
        </section>

        <div className="stu-dash__layout">
          <div className="stu-dash__main">
            <div className="stu-dash__charts">
              <article className="stu-dash__panel stu-dash__panel--chart">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">{t("dash.attendance")}</h3>
                    <p className="stu-dash__panel-sub">{t("dash.overallRateMix")}</p>
                  </div>
                  <Link href="/student/attendance" className="stu-dash__panel-link">
                    {t("dash.details")}{" "}
                    <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <div className="stu-dash__chart-layout">
                  <AttendanceRing
                    rate={attendanceRate}
                    attendanceLabel={t("dash.attendance")}
                  />
                  {attendanceSummary ? (
                    <AttendanceBreakdown
                      counts={attendanceSummary.counts}
                      labels={attendanceBreakdownLabels}
                    />
                  ) : (
                    <p className="stu-dash__muted">{t("dash.attendancePendingSummary")}</p>
                  )}
                </div>
              </article>

              <article className="stu-dash__panel stu-dash__panel--chart">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">{t("dash.subjectScores")}</h3>
                    <p className="stu-dash__panel-sub">{t("dash.publishedAverages")}</p>
                  </div>
                  <Link href="/student/results" className="stu-dash__panel-link">
                    {t("dash.viewAll")}{" "}
                    <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <SubjectBars
                  results={sortedResults}
                  emptyText={t("dash.noPublishedScores")}
                  chartAria={t("dash.subjectScoresChart")}
                />
              </article>
            </div>

            <div className="stu-dash__grid">
              <article className="stu-dash__panel">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">{t("dash.recentAttendance")}</h3>
                    <p className="stu-dash__panel-sub">{t("dash.latestRollCall")}</p>
                  </div>
                  <Link href="/student/attendance" className="stu-dash__panel-link">
                    {t("dash.permission")}
                  </Link>
                </header>

                {recentAttendance.length === 0 ? (
                  <div className="stu-dash__empty">
                    <DashIcon name="attendance" className="dash-icon--lg" />
                    <p>{t("dash.noAttendanceYet")}</p>
                  </div>
                ) : (
                  <ul className="stu-dash__list">
                    {recentAttendance.map((row) => (
                      <li key={row.id} className="stu-dash__list-row">
                        <div className="stu-dash__list-date">
                          <span className="stu-dash__list-weekday">
                            {formatWeekday(row.date, locale)}
                          </span>
                          <p className="stu-dash__list-title">{formatDate(row.date, locale)}</p>
                        </div>
                        <span
                          className={`stu-dash__badge stu-dash__badge--${row.status}`}
                        >
                          {statusLabel(row.status, t)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="stu-dash__panel">
                <header className="stu-dash__panel-head">
                  <div>
                    <h3 className="stu-dash__panel-title">{t("dash.topSubjects")}</h3>
                    <p className="stu-dash__panel-sub">{t("dash.highestScores")}</p>
                  </div>
                  <Link href="/student/report-card" className="stu-dash__panel-link">
                    {t("dash.reportCard")}
                  </Link>
                </header>

                {sortedResults.length === 0 ? (
                  <div className="stu-dash__empty">
                    <DashIcon name="results" className="dash-icon--lg" />
                    <p>{t("dash.noResultsYet")}</p>
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
                  <h3 className="stu-dash__panel-title">{t("dash.learningResources")}</h3>
                  <p className="stu-dash__panel-sub">{t("dash.booksFromSchool")}</p>
                </div>
                <Link
                  href="/student/library"
                  className="stu-dash__panel-link stu-dash__panel-link--primary"
                >
                  {t("dash.openELibrary")}
                </Link>
              </header>

              {studentResources.length === 0 ? (
                <div className="stu-dash__empty">
                  <DashIcon name="library" className="dash-icon--lg" />
                  <p>{t("dash.noResourcesYet")}</p>
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
                          {t("dash.open")}
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
                  <h3 className="stu-dash__panel-title">{t("dash.announcements")}</h3>
                  <p className="stu-dash__panel-sub">{t("dash.newsFromSchool")}</p>
                </div>
                <span className="stu-dash__panel-badge">{announcements.length}</span>
              </header>

              {announcements.length === 0 ? (
                <div className="stu-dash__empty stu-dash__empty--compact">
                  <DashIcon name="announcements" className="dash-icon--lg" />
                  <p>{t("dash.noAnnouncements")}</p>
                </div>
              ) : (
                <ul className="stu-dash__announce-list">
                  {announcements.slice(0, 5).map((item) => (
                    <li key={item.id} className="stu-dash__announce-row">
                      <span className="stu-dash__announce-dot" aria-hidden />
                      <div>
                        <p className="stu-dash__announce-title">{item.title}</p>
                        <p className="stu-dash__announce-meta">
                          {formatDate(item.createdAt, locale)}
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
