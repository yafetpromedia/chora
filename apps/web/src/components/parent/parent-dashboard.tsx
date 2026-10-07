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

function attendanceLabel(status: string) {
  const s = status.toUpperCase();
  if (s === "PRESENT") return { text: "Present", tone: "ok" as const };
  if (s === "ABSENT") return { text: "Absent", tone: "bad" as const };
  if (s === "LATE") return { text: "Late", tone: "warn" as const };
  if (s === "EXCUSED") return { text: "Excused", tone: "ok" as const };
  if (!status || s === "UNKNOWN" || s === "NOT_MARKED") {
    return { text: "Not marked", tone: "muted" as const };
  }
  return { text: status, tone: "muted" as const };
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

function ScoreBars({ scores }: { scores: StudentScoreUpdate[] }) {
  const bySubject = useMemo(() => aggregateScoresBySubject(scores), [scores]);
  const max = Math.max(100, ...bySubject.map((r) => r.percentage), 1);

  if (bySubject.length === 0) {
    return (
      <div className="par-home__empty-block">
        <DashIcon name="results" className="dash-icon--lg" />
        <p>No officially published scores yet for this child.</p>
        <p className="par-home__list-meta">
          You will get an alert when the school publishes results.
        </p>
      </div>
    );
  }

  return (
    <div className="stu-chart-bars" role="img" aria-label="Published subject scores">
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
    setMounted(true);
    setTodayShort(
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
  }, []);

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
        <p>Loading family dashboard…</p>
      </div>
    );
  }

  const attToday = selectedChild
    ? attendanceLabel(selectedChild.attendanceToday)
    : null;
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
    <DashboardShell role="parent">
      <div className="co-page co-page__body par-home par-home--modern">
        <header className="par-home__hero">
          <div className="par-home__hero-glow" aria-hidden />
          <div className="par-home__hero-inner">
            <div className="par-home__hero-main">
              {mounted && todayShort ? (
                <span className="par-home__hero-chip">{todayShort}</span>
              ) : null}
              <h1 className="par-home__title">
                {childHello ? `${childHello}'s overview` : "Family portal"}
              </h1>
              <p className="par-home__sub">
                {schoolName}
                {classLabel ? ` · ${classLabel}` : ""}. Track attendance, published
                results, fees, and school news.
              </p>
            </div>
            <div className="par-home__hero-stats">
              <div className="par-home__hero-stat">
                <strong>{attToday?.text ?? "—"}</strong>
                <span>Today</span>
              </div>
              <div className="par-home__hero-stat">
                <strong>
                  {avgScore != null
                    ? `${avgScore}%`
                    : selectedChild?.parentsCanViewResults === false
                      ? "Private"
                      : "—"}
                </strong>
                <span>Average</span>
              </div>
              <Link href="/parent/fees" className="par-home__hero-stat par-home__hero-stat--link">
                <strong><EtbAmount cents={selectedChild?.outstandingCents ?? 0} /></strong>
                <span>Fees due</span>
              </Link>
              <div className="par-home__hero-stat par-home__hero-stat--accent">
                <strong>{parentAlerts.length}</strong>
                <span>Alerts</span>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <section className="auth-alert auth-alert--error dash-alert">{error}</section>
        ) : null}

        <ParentChildBar
          children={children}
          selectedId={selectedChildId}
          onChange={setSelectedChildId}
          label="Child"
        />

        {selectedChild ? (
          <section className="par-home__kpis" aria-label="Family shortcuts">
            <a href="#par-attendance" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--green" aria-hidden>
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="par-home__kpi-label">Attendance</p>
                <p className="par-home__kpi-value">
                  {attendanceRate != null ? `${attendanceRate}%` : attToday?.text ?? "—"}
                </p>
                <p className="par-home__kpi-hint">Overall rate</p>
              </div>
            </a>
            <Link href="/parent/results" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--teal" aria-hidden>
                <DashIcon name="results" />
              </span>
              <div>
                <p className="par-home__kpi-label">Results</p>
                <p className="par-home__kpi-value">
                  {avgScore != null
                    ? `${avgScore}%`
                    : selectedChild.parentsCanViewResults === false
                      ? "Private"
                      : "—"}
                </p>
                <p className="par-home__kpi-hint">
                  {publishedScores.length > 0
                    ? `${publishedScores.length} published`
                    : "Published scores"}
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
                <p className="par-home__kpi-label">Fees</p>
                <p className="par-home__kpi-value">
                  <EtbAmount cents={selectedChild.outstandingCents} />
                </p>
                <p className="par-home__kpi-hint">
                  {selectedChild.outstandingCents > 0 ? "Outstanding" : "Up to date"}
                </p>
              </div>
            </Link>
            <Link href="/parent/timetable" className="par-home__kpi-card">
              <span className="par-home__kpi-icon par-home__kpi-icon--slate" aria-hidden>
                <DashIcon name="calendar" />
              </span>
              <div>
                <p className="par-home__kpi-label">Timetable</p>
                <p className="par-home__kpi-value">Today</p>
                <p className="par-home__kpi-hint">Classes & schedule</p>
              </div>
            </Link>
          </section>
        ) : null}

        {dueTotal > 0 && children.length > 1 ? (
          <p className="par-home__family-due">
            All children · <strong><EtbAmount cents={dueTotal} /></strong> outstanding ·{" "}
            <Link href="/parent/fees">View fees</Link>
          </p>
        ) : null}

        {resultAlerts.length > 0 && selectedChild?.parentsCanViewResults !== false ? (
          <section className="par-home__publish-banner" aria-label="Published results">
            <div>
              <p className="par-home__publish-eyebrow">Official release</p>
              <h2 className="par-home__publish-title">{resultAlerts[0].title}</h2>
              <p className="par-home__publish-body">{resultAlerts[0].body}</p>
            </div>
            <Link href="/parent/results" className="par-home__btn par-home__btn--primary">
              View published results
            </Link>
          </section>
        ) : null}

        <div className="par-home__layout">
          <div className="par-home__main">
            <div className="par-home__charts">
              <article className="par-home__panel par-home__panel--chart" id="par-attendance">
                <header className="par-home__panel-head">
                  <div>
                    <h2>Attendance</h2>
                    <p className="par-home__panel-sub">Overall rate and status mix</p>
                  </div>
                  {attendanceSummary ? (
                    <span className="par-home__badge">{attendanceSummary.rate}%</span>
                  ) : null}
                </header>
                {attendanceSummary ? (
                  <div className="par-home__chart-layout">
                    <AttendanceRing rate={attendanceRate} />
                    <AttendanceBreakdown counts={attendanceSummary.counts} />
                  </div>
                ) : (
                  <p className="par-home__empty">No attendance summary yet for this child.</p>
                )}
              </article>

              <article className="par-home__panel par-home__panel--chart">
                <header className="par-home__panel-head">
                  <div>
                    <h2>Published scores</h2>
                    <p className="par-home__panel-sub">Official results by subject</p>
                  </div>
                  <Link href="/parent/results" className="par-home__panel-link">
                    View all <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                {selectedChild?.parentsCanViewResults === false ? (
                  <div className="par-home__empty-block">
                    <p>This student has turned off parent access to results.</p>
                    <p className="par-home__list-meta">
                      They can re-enable it from Profile → Results privacy.
                    </p>
                  </div>
                ) : (
                  <ScoreBars scores={scoreUpdates} />
                )}
              </article>
            </div>

            <div className="par-home__grid">
              <article className="par-home__panel">
                <header className="par-home__panel-head">
                  <div>
                    <h2>Recent attendance</h2>
                    <p className="par-home__panel-sub">Latest roll call days</p>
                  </div>
                </header>
                {recentAttendance.length === 0 ? (
                  <p className="par-home__empty">No attendance records yet.</p>
                ) : (
                  <ul className="par-home__timeline">
                    {recentAttendance.map((row) => (
                      <li key={row.id} className="par-home__timeline-row">
                        <div className="par-home__timeline-date">
                          <span className="par-home__timeline-weekday">
                            {formatWeekday(row.date)}
                          </span>
                          <p className="par-home__list-title">{formatDate(row.date)}</p>
                        </div>
                        <span
                          className={`par-home__status par-home__status--${row.status}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="par-home__panel">
                <header className="par-home__panel-head">
                  <div>
                    <h2>Top subjects</h2>
                    <p className="par-home__panel-sub">Highest published scores</p>
                  </div>
                  <Link href="/parent/report-card" className="par-home__panel-link">
                    Report card
                  </Link>
                </header>
                {sortedScores.length === 0 ? (
                  <p className="par-home__empty">No published scores yet.</p>
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
                    <h2>Alerts</h2>
                    <p className="par-home__panel-sub">Updates for your family</p>
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
                              <span className="par-home__published-tag">Results</span>
                            ) : null}
                          </p>
                          <p className="par-home__list-meta">{n.body}</p>
                          {isResults ? (
                            <Link href="/parent/results" className="par-home__link">
                              Open results
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
                  <h2>Announcements</h2>
                  <p className="par-home__panel-sub">News from your school</p>
                </div>
                <span className="par-home__badge">{announcements.length}</span>
              </header>
              {announcements.length === 0 ? (
                <p className="par-home__empty">No school announcements yet.</p>
              ) : (
                <ul className="par-home__announce-list">
                  {announcements.slice(0, 5).map((item) => (
                    <li key={item.id} className="par-home__announce-row">
                      <span className="par-home__announce-dot" aria-hidden />
                      <div>
                        <p className="par-home__list-title">{item.title}</p>
                        <p className="par-home__list-meta">{formatDate(item.createdAt)}</p>
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
