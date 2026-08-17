"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText="Loading attendance analytics…"
      chips={
        today ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="attendance" className="dash-icon--sm" />
            <span>
              {today.rate != null ? `${today.rate}% present today` : "No marks yet today"}
            </span>
          </div>
        ) : null
      }
    >
      {analytics && today ? (
        <>
          <StaffKpiGrid label="Attendance metrics">
            <Link href="/admin/attendance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Attendance today</p>
                <p className="dash-admin-kpi__value">
                  {today.rate != null ? `${today.rate}%` : "—"}
                </p>
                <p className="dash-admin-kpi__hint">Present rate</p>
              </div>
            </Link>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                <DashIcon name="students" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Marked today</p>
                <p className="dash-admin-kpi__value">{today.marked}</p>
                <p className="dash-admin-kpi__hint">of {today.totalStudents || studentCount} students</p>
              </div>
            </article>

            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="attendance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Absent</p>
                <p className="dash-admin-kpi__value">{today.absent}</p>
                <p className="dash-admin-kpi__hint">{today.present} present</p>
              </div>
            </article>

            <Link href="/admin/students" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
                <DashIcon name="students" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">On roll</p>
                <p className="dash-admin-kpi__value">{studentCount}</p>
                <p className="dash-admin-kpi__hint">Total enrolled students</p>
              </div>
            </Link>
          </StaffKpiGrid>

          <section className="da-analytics" aria-label="Attendance analytics">
            <div className="da-analytics__grid">
              <article className="da-card da-card--span2">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">Weekly trend</h2>
                    <p className="da-card__sub">Daily attendance rate — last 7 days</p>
                  </div>
                  <Link href="/admin/attendance" className="da-card__link">
                    Mark attendance <DashIcon name="chevron" className="dash-icon--xs" />
                  </Link>
                </header>
                <AttendanceTrendChart trend={analytics.attendanceTrend} />
              </article>

              <article className="da-card">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">Today</h2>
                    <p className="da-card__sub">Live roll status</p>
                  </div>
                </header>
                <AttendanceTodayRing today={today} />
              </article>

              <article className="da-card">
                <header className="da-card__head">
                  <div>
                    <h2 className="da-card__title">By grade today</h2>
                    <p className="da-card__sub">Tap a grade for section detail</p>
                  </div>
                </header>
                <GradeAttendanceBars grades={analytics.gradeAttendance} />
                {analytics.insights.mostAbsentGrade ? (
                  <p className="da-insight da-insight--warn">
                    Needs attention: <strong>{analytics.insights.mostAbsentGrade.label}</strong> (
                    {analytics.insights.mostAbsentGrade.rate}%)
                  </p>
                ) : null}
              </article>
            </div>
          </section>
        </>
      ) : (
        <div className="da-feed-empty">
          <p>Attendance data is not available yet.</p>
        </div>
      )}
    </StaffDashboardShell>
  );
}
