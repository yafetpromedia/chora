"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { listStudents } from "@/lib/school-setup";
import { getAdminAnalytics, type AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import {
  AttendanceTodayRing,
  AttendanceTrendChart,
  GradeAttendanceBars,
  StaffDashboardShell,
  StaffKpiGrid,
} from "@/components/dashboard/staff-dashboard-shared";
import { loadStaffDashboardBase } from "@/components/dashboard/staff-dashboard-data";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { getStaffWorkspaceLabel, getStaffWorkspaceSubtitle } from "@/lib/staff-workspace";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  error: string;
};

export function AttendanceOfficerDashboard({ error }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const base = await loadStaffDashboardBase();
        setSchoolName(base.schoolName);
        setAdminDay(base.adminDay);

        const [analyticsData, students] = await Promise.all([
          getAdminAnalytics().catch(() => null),
          listStudents().catch(() => []),
        ]);
        if (analyticsData) setAnalytics(analyticsData);
        setStudentCount(students.length);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const today = analytics?.attendanceToday;
  const staffToday = analytics?.staffAttendanceToday;
  const totalStudents = today?.totalStudents || studentCount;

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText={t("staffDash.loadingAttendance")}
      chips={
        today ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="attendance" className="dash-icon--sm" />
            <span>
              {today.rate != null
                ? t("staffDash.presentTodayChip", { rate: today.rate })
                : t("staffDash.noMarksYetToday")}
            </span>
          </div>
        ) : null
      }
    >
      {analytics && today ? (
        <>
          <StaffKpiGrid label={t("staffDash.attendanceMetrics")}>
            <Link href="/admin/attendance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.attendanceToday")}</p>
                <p className="dash-admin-kpi__value">
                  {today.rate != null ? `${today.rate}%` : "—"}
                </p>
                <p className="dash-admin-kpi__hint">{t("staffDash.presentRate")}</p>
              </div>
            </Link>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                <DashIcon name="students" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("staffDash.markedToday")}</p>
                <p className="dash-admin-kpi__value">{today.marked}</p>
                <p className="dash-admin-kpi__hint">
                  {t("staffDash.ofStudents", { count: totalStudents })}
                </p>
              </div>
            </article>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.absent")}</p>
                <p className="dash-admin-kpi__value">{today.absent}</p>
                <p className="dash-admin-kpi__hint">{t("staffDash.presentHint", { count: today.present })}</p>
              </div>
            </article>

            <Link
              href="/admin/staff-attendance"
              className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
            >
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
                <DashIcon name="users" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("staffDash.staffToday")}</p>
                <p className="dash-admin-kpi__value">
                  {staffToday
                    ? `${staffToday.present + staffToday.late}`
                    : "—"}
                </p>
                <p className="dash-admin-kpi__hint">
                  {staffToday
                    ? t("adminDash.staffMarked", {
                        marked: staffToday.marked,
                        total: staffToday.totalStaff,
                        late: staffToday.late,
                      })
                    : t("staffDash.openStaffAttendance")}
                </p>
              </div>
            </Link>
          </StaffKpiGrid>

          <section className="da-analytics" aria-label={t("staffDash.attendanceAnalyticsAria")}>
            <div className="da-analytics__grid">
              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("staffDash.weeklyTrend")}</h2>
                    <p className="da-card__sub">{t("adminDash.dailyRate7")}</p>
                  </div>
                  <Link href="/admin/attendance" className="da-card__link">
                    {t("dash.markAttendance")} <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <AttendanceTrendChart trend={analytics.attendanceTrend} />
              </article>

              <article className="da-card">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("adminDash.today")}</h2>
                    <p className="da-card__sub">{t("adminDash.liveAttendance")}</p>
                  </div>
                </header>
                <AttendanceTodayRing today={today} />
              </article>

              <article className="da-card">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">{t("adminDash.byGradeToday")}</h2>
                    <p className="da-card__sub">{t("adminDash.byGradeTodaySub")}</p>
                  </div>
                </header>
                <GradeAttendanceBars grades={analytics.gradeAttendance} />
                {analytics.insights.mostAbsentGrade ? (
                  <p className="da-insight da-insight--warn">
                    {t("adminDash.needsAttention")}{" "}
                    <strong>{analytics.insights.mostAbsentGrade.label}</strong> (
                    {analytics.insights.mostAbsentGrade.rate}%)
                  </p>
                ) : null}
              </article>
            </div>
          </section>
        </>
      ) : (
        <div className="da-feed-empty">
          <p>{t("staffDash.attendanceUnavailable")}</p>
        </div>
      )}
    </StaffDashboardShell>
  );
}