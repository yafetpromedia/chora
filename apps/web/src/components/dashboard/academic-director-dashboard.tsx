"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listStudents } from "@/lib/school-setup";
import { listClassroomTeachers } from "@/lib/teachers";
import { listSubjects } from "@/lib/results";
import { getAdminAnalytics, type AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import type { TeacherRecord } from "@/lib/teachers";
import type { Subject } from "@/lib/results";
import {
  BarChart,
  GradeAttendanceBars,
  StaffDashboardShell,
  StaffKpiGrid,
  enrollmentByClass,
} from "@/components/dashboard/staff-dashboard-shared";
import { loadStaffDashboardBase } from "@/components/dashboard/staff-dashboard-data";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { getStaffWorkspaceLabel, getStaffWorkspaceSubtitle } from "@/lib/staff-workspace";
import { hasPermission, Permission } from "@/lib/permissions";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  error: string;
};

export function AcademicDirectorDashboard({ error }: Props) {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listStudents>>>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null);

  const canAttendanceAnalytics = hasPermission(Permission.ATTENDANCE_ANALYTICS);

  useEffect(() => {
    const load = async () => {
      try {
        const base = await loadStaffDashboardBase();
        setSchoolName(base.schoolName);
        setAdminDay(base.adminDay);

        const tasks: Promise<void>[] = [
          listStudents().then(setStudents).catch(() => undefined),
          listClassroomTeachers().then(setTeachers).catch(() => undefined),
          listSubjects().then(setSubjects).catch(() => undefined),
        ];

        if (canAttendanceAnalytics) {
          tasks.push(getAdminAnalytics().then(setAnalytics).catch(() => undefined));
        }

        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canAttendanceAnalytics]);

  const homeroomCount = useMemo(
    () => teachers.filter((t) => t.homeroom).length,
    [teachers],
  );

  const classRows = enrollmentByClass(students).map((r) => ({
    label: r.label,
    value: r.value,
    color: "var(--brand-teal-dark)",
  }));

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText="Loading academic analytics…"
      chips={
        adminDay ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="calendar" className="dash-icon--sm" />
            <span>{adminDay.staff.classesActive} classes active</span>
          </div>
        ) : null
      }
    >
      <StaffKpiGrid label="Academic metrics">
        <Link href="/admin/students" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="students" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Students</p>
            <p className="dash-admin-kpi__value">{students.length}</p>
            <p className="dash-admin-kpi__hint">Enrolled on roll</p>
          </div>
        </Link>

        <Link href="/admin/staff" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="teachers" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Teachers</p>
            <p className="dash-admin-kpi__value">{teachers.length}</p>
            <p className="dash-admin-kpi__hint">{homeroomCount} homeroom leads</p>
          </div>
        </Link>

        <Link href="/admin/academics/subjects" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="calendar" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Subjects</p>
            <p className="dash-admin-kpi__value">{subjects.length}</p>
            <p className="dash-admin-kpi__hint">In curriculum</p>
          </div>
        </Link>

        <Link href="/admin/academics" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="attendance" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Classes active</p>
            <p className="dash-admin-kpi__value">{adminDay?.staff.classesActive ?? "—"}</p>
            <p className="dash-admin-kpi__hint">This term</p>
          </div>
        </Link>
      </StaffKpiGrid>

      <section className="da-analytics" aria-label="Academic analytics">
        <div className="da-analytics__grid">
          <article className="da-card da-card--span2">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">Enrollment by class</h2>
                <p className="da-card__sub">Student distribution across grades</p>
              </div>
              <Link href="/admin/students" className="da-card__link">
                Students <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <BarChart rows={classRows} emptyText="No students enrolled yet." />
          </article>

          <article className="da-card">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">Curriculum</h2>
                <p className="da-card__sub">{subjects.length} subjects offered</p>
              </div>
              <Link href="/admin/academics/subjects" className="da-card__link">
                Subjects <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            {subjects.length === 0 ? (
              <div className="da-feed-empty"><p>No subjects configured yet.</p></div>
            ) : (
              <ul className="reg-recent">
                {subjects.slice(0, 6).map((s) => (
                  <li key={s.id} className="reg-recent__item">
                    <div>
                      <p className="reg-recent__name">{s.name}</p>
                      <p className="reg-recent__meta">{s.code}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {canAttendanceAnalytics && analytics ? (
            <article className="da-card">
              <header className="da-card__head">
                <div>
                  <h2 className="da-card__title">Attendance by grade</h2>
                  <p className="da-card__sub">Tap a grade for section detail</p>
                </div>
              </header>
              <GradeAttendanceBars grades={analytics.gradeAttendance} />
            </article>
          ) : null}

          <article className="da-card">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">Teaching staff</h2>
                <p className="da-card__sub">Homeroom assignments</p>
              </div>
              <Link href="/admin/staff" className="da-card__link">
                Staff <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <BarChart
              rows={[
                {
                  label: "Homeroom leads",
                  value: homeroomCount,
                  color: "var(--brand-teal-dark)",
                },
                {
                  label: "Subject teachers",
                  value: Math.max(0, teachers.length - homeroomCount),
                  color: "var(--brand-teal)",
                },
              ]}
              emptyText="No teachers on record."
            />
          </article>
        </div>
      </section>
    </StaffDashboardShell>
  );
}
