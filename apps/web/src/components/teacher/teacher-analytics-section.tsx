"use client";

import Link from "next/link";
import type { TeacherDashboardAnalytics } from "@/lib/teachers";
import { DashIcon } from "@/components/dashboard/dash-icons";

type Props = {
  analytics: TeacherDashboardAnalytics;
  showAttendance?: boolean;
  chartsOnly?: boolean;
};

function pluralCount(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function AttendanceTrendChart({
  trend,
}: {
  trend: TeacherDashboardAnalytics["attendanceTrend"];
}) {
  const maxRate = Math.max(100, ...trend.map((d) => d.rate ?? 0));
  const hasData = trend.some((d) => d.marked > 0);

  return (
    <div className="tch-da-chart">
      <div className="tch-da-chart__bars" role="img" aria-label="Homeroom attendance last 7 days">
        {trend.map((day) => {
          const h = day.rate != null ? Math.max(8, (day.rate / maxRate) * 100) : 4;
          return (
            <div key={day.date} className="tch-da-chart__col">
              <div className="tch-da-chart__wrap">
                <div
                  className={`tch-da-chart__bar${day.rate == null ? " tch-da-chart__bar--empty" : ""}`}
                  style={{ height: `${h}%` }}
                  title={
                    day.rate != null
                      ? `${day.weekday}: ${day.rate}% (${day.present}/${day.marked})`
                      : `${day.weekday}: no marks`
                  }
                />
              </div>
              <span className="tch-da-chart__label">{day.weekday}</span>
              <span className="tch-da-chart__value">
                {day.rate != null ? `${day.rate}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {!hasData ? (
        <p className="tch-da-chart__empty">Mark homeroom attendance to see trends.</p>
      ) : null}
    </div>
  );
}

export function TeacherAnalyticsSection({
  analytics,
  showAttendance = false,
  chartsOnly = false,
}: Props) {
  const att = analytics.attendanceToday;
  const grade = analytics.grading;
  const cw = analytics.classwork;
  const hasGradingData = grade.totalAssessments > 0 || grade.missingScores > 0;
  const gradingLabel =
    grade.progressPct != null
      ? `${grade.progressPct}%`
      : grade.termName
        ? "0%"
        : "—";

  if (chartsOnly && !showAttendance && !hasGradingData && !grade.termName && cw.published === 0) {
    return null;
  }

  return (
    <section
      className={`tch-stats${chartsOnly ? " tch-stats--insights" : ""}`}
      aria-label={chartsOnly ? "Workspace insights" : "Workspace summary"}
    >
      {!chartsOnly ? (
      <div className="tch-stats__grid">
        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--students">
            <DashIcon name="students" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">Students</p>
            <p className="tch-stat-card__value">{analytics.totalStudents}</p>
            <p className="tch-stat-card__hint">
              {pluralCount(analytics.subjectsTeaching, "subject class", "subject classes")}
            </p>
          </div>
        </article>

        {showAttendance ? (
          <article className="tch-stat-card">
            <div className="tch-stat-card__icon tch-stat-card__icon--attendance">
              <DashIcon name="attendance" className="dash-icon--sm" />
            </div>
            <div>
              <p className="tch-stat-card__label">Homeroom today</p>
              <p className="tch-stat-card__value">
                {att.rate != null ? `${att.rate}%` : "—"}
              </p>
              <p className="tch-stat-card__hint">
                {att.marked}/{att.total} marked
              </p>
            </div>
          </article>
        ) : null}

        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--grading">
            <DashIcon name="results" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">Grading</p>
            <p className="tch-stat-card__value">{gradingLabel}</p>
            <p className="tch-stat-card__hint">
              {grade.missingScores > 0
                ? `${pluralCount(grade.missingScores, "score")} missing`
                : grade.termName ?? "Set up academic term"}
            </p>
          </div>
        </article>

        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--classwork">
            <DashIcon name="library" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">Classwork</p>
            <p className="tch-stat-card__value">{cw.submissionsToGrade}</p>
            <p className="tch-stat-card__hint">
              {cw.submissionsToGrade > 0
                ? `${pluralCount(cw.submissionsToGrade, "submission")} to review`
                : "All caught up"}
            </p>
          </div>
        </article>
      </div>
      ) : null}

      {(showAttendance || hasGradingData || (chartsOnly && grade.termName) || (chartsOnly && cw.published > 0)) && (
        <div
          className={`tch-da-grid${
            [showAttendance, hasGradingData || (chartsOnly && grade.termName), chartsOnly && cw.published > 0].filter(
              Boolean,
            ).length > 1
              ? ""
              : " tch-da-grid--single"
          }`}
        >
          {showAttendance ? (
            <article className="tch-panel tch-panel--insight">
              <header className="tch-panel__head">
                <h3 className="tch-panel__title">Attendance trend</h3>
                <span className="tch-panel__meta">Last 7 days</span>
              </header>
              <AttendanceTrendChart trend={analytics.attendanceTrend} />
            </article>
          ) : null}

          {hasGradingData || (chartsOnly && grade.termName) ? (
            <article className="tch-panel tch-panel--insight">
              <header className="tch-panel__head">
                <h3 className="tch-panel__title">Grading status</h3>
                <span className="tch-panel__meta">
                  {grade.termName ?? "No term"}
                  {hasGradingData
                    ? ` · ${grade.completeAssessments}/${grade.totalAssessments} complete`
                    : ""}
                </span>
              </header>
              {hasGradingData ? (
                <div className="tch-grading-bars">
                  <div className="tch-grading-bars__row">
                    <span>Complete</span>
                    <div className="tch-grading-bars__track">
                      <div
                        className="tch-grading-bars__fill tch-grading-bars__fill--done"
                        style={{
                          width: grade.totalAssessments
                            ? `${(grade.completeAssessments / grade.totalAssessments) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <strong>{grade.completeAssessments}</strong>
                  </div>
                  <div className="tch-grading-bars__row">
                    <span>Missing scores</span>
                    <div className="tch-grading-bars__track">
                      <div
                        className="tch-grading-bars__fill tch-grading-bars__fill--pending"
                        style={{
                          width: grade.missingScores
                            ? `${Math.min(100, grade.missingScores * 4)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <strong>{grade.missingScores}</strong>
                  </div>
                </div>
              ) : (
                <div className="tch-insight-empty">
                  <DashIcon name="results" className="dash-icon--sm" />
                  <p>No assessments recorded for {grade.termName} yet.</p>
                  <Link href="/teacher/results" className="tch-insight-empty__link">
                    Open scores
                  </Link>
                </div>
              )}
            </article>
          ) : null}

          {chartsOnly && (cw.published > 0 || cw.draft > 0 || cw.submissionsToGrade > 0) ? (
            <article className="tch-panel tch-panel--insight tch-panel--classwork">
              <header className="tch-panel__head">
                <h3 className="tch-panel__title">Classwork</h3>
                <span className="tch-panel__meta">Assignments & worksheets</span>
              </header>
              <div className="tch-cw-stats-v4">
                <div className="tch-cw-stats-v4__row">
                  <span className="tch-cw-stats-v4__label">Published</span>
                  <strong className="tch-cw-stats-v4__value">{cw.published}</strong>
                </div>
                <div className="tch-cw-stats-v4__row">
                  <span className="tch-cw-stats-v4__label">Drafts</span>
                  <strong className="tch-cw-stats-v4__value">{cw.draft}</strong>
                </div>
                {cw.submissionsToGrade > 0 ? (
                  <Link
                    href="/teacher/worksheets"
                    className="tch-cw-stats-v4__row tch-cw-stats-v4__row--accent tch-cw-stats-v4__row--link"
                  >
                    <span className="tch-cw-stats-v4__label">To review</span>
                    <strong className="tch-cw-stats-v4__value">{cw.submissionsToGrade}</strong>
                  </Link>
                ) : (
                  <div className="tch-cw-stats-v4__row">
                    <span className="tch-cw-stats-v4__label">To review</span>
                    <strong className="tch-cw-stats-v4__value">{cw.submissionsToGrade}</strong>
                  </div>
                )}
              </div>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
