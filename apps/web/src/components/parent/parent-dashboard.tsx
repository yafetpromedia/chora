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
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { StudentIdCardPanel } from "@/components/students/student-id-card-panel";
import type { ParentDayChild, ParentDayOverview } from "@/lib/dashboard-day";
import { formatEtb } from "@/lib/finance";
import {
  pickChildId,
  writeStoredChildId,
  type ParentChildOption,
} from "@/lib/parent-child";
import { listMyScoreUpdates, type StudentScoreUpdate } from "@/lib/results";
import { readSchoolBrand } from "@/lib/school-brand";

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
  const schoolName = readSchoolBrand().name ?? "CampusOne";

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
    () => scoreUpdates.filter((s) => s.published),
    [scoreUpdates],
  );

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
      setScoreUpdates(scores.slice(0, 6));
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

  return (
    <DashboardShell role="parent">
      <div className="co-page co-page__body par-home">
        <header className="par-home__hero">
          <div className="par-home__hero-glow" aria-hidden />
          <div className="par-home__hero-inner">
            <div>
              <p className="par-home__eyebrow">Family portal · {schoolName}</p>
              <h1 className="par-home__title">Stay close to school life</h1>
              <p className="par-home__sub">
                Attendance, results, fees, and today’s schedule — for every child linked to you.
              </p>
            </div>
            <div className="par-home__hero-actions">
              <Link href="/parent/results" className="par-home__btn par-home__btn--primary">
                View results
              </Link>
              <Link href="/parent/fees" className="par-home__btn par-home__btn--ghost">
                Fees
              </Link>
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
          <section className="par-home__snapshot" aria-label="Today at a glance">
            <article className={`par-home__kpi par-home__kpi--${attToday?.tone ?? "muted"}`}>
              <span>Today’s attendance</span>
              <strong>{attToday?.text ?? "—"}</strong>
              <small>
                {selectedChild.grade}
                {selectedChild.section ? ` · ${selectedChild.section}` : ""}
              </small>
            </article>
            <article className="par-home__kpi">
              <span>Performance</span>
              <strong>
                {selectedChild.parentsCanViewResults === false
                  ? "Private"
                  : selectedChild.overallAverage != null
                    ? `${selectedChild.overallAverage}%`
                    : "—"}
              </strong>
              <small>
                {selectedChild.parentsCanViewResults === false
                  ? "Student hid results from parents"
                  : (selectedChild.performanceLabel ?? "No average yet")}
              </small>
            </article>
            <article className={`par-home__kpi${selectedChild.outstandingCents > 0 ? " par-home__kpi--warn" : ""}`}>
              <span>Fees due</span>
              <strong>{formatEtb(selectedChild.outstandingCents)}</strong>
              <small>
                {selectedChild.outstandingCents > 0 ? (
                  <Link href="/parent/fees">Pay now</Link>
                ) : (
                  "Up to date"
                )}
              </small>
            </article>
            {dueTotal > 0 && children.length > 1 ? (
              <article className="par-home__kpi par-home__kpi--warn">
                <span>All children</span>
                <strong>{formatEtb(dueTotal)}</strong>
                <small>
                  <Link href="/parent/fees">Total outstanding</Link>
                </small>
              </article>
            ) : null}
          </section>
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

        {selectedChildId ? (
          <StudentIdCardPanel
            key={selectedChildId}
            source="child"
            profileId={selectedChildId}
            className="sid-my-panel--wide"
            title={
              selectedChild
                ? `ID card · ${selectedChild.name}`
                : "Child ID card"
            }
          />
        ) : null}

        <section className="par-home__grid">
          <article className="par-home__panel">
            <div className="par-home__panel-head">
              <h2>Attendance</h2>
              {attendanceSummary ? (
                <span className="par-home__badge">{attendanceSummary.rate}%</span>
              ) : null}
            </div>
            {attendanceSummary ? (
              <div className="par-home__att">
                <p className="par-home__att-rate">{attendanceSummary.rate}%</p>
                <p className="par-home__att-meta">
                  {attendanceSummary.student.name} · {attendanceSummary.student.grade}
                  {attendanceSummary.student.section
                    ? `-${attendanceSummary.student.section}`
                    : ""}
                </p>
                <ul className="par-home__att-counts">
                  <li>Present {attendanceSummary.counts.present}</li>
                  <li>Absent {attendanceSummary.counts.absent}</li>
                  <li>Late {attendanceSummary.counts.late}</li>
                  <li>Excused {attendanceSummary.counts.excused}</li>
                </ul>
              </div>
            ) : (
              <p className="par-home__empty">No attendance summary yet for this child.</p>
            )}
          </article>

          <article className="par-home__panel">
            <div className="par-home__panel-head">
              <h2>Published scores</h2>
              <Link href="/parent/results" className="par-home__link">
                All results
              </Link>
            </div>
            {selectedChild?.parentsCanViewResults === false ? (
              <div className="par-home__empty-block">
                <p>This student has turned off parent access to results.</p>
                <p className="par-home__list-meta">
                  They can re-enable it from their Profile → Results privacy.
                </p>
              </div>
            ) : publishedScores.length === 0 ? (
              <div className="par-home__empty-block">
                <p>No officially published scores yet for this child.</p>
                <p className="par-home__list-meta">
                  You will get an alert when the school publishes results.
                </p>
                <Link href="/parent/report-card" className="par-home__link">
                  Check report card
                </Link>
              </div>
            ) : (
              <ul className="par-home__list">
                {publishedScores.slice(0, 6).map((row) => (
                  <li key={row.id}>
                    <div>
                      <p className="par-home__list-title">{row.subject}</p>
                      <p className="par-home__list-meta">
                        {row.assessmentName} · {row.termName}
                        <span className="par-home__published-tag">Published</span>
                      </p>
                    </div>
                    <span className="par-home__score">{row.percentage}%</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="par-home__quick">
          <Link href="/parent/timetable" className="par-home__quick-card">
            <strong>Timetable</strong>
            <span>Today’s classes and the full week</span>
          </Link>
          <Link href="/parent/report-card" className="par-home__quick-card">
            <strong>Report card</strong>
            <span>Official term or year-end summary</span>
          </Link>
          <Link href="/parent/fees" className="par-home__quick-card">
            <strong>Fees & payments</strong>
            <span>Bank transfer or Chapa checkout</span>
          </Link>
        </section>

        {parentAlerts.length > 0 ? (
          <article className="par-home__panel">
            <div className="par-home__panel-head">
              <h2>Alerts</h2>
              <span className="par-home__badge">{parentAlerts.length}</span>
            </div>
            <ul className="par-home__list">
              {parentAlerts.slice(0, 6).map((n) => {
                const isResults =
                  /result/i.test(n.title) ||
                  /report card/i.test(n.title) ||
                  /published/i.test(n.title);
                return (
                  <li key={n.id} className="par-home__list-item--stack">
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

        <article className="par-home__panel">
          <div className="par-home__panel-head">
            <h2>Announcements</h2>
            <span className="par-home__badge">{announcements.length}</span>
          </div>
          {announcements.length === 0 ? (
            <p className="par-home__empty">No school announcements yet.</p>
          ) : (
            <ul className="par-home__list">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="par-home__list-item--stack">
                  <div>
                    <p className="par-home__list-title">{item.title}</p>
                    <p className="par-home__list-meta">{formatDate(item.createdAt)}</p>
                    {item.body ? <p className="par-home__list-body">{item.body}</p> : null}
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
