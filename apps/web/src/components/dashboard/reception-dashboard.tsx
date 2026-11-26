"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Announcement } from "@/lib/api";
import { listAdmissionApplications, type AdmissionApplication } from "@/lib/admissions";
import { listParents, type ParentRecord } from "@/lib/parents";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import type { AppLocale } from "@/lib/i18n";
import {
  BarChart,
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
  announcements: Announcement[];
};

const PIPELINE = new Set(["APPLIED", "SCORED", "PLACED", "ACCEPTED"]);

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function formatDate(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function admissionStatusLabel(status: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    APPLIED: "admissionsUi.applied",
    SCORED: "admissionsUi.statusScored",
    PLACED: "admissionsUi.statusPlaced",
    ACCEPTED: "admissionsUi.accepted",
    ENROLLED: "admissionsUi.statusEnrolled",
    REJECTED: "admissionsUi.rejected",
    WITHDRAWN: "admissionsUi.withdrawn",
  };
  const key = keys[status];
  return key ? t(key) : status;
}

export function ReceptionDashboard({ error, announcements }: Props) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);

  const canStudents = hasPermission(Permission.STUDENTS_READ);
  const canAdmissions = hasPermission(Permission.ADMISSIONS_READ);

  useEffect(() => {
    const load = async () => {
      try {
        const base = await loadStaffDashboardBase();
        setSchoolName(base.schoolName);
        setAdminDay(base.adminDay);

        const tasks: Promise<void>[] = [];
        if (canStudents) {
          tasks.push(
            listStudents().then(setStudents).catch(() => undefined),
            listParents().then(setParents).catch(() => undefined),
          );
        }
        if (canAdmissions) {
          tasks.push(listAdmissionApplications().then(setApplications).catch(() => undefined));
        }
        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canStudents, canAdmissions]);

  const metrics = useMemo(() => {
    const pipeline = applications.filter((a) => PIPELINE.has(a.status)).length;
    const newToday = applications.filter((a) => {
      const d = new Date(a.appliedAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { pipeline, newToday };
  }, [applications]);

  const classRows = enrollmentByClass(students).map((r) => ({
    label: r.label,
    value: r.value,
    color: "var(--brand-teal)",
  }));

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 5);

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText={t("staffDash.loadingFrontDesk")}
      chips={
        canStudents ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="users" className="dash-icon--sm" />
            <span>
              {t("staffDash.studentsFamiliesChip", {
                students: students.length,
                families: parents.length,
              })}
            </span>
          </div>
        ) : null
      }
    >
      <StaffKpiGrid label={t("staffDash.receptionMetrics")}>
        {canStudents ? (
          <Link href="/admin/students" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
              <DashIcon name="students" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("staffDash.studentsOnRollLabel")}</p>
              <p className="dash-admin-kpi__value">{students.length}</p>
              <p className="dash-admin-kpi__hint">{t("staffDash.forVisitorLookups")}</p>
            </div>
          </Link>
        ) : null}

        {canAdmissions ? (
          <Link href="/admin/admissions" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
              <DashIcon name="students" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("staffDash.openInquiries")}</p>
              <p className="dash-admin-kpi__value">{metrics.pipeline}</p>
              <p className="dash-admin-kpi__hint">
                {metrics.newToday > 0
                  ? t("staffDash.newToday", { count: metrics.newToday })
                  : t("staffDash.applicationsInProgress")}
              </p>
            </div>
          </Link>
        ) : null}

        {canStudents ? (
          <Link href="/admin/parents" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
              <DashIcon name="users" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("staffDash.familyAccounts")}</p>
              <p className="dash-admin-kpi__value">{parents.length}</p>
              <p className="dash-admin-kpi__hint">{t("staffDash.parentPortalLogins")}</p>
            </div>
          </Link>
        ) : null}

        <Link href="/admin/announcements" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="announcements" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("adminDash.announcements")}</p>
            <p className="dash-admin-kpi__value">{announcements.length}</p>
            <p className="dash-admin-kpi__hint">{t("staffDash.campusUpdatesPublished")}</p>
          </div>
        </Link>
      </StaffKpiGrid>

      <section className="da-analytics" aria-label={t("staffDash.receptionAnalyticsAria")}>
        <div className="da-analytics__grid">
          {canStudents ? (
            <article className="da-card da-card--span2">
              <header className="da-card__head">
                <div>
                  <h2 className="da-card__title">{t("staffDash.enrollmentSnapshot")}</h2>
                  <p className="da-card__sub">{t("staffDash.quickClassLookup")}</p>
                </div>
                <Link href="/admin/students" className="da-card__link">
                  {t("adminDash.students")} <DashIcon name="chevron" className="dash-icon--xs" />
                </Link>
              </header>
              <BarChart rows={classRows} emptyText={t("staffDash.noStudentsEnrolled")} />
            </article>
          ) : null}

          {canAdmissions ? (
            <article className="da-card">
              <header className="da-card__head">
                <div>
                  <h2 className="da-card__title">{t("staffDash.recentInquiries")}</h2>
                  <p className="da-card__sub">{t("staffDash.latestAdmissionApplications")}</p>
                </div>
                <Link href="/admin/admissions" className="da-card__link">
                  {t("staffDash.admissions")} <DashIcon name="chevron" className="dash-icon--xs" />
                </Link>
              </header>
              {recentApps.length === 0 ? (
                <div className="da-feed-empty"><p>{t("staffDash.noApplicationsYet")}</p></div>
              ) : (
                <ul className="reg-recent">
                  {recentApps.map((app) => (
                    <li key={app.id} className="reg-recent__item">
                      <div>
                        <p className="reg-recent__name">{app.firstName} {app.lastName}</p>
                        <p className="reg-recent__meta">
                          {admissionStatusLabel(app.status, t)}
                          {app.targetGrade ? ` · ${app.targetGrade.name}` : ""}
                        </p>
                      </div>
                      <span className="reg-recent__score">{formatDate(app.appliedAt, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : null}

          <article className="da-card da-card--feed">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("staffDash.campusUpdatesShare")}</h2>
                <p className="da-card__sub">{t("staffDash.announcementsYouCanShare")}</p>
              </div>
              <Link href="/admin/announcements" className="da-card__link">
                {t("adminDash.manage")} <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            {announcements.length === 0 ? (
              <div className="da-feed-empty"><p>{t("adminDash.noAnnouncements")}</p></div>
            ) : (
              <ul className="dash-admin-feed">
                {announcements.slice(0, 4).map((item) => (
                  <li key={item.id} className="dash-admin-feed__item">
                    <div>
                      <p className="dash-admin-feed__title">{item.title}</p>
                      <p className="dash-admin-feed__meta">{formatDate(item.createdAt, locale)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </StaffDashboardShell>
  );
}