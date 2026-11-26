"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t } = useLocale();
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
      loadingText={t("staffDash.loadingAcademic")}
      chips={
        adminDay ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="calendar" className="dash-icon--sm" />
            <span>{t("adminDash.classesActive", { count: adminDay.staff.classesActive })}</span>
          </div>
        ) : null
      }
    >
      <StaffKpiGrid label={t("staffDash.academicMetrics")}>
        <Link href="/admin/students" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="students" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("adminDash.students")}</p>
            <p className="dash-admin-kpi__value">{students.length}</p>
            <p className="dash-admin-kpi__hint">{t("staffDash.enrolledOnRoll")}</p>
          </div>
        </Link>

        <Link href="/admin/staff" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="teachers" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("adminDash.teachers")}</p>
            <p className="dash-admin-kpi__value">{teachers.length}</p>
            <p className="dash-admin-kpi__hint">{t("staffDash.homeroomLeads", { count: homeroomCount })}</p>
          </div>
        </Link>

        <Link href="/admin/academics/subjects" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="calendar" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("staffDash.subjects")}</p>
            <p className="dash-admin-kpi__value">{subjects.length}</p>
            <p className="dash-admin-kpi__hint">{t("staffDash.inCurriculum")}</p>
          </div>
        </Link>

        <Link href="/admin/academics" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="attendance" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("staffDash.classesActiveLabel")}</p>
            <p className="dash-admin-kpi__value">{adminDay?.staff.classesActive ?? "—"}</p>
            <p className="dash-admin-kpi__hint">{t("staffDash.thisTerm")}</p>
          </div>
        </Link>
      </StaffKpiGrid>

      <section className="da-analytics" aria-label={t("staffDash.academicAnalyticsAria")}>
        <div className="da-analytics__grid">
          <article className="da-card da-card--span2">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("staffDash.enrollmentByClass")}</h2>
                <p className="da-card__sub">{t("staffDash.studentDistribution")}</p>
              </div>
              <Link href="/admin/students" className="da-card__link">
                {t("adminDash.students")} <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <BarChart rows={classRows} emptyText={t("staffDash.noStudentsEnrolled")} />
          </article>

          <article className="da-card">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("staffDash.curriculum")}</h2>
                <p className="da-card__sub">{t("staffDash.subjectsOffered", { count: subjects.length })}</p>
              </div>
              <Link href="/admin/academics/subjects" className="da-card__link">
                {t("staffDash.subjects")} <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            {subjects.length === 0 ? (
              <div className="da-feed-empty"><p>{t("staffDash.noSubjectsConfigured")}</p></div>
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
                  <h2 className="da-card__title">{t("adminDash.byGradeToday")}</h2>
                  <p className="da-card__sub">{t("adminDash.byGradeTodaySub")}</p>
                </div>
              </header>
              <GradeAttendanceBars grades={analytics.gradeAttendance} />
            </article>
          ) : null}

          <article className="da-card">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("staffDash.teachingStaff")}</h2>
                <p className="da-card__sub">{t("staffDash.homeroomAssignments")}</p>
              </div>
              <Link href="/admin/staff" className="da-card__link">
                {t("adminDash.staff")} <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            <BarChart
              rows={[
                {
                  label: t("staffDash.homeroomLeadsLabel"),
                  value: homeroomCount,
                  color: "var(--brand-teal-dark)",
                },
                {
                  label: t("staffDash.subjectTeachers"),
                  value: Math.max(0, teachers.length - homeroomCount),
                  color: "var(--brand-teal)",
                },
              ]}
              emptyText={t("staffDash.noTeachersOnRecord")}
            />
          </article>
        </div>
      </section>
    </StaffDashboardShell>
  );
}