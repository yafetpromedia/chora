"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Announcement, apiFetch } from "@/lib/api";
import {
  getAttendanceSummary,
  listParentNotifications,
  type AttendanceSummary,
  type ParentNotification,
} from "@/lib/attendance";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import type { ParentDayChild, ParentDayOverview } from "@/lib/dashboard-day";
import { EtbAmount } from "@/components/billing/etb-amount";
import {
  pickChildId,
  writeStoredChildId,
  type ParentChildOption,
} from "@/lib/parent-child";
import { listMyScoreUpdates, type StudentScoreUpdate } from "@/lib/results";
import { readSchoolBrand } from "@/lib/school-brand";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function attendanceLabel(status: string, t: (key: string) => string) {
  const s = status.toUpperCase();
  if (s === "PRESENT") return { text: t("common.present"), tone: "ok" as const };
  if (s === "ABSENT") return { text: t("common.absent"), tone: "bad" as const };
  if (s === "LATE") return { text: t("common.late"), tone: "warn" as const };
  if (s === "EXCUSED") return { text: t("common.excused"), tone: "ok" as const };
  if (!status || s === "UNKNOWN" || s === "NOT_MARKED") {
    return { text: t("common.notMarked"), tone: "muted" as const };
  }
  return { text: status, tone: "muted" as const };
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

function aggregateScoresBySubject(scores: StudentScoreUpdate[]): StudentScoreUpdate[] {
  const map = new Map<
    string,
    { total: number; count: number; row: StudentScoreUpdate }
  >();
  for (const row of scores.filter((s) => s.published)) {
    const existing = map.get(row.subject);
    if (existing) {
      existing.total += row.percentage;
      existing.count += 1;
    } else {
      map.set(row.subject, { total: row.percentage, count: 1, row });
    }
  }
  return [...map.entries()].map(([subject, { total, count, row }]) => ({
    ...row,
    id: `subject-${subject}`,
    subject,
    percentage: Math.round((total / count) * 10) / 10,
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

function ScoreBars({
  scores,
  emptyTitle,
  emptyHint,
  chartAria,
}: {
  scores: StudentScoreUpdate[];
  emptyTitle: string;
  emptyHint: string;
  chartAria: string;
}) {
  const bySubject = useMemo(() => aggregateScoresBySubject(scores), [scores]);
  const max = Math.max(100, ...bySubject.map((r) => r.percentage), 1);

  if (bySubject.length === 0) {
    return (
      <div className="par-home__empty-block">
        <DashIcon name="results" className="dash-icon--lg" />
        <p>{emptyTitle}</p>
        <p className="par-home__list-meta">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="stu-chart-bars" role="img" aria-label={chartAria}>
      {bySubject.slice(0, 8).map((row) => {
        const h = Math.max(8, Math.round((row.percentage / max) * 100));
        const tone =
          row.percentage >= 85
            ? "excellent"
            : row.percentage >= 70
              ? "good"
              : row.percentage >= 50
                ? "fair"
                : "low";
        return (
          <div
            key={row.id}
            className="stu-chart-bars__col"
            title={`${row.subject}: ${row.percentage}%`}
          >
            <span className="stu-chart-bars__val">{row.percentage}</span>
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

export function ParentDashboard() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [parentDay, setParentDay] = useState<ParentDayOverview | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [scoreUpdates, setScoreUpdates] = useState<StudentScoreUpdate[]>([]);
  const [parentAlerts, setParentAlerts] = useState<ParentNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [mounted, setMounted] = useState(false);
  const [todayShort, setTodayShort] = useState("");
  const schoolName = readSchoolBrand().name ?? BRAND_NAME;

  const children: ParentChildOption[] = useMemo(
    () =>
      (parentDay?.children ?? []).map((c) => ({
        profileId: c.profileId,
        name: c.name,
        grade: c.grade,
        section: c.section,
      })),
    [parentDay],
  );

  const selectedChild: ParentDayChild | null =
    parentDay?.children.find((c) => c.profileId === selectedChildId) ?? null;

  const resultAlerts = useMemo(
    () =>
      parentAlerts.filter(
        (n) =>
          /result/i.test(n.title) ||
          /report card/i.test(n.title) ||
          /published/i.test(n.title),
      ),
    [parentAlerts],
  );

  const publishedScores = useMemo(
    () => aggregateScoresBySubject(scoreUpdates),
    [scoreUpdates],
  );

  const sortedScores = useMemo(
    () => [...publishedScores].sort((a, b) => b.percentage - a.percentage),
    [publishedScores],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setTodayShort(
        new Date().toLocaleDateString(localeTag(locale), {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    });
  }, [locale]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardData, announcementData, alerts] = await Promise.all([
          apiFetch<{ day?: ParentDayOverview; children?: number; alerts?: number }>(
            "/dashboards/me",
          ),
          apiFetch<Announcement[]>("/announcements"),
          listParentNotifications().catch(() => [] as ParentNotification[]),
        ]);
        setAnnouncements(announcementData);
        setParentAlerts(alerts);
        if (dashboardData.day?.kind === "parent_day") {
          setParentDay(dashboardData.day);
          const id = pickChildId(dashboardData.day.children);
          setSelectedChildId(id);
          if (id) writeStoredChildId(id);
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
  }, [router]);

  useEffect(() => {
    if (!selectedChildId) return;
    writeStoredChildId(selectedChildId);
    void Promise.all([
      getAttendanceSummary(selectedChildId).catch(() => null),
      listMyScoreUpdates(undefined, selectedChildId).catch(() => [] as StudentScoreUpdate[]),
    ]).then(([summary, scores]) => {
      setAttendanceSummary(summary);
      setScoreUpdates(scores.slice(0, 12));
    });
  }, [selectedChildId]);

  if (loading) {
    return (
      <div className="dash-loading dash-loading--pro">
        <span className="dash-loading-spinner" aria-hidden />
        <p>{t("dash.loadingFamily")}</p>
      </div>
    );
  }

  const attToday = selectedChild
    ? attendanceLabel(selectedChild.attendanceToday, t)
    : null;

  const attendanceBreakdownLabels = {
    present: t("common.present"),
    absent: t("common.absent"),
    late: t("common.late"),
    excused: t("common.excused"),
  };
  const dueTotal = parentDay?.totalDueCents ?? 0;
  const childHello = firstName(selectedChild?.name);
  const classLabel = selectedChild
    ? [selectedChild.grade, selectedChild.section].filter(Boolean).join(" · ")
    : null;
  const attendanceRate = attendanceSummary?.rate ?? null;
  const avgScore =
    selectedChild?.parentsCanViewResults === false
      ? null
      : selectedChild?.overallAverage ?? null;
  const recentAttendance = (attendanceSummary?.recent ?? []).slice(0, 3);

  return (
    <DashboardShell
      role="parent"
      title={t("pages.parentOverview.title")}
      subtitle={t("pages.parentOverview.subtitle")}
    >
      <div className="co-page co-page__body par-home par-home--modern">
        <header className="par-home__hero">
          <div className="par-home__hero-glow" aria-hidden />
          <div className="par-home__hero-inner">
            <div className="par-home__hero-main">
              {mounted && todayShort ? (
                <span className="par-home__hero-chip">{todayShort}</span>
              ) : null}
              <h1 className="par-home__title">
                {childHello
                  ? t("dash.childOverview", { name: childHello })
                  : t("dash.familyPortal")}
              </h1>
              <p className="par-home__sub">
                {schoolName}
                {classLabel ? ` · ${classLabel}` : ""}. {t("dash.familyTrackSub")}
              </p>
            </div>
            <div className="par-home__hero-stats">
              <div className="par-home__hero-stat">
                <strong>{attToday?.text ?? "—"}</strong>
                <span>{t("dash.today")}</span>
              </div>
              <div className="par-home__hero-stat">
                <strong>
                  {avgScore != null
                    ? `${avgScore}%`
                    : selectedChild?.parentsCanViewResults === false
                      ? t("dash.private")
                      : "—"}
                </strong>
                <span>{t("dash.average")}</span>
              </div>
              <Link href="/parent/fees" className="par-home__hero-stat par-home__hero-stat--link">
                <strong><EtbAmount cents={selectedChild?.outstandingCents ?? 0} /></strong>
                <span>{t("dash.feesDue")}</span>
              </Link>
              <div className="par-home__hero-stat par-home__hero-stat--accent">
                <strong>{parentAlerts.length}</strong>
                <span>{t("dash.alerts")}</span>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <section className="auth-alert auth-alert--error dash-alert">{error}</section>
        ) : null}

        <ParentChildBar
          selectedId={selectedChildId}
          onChange={setSelectedChildId}
          label={t("common.child")}
        >
          {children}
        </ParentChildBar>

        {selectedChild ? (
          <section className="par-home__kpis" aria-label={t("dash.familyShortcuts")}>
            <a href="#par-attendance" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--green" aria-hidden>
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="par-home__kpi-label">{t("dash.attendance")}</p>
                <p className="par-home__kpi-value">
                  {attendanceRate != null ? `${attendanceRate}%` : attToday?.text ?? "—"}
                </p>
                <p className="par-home__kpi-hint">{t("dash.overallRate")}</p>
              </div>
            </a>
            <Link href="/parent/results" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--teal" aria-hidden>
                <DashIcon name="results" />
              </span>
              <div>
                <p className="par-home__kpi-label">{t("dash.results")}</p>
                <p className="par-home__kpi-value">
                  {avgScore != null
                    ? `${avgScore}%`
                    : selectedChild.parentsCanViewResults === false
                      ? t("dash.private")
                      : "—"}
                </p>
                <p className="par-home__kpi-hint">
                  {publishedScores.length > 0
                    ? t("dash.publishedCount", { count: publishedScores.length })
                    : t("dash.publishedScores")}
                </p>
              </div>
            </Link>
            <Link href="/parent/fees" className="par-home__kpi-card">
              <span
                className={`par-home__kpi-icon par-home__kpi-icon--amber${selectedChild.outstandingCents > 0 ? " par-home__kpi-icon--warn" : ""}`}
                aria-hidden
              >
                <DashIcon name="fees" />
              </span>
              <div>
                <p className="par-home__kpi-label">{t("dash.fees")}</p>
                <p className="par-home__kpi-value">
                  <EtbAmount cents={selectedChild.outstandingCents} />
                </p>
                <p className="par-home__kpi-hint">
                  {selectedChild.outstandingCents > 0
                    ? t("dash.outstanding")
                    : t("dash.upToDate")}
                </p>
              </div>
            </Link>
            <Link href="/parent/timetable" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--slate" aria-hidden>
                <DashIcon name="calendar" />
              </span>
              <div>
                <p className="par-home__kpi-label">{t("nav.Timetable")}</p>
                <p className="par-home__kpi-value">{t("dash.timetableToday")}</p>
                <p className="par-home__kpi-hint">{t("dash.classesSchedule")}</p>
              </div>
            </Link>
          </section>
        ) : null}

        {dueTotal > 0 && children.length > 1 ? (
          <p className="par-home__family-due">
            {t("dash.allChildrenOutstanding")}
            <strong><EtbAmount cents={dueTotal} /></strong>
            <Link href="/parent/fees">{t("dash.viewFees")}</Link>
          </p>
        ) : null}

        {resultAlerts.length > 0 && selectedChild?.parentsCanViewResults !== false ? (
          <section
            className="par-home__publish-banner"
            aria-label={t("dash.publishedScores")}
          >
            <div>
              <p className="par-home__publish-eyebrow">{t("dash.officialRelease")}</p>
              <h2 className="par-home__publish-title">{resultAlerts[0].title}</h2>
              <p className="par-home__publish-body">{resultAlerts[0].body}</p>
            </div>
            <Link href="/parent/results" className="par-home__btn par-home__btn--primary">
              {t("dash.viewPublishedResults")}
            </Link>
          </section>
        ) : null}

        <div className="par-home__layout">
          <div className="par-home__main">
            <div className="par-home__charts">
              <article className="par-home__panel par-home__panel--chart" id="par-attendance">
                <header className="par-home__panel-head">
                  <div>
                    <h2>{t("dash.attendance")}</h2>
                    <p className="par-home__panel-sub">{t("dash.overallRateMix")}</p>
                  </div>
                  {attendanceSummary ? (
                    <span className="par-home__badge">{attendanceSummary.rate}%</span>
                  ) : null}
                </header>
                {attendanceSummary ? (
                  <div className="par-home__chart-layout">
                    <AttendanceRing
                      rate={attendanceRate}
                      attendanceLabel={t("dash.attendance")}
                    />
                    <AttendanceBreakdown
                      counts={attendanceSummary.counts}
                      labels={attendanceBreakdownLabels}
                    />
                  </div>
                ) : (
                  <p className="par-home__empty">{t("dash.noAttendanceSummary")}</p>
                )}
              </article>

              <article className="par-home__panel par-home__panel--chart">
                <header className="par-home__panel-head">
                  <div>
                    <h2>{t("dash.publishedScores")}</h2>
                    <p className="par-home__panel-sub">{t("dash.officialBySubject")}</p>
                  </div>
                  <Link href="/parent/results" className="par-home__panel-link">
                    {t("dash.viewAll")}{" "}
                    <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                {selectedChild?.parentsCanViewResults === false ? (
                  <div className="par-home__empty-block">
                    <p>{t("dash.resultsAccessOff")}</p>
                    <p className="par-home__list-meta">{t("dash.resultsAccessOffHint")}</p>
                  </div>
                ) : (
                  <ScoreBars
                    scores={scoreUpdates}
                    emptyTitle={t("dash.noOfficialScoresChild")}
                    emptyHint={t("dash.alertWhenResultsPublished")}
                    chartAria={t("dash.publishedScoresChart")}
                  />
                )}
              </article>
            </div>

            <div className="par-home__grid">
              <article className="par-home__panel">
                <header className="par-home__panel-head">
                  <div>
                    <h2>{t("dash.recentAttendance")}</h2>
                    <p className="par-home__panel-sub">{t("dash.latestRollCall")}</p>
                  </div>
                </header>
                {recentAttendance.length === 0 ? (
                  <p className="par-home__empty">{t("dash.noAttendanceRecords")}</p>
                ) : (
                  <ul className="par-home__timeline">
                    {recentAttendance.map((row) => (
                      <li key={row.id} className="par-home__timeline-row">
                        <div className="par-home__timeline-date">
                          <span className="par-home__timeline-weekday">
                            {formatWeekday(row.date, locale)}
                          </span>
                          <p className="par-home__list-title">{formatDate(row.date, locale)}</p>
                        </div>
                        <span
                          className={`par-home__status par-home__status--${row.status}`}
                        >
                          {statusLabel(row.status, t)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="par-home__panel">
                <header className="par-home__panel-head">
                  <div>
                    <h2>{t("dash.topSubjects")}</h2>
                    <p className="par-home__panel-sub">{t("dash.highestScores")}</p>
                  </div>
                  <Link href="/parent/report-card" className="par-home__panel-link">
                    {t("dash.reportCard")}
                  </Link>
                </header>
                {sortedScores.length === 0 ? (
                  <p className="par-home__empty">{t("dash.noPublishedScores")}</p>
                ) : (
                  <ul className="par-home__rank-list">
                    {sortedScores.slice(0, 5).map((row, index) => (
                      <li key={row.id} className="par-home__rank-row">
                        <span className="par-home__rank-num">{index + 1}</span>
                        <span className="par-home__rank-subject">{row.subject}</span>
                        <strong className="par-home__score">{row.percentage}%</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </div>

          <aside className="par-home__aside">
            {parentAlerts.length > 0 ? (
              <article className="par-home__panel par-home__panel--aside">
                <header className="par-home__panel-head">
                  <div>
                    <h2>{t("dash.alerts")}</h2>
                    <p className="par-home__panel-sub">{t("dash.updatesForFamily")}</p>
                  </div>
                  <span className="par-home__badge">{parentAlerts.length}</span>
                </header>
                <ul className="par-home__alert-list">
                  {parentAlerts.slice(0, 5).map((n) => {
                    const isResults =
                      /result/i.test(n.title) ||
                      /report card/i.test(n.title) ||
                      /published/i.test(n.title);
                    return (
                      <li key={n.id} className="par-home__alert-row">
                        <span className="par-home__alert-dot" aria-hidden />
                        <div>
                          <p className="par-home__list-title">
                            {n.title}
                            {isResults ? (
                              <span className="par-home__published-tag">{t("dash.results")}</span>
                            ) : null}
                          </p>
                          <p className="par-home__list-meta">{n.body}</p>
                          {isResults ? (
                            <Link href="/parent/results" className="par-home__link">
                              {t("dash.openResults")}
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ) : null}

            <article className="par-home__panel par-home__panel--aside">
              <header className="par-home__panel-head">
                <div>
                  <h2>{t("dash.announcements")}</h2>
                  <p className="par-home__panel-sub">{t("dash.newsFromSchool")}</p>
                </div>
                <span className="par-home__badge">{announcements.length}</span>
              </header>
              {announcements.length === 0 ? (
                <p className="par-home__empty">{t("dash.noSchoolAnnouncements")}</p>
              ) : (
                <ul className="par-home__announce-list">
                  {announcements.slice(0, 5).map((item) => (
                    <li key={item.id} className="par-home__announce-row">
                      <span className="par-home__announce-dot" aria-hidden />
                      <div>
                        <p className="par-home__list-title">{item.title}</p>
                        <p className="par-home__list-meta">{formatDate(item.createdAt, locale)}</p>
                        {item.body ? (
                          <p className="par-home__list-body">{item.body}</p>
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
