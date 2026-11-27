"use client";

import Link from "next/link";
import type { TeacherDashboardAnalytics } from "@/lib/teachers";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  analytics: TeacherDashboardAnalytics;
  showAttendance?: boolean;
  chartsOnly?: boolean;
};

function AttendanceTrendChart({
  trend,
}: {
  trend: TeacherDashboardAnalytics["attendanceTrend"];
}) {
  const { t } = useLocale();
  const maxRate = Math.max(100, ...trend.map((d) => d.rate ?? 0));
  const hasData = trend.some((d) => d.marked > 0);

  return (
    <div className="tch-da-chart">
      <div className="tch-da-chart__bars" role="img" aria-label={t("teacherAnalyticsUi.ariaAttTrend")}>
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
                      ? t("teacherAnalyticsUi.chartDayTitle", {
                          weekday: day.weekday,
                          rate: day.rate,
                          present: day.present,
                          marked: day.marked,
                        })
                      : t("teacherAnalyticsUi.chartDayNoMarks", { weekday: day.weekday })
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
        <p className="tch-da-chart__empty">{t("teacherAnalyticsUi.markAttForTrend")}</p>
      ) : null}
    </div>
  );
}

export function TeacherAnalyticsSection({
  analytics,
  showAttendance = false,
  chartsOnly = false,
}: Props) {
  const { t } = useLocale();
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

  const subjectHint =
    analytics.subjectsTeaching === 1
      ? t("teacherAnalyticsUi.subjectClassOne", { n: analytics.subjectsTeaching })
      : t("teacherAnalyticsUi.subjectClassMany", { n: analytics.subjectsTeaching });

  const gradingHint =
    grade.missingScores > 0
      ? grade.missingScores === 1
        ? t("teacherAnalyticsUi.scoresMissingOne", { n: grade.missingScores })
        : t("teacherAnalyticsUi.scoresMissingMany", { n: grade.missingScores })
      : grade.termName ?? t("teacherAnalyticsUi.setupAcademicTerm");

  const classworkHint =
    cw.submissionsToGrade > 0
      ? cw.submissionsToGrade === 1
        ? t("teacherAnalyticsUi.submissionsReviewOne", { n: cw.submissionsToGrade })
        : t("teacherAnalyticsUi.submissionsReviewMany", { n: cw.submissionsToGrade })
      : t("teacherAnalyticsUi.allCaughtUp");

  return (
    <section
      className={`tch-stats${chartsOnly ? " tch-stats--insights" : ""}`}
      aria-label={
        chartsOnly ? t("teacherAnalyticsUi.ariaInsights") : t("teacherAnalyticsUi.ariaSummary")
      }
    >
      {!chartsOnly ? (
      <div className="tch-stats__grid">
        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--students">
            <DashIcon name="students" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">{t("teacherAnalyticsUi.statStudents")}</p>
            <p className="tch-stat-card__value">{analytics.totalStudents}</p>
            <p className="tch-stat-card__hint">{subjectHint}</p>
          </div>
        </article>

        {showAttendance ? (
          <article className="tch-stat-card">
            <div className="tch-stat-card__icon tch-stat-card__icon--attendance">
              <DashIcon name="attendance" className="dash-icon--sm" />
            </div>
            <div>
              <p className="tch-stat-card__label">{t("teacherAnalyticsUi.homeroomToday")}</p>
              <p className="tch-stat-card__value">
                {att.rate != null ? `${att.rate}%` : "—"}
              </p>
              <p className="tch-stat-card__hint">
                {t("teacherAnalyticsUi.markedRatio", {
                  marked: att.marked,
                  total: att.total,
                })}
              </p>
            </div>
          </article>
        ) : null}

        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--grading">
            <DashIcon name="results" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">{t("teacherAnalyticsUi.grading")}</p>
            <p className="tch-stat-card__value">{gradingLabel}</p>
            <p className="tch-stat-card__hint">{gradingHint}</p>
          </div>
        </article>

        <article className="tch-stat-card">
          <div className="tch-stat-card__icon tch-stat-card__icon--classwork">
            <DashIcon name="library" className="dash-icon--sm" />
          </div>
          <div>
            <p className="tch-stat-card__label">{t("teacherAnalyticsUi.classwork")}</p>
            <p className="tch-stat-card__value">{cw.submissionsToGrade}</p>
            <p className="tch-stat-card__hint">{classworkHint}</p>
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
                <h3 className="tch-panel__title">{t("teacherAnalyticsUi.attTrendTitle")}</h3>
                <span className="tch-panel__meta">{t("teacherAnalyticsUi.last7Days")}</span>
              </header>
              <AttendanceTrendChart trend={analytics.attendanceTrend} />
            </article>
          ) : null}

          {hasGradingData || (chartsOnly && grade.termName) ? (
            <article className="tch-panel tch-panel--insight">
              <header className="tch-panel__head">
                <h3 className="tch-panel__title">{t("teacherAnalyticsUi.gradingStatusTitle")}</h3>
                <span className="tch-panel__meta">
                  {grade.termName ?? t("teacherAnalyticsUi.noTerm")}
                  {hasGradingData
                    ? t("teacherAnalyticsUi.completeOf", {
                        complete: grade.completeAssessments,
                        total: grade.totalAssessments,
                      })
                    : ""}
                </span>
              </header>
              {hasGradingData ? (
                <div className="tch-grading-bars">
                  <div className="tch-grading-bars__row">
                    <span>{t("teacherAnalyticsUi.complete")}</span>
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
                    <span>{t("teacherAnalyticsUi.missingScores")}</span>
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
                  <p>
                    {t("teacherAnalyticsUi.noAssessmentsYet", {
                      term: grade.termName ?? "",
                    })}
                  </p>
                  <Link href="/teacher/results" className="tch-insight-empty__link">
                    {t("teacherAnalyticsUi.openScores")}
                  </Link>
                </div>
              )}
            </article>
          ) : null}

          {chartsOnly && (cw.published > 0 || cw.draft > 0 || cw.submissionsToGrade > 0) ? (
            <article className="tch-panel tch-panel--insight tch-panel--classwork">
              <header className="tch-panel__head">
                <h3 className="tch-panel__title">{t("teacherAnalyticsUi.classwork")}</h3>
                <span className="tch-panel__meta">{t("teacherAnalyticsUi.classworkMeta")}</span>
              </header>
              <div className="tch-cw-stats-v4">
                <div className="tch-cw-stats-v4__row">
                  <span className="tch-cw-stats-v4__label">{t("teacherAnalyticsUi.published")}</span>
                  <strong className="tch-cw-stats-v4__value">{cw.published}</strong>
                </div>
                <div className="tch-cw-stats-v4__row">
                  <span className="tch-cw-stats-v4__label">{t("teacherAnalyticsUi.drafts")}</span>
                  <strong className="tch-cw-stats-v4__value">{cw.draft}</strong>
                </div>
                {cw.submissionsToGrade > 0 ? (
                  <Link
                    href="/teacher/worksheets"
                    className="tch-cw-stats-v4__row tch-cw-stats-v4__row--accent tch-cw-stats-v4__row--link"
                  >
                    <span className="tch-cw-stats-v4__label">{t("teacherAnalyticsUi.toReview")}</span>
                    <strong className="tch-cw-stats-v4__value">{cw.submissionsToGrade}</strong>
                  </Link>
                ) : (
                  <div className="tch-cw-stats-v4__row">
                    <span className="tch-cw-stats-v4__label">{t("teacherAnalyticsUi.toReview")}</span>
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