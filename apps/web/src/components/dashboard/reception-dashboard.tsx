"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Announcement } from "@/lib/api";
import { listAdmissionApplications, type AdmissionApplication } from "@/lib/admissions";
import { listParents, type ParentRecord } from "@/lib/parents";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import type { AdminDayOverview } from "@/lib/dashboard-day";
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ReceptionDashboard({ error, announcements }: Props) {
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
      loadingText="Loading front desk analytics…"
      chips={
        canStudents ? (
          <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
            <DashIcon name="users" className="dash-icon--sm" />
            <span>{students.length} students · {parents.length} families</span>
          </div>
        ) : null
      }
    >
      <StaffKpiGrid label="Reception metrics">
        {canStudents ? (
          <Link href="/admin/students" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
              <DashIcon name="students" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Students on roll</p>
              <p className="dash-admin-kpi__value">{students.length}</p>
              <p className="dash-admin-kpi__hint">For visitor lookups</p>
            </div>
          </Link>
        ) : null}

        {canAdmissions ? (
          <Link href="/admin/admissions" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
              <DashIcon name="students" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Open inquiries</p>
              <p className="dash-admin-kpi__value">{metrics.pipeline}</p>
              <p className="dash-admin-kpi__hint">
                {metrics.newToday > 0 ? `${metrics.newToday} new today` : "Applications in progress"}
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
              <p className="dash-admin-kpi__label">Family accounts</p>
              <p className="dash-admin-kpi__value">{parents.length}</p>
              <p className="dash-admin-kpi__hint">Parent portal logins</p>
            </div>
          </Link>
        ) : null}

        <Link href="/admin/announcements" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="announcements" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Announcements</p>
            <p className="dash-admin-kpi__value">{announcements.length}</p>
            <p className="dash-admin-kpi__hint">Campus updates published</p>
          </div>
        </Link>
      </StaffKpiGrid>

      <section className="da-analytics" aria-label="Reception analytics">
        <div className="da-analytics__grid">
          {canStudents ? (
            <article className="da-card da-card--span2">
              <header className="da-card__head">
                <div>
                  <h2 className="da-card__title">Enrollment snapshot</h2>
                  <p className="da-card__sub">Quick class lookup for visitors</p>
                </div>
                <Link href="/admin/students" className="da-card__link">
                  Students <DashIcon name="chevron" className="dash-icon--xs" />
                </Link>
              </header>
              <BarChart rows={classRows} emptyText="No students enrolled yet." />
            </article>
          ) : null}

          {canAdmissions ? (
            <article className="da-card">
              <header className="da-card__head">
                <div>
                  <h2 className="da-card__title">Recent inquiries</h2>
                  <p className="da-card__sub">Latest admission applications</p>
                </div>
                <Link href="/admin/admissions" className="da-card__link">
                  Admissions <DashIcon name="chevron" className="dash-icon--xs" />
                </Link>
              </header>
              {recentApps.length === 0 ? (
                <div className="da-feed-empty"><p>No applications yet.</p></div>
              ) : (
                <ul className="reg-recent">
                  {recentApps.map((app) => (
                    <li key={app.id} className="reg-recent__item">
                      <div>
                        <p className="reg-recent__name">{app.firstName} {app.lastName}</p>
                        <p className="reg-recent__meta">
                          {app.status.replace("_", " ").toLowerCase()}
                          {app.targetGrade ? ` · ${app.targetGrade.name}` : ""}
                        </p>
                      </div>
                      <span className="reg-recent__score">{formatDate(app.appliedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : null}

          <article className="da-card da-card--feed">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">Campus updates</h2>
                <p className="da-card__sub">Announcements you can share</p>
              </div>
              <Link href="/admin/announcements" className="da-card__link">
                Manage <DashIcon name="chevron" className="dash-icon--xs" />
              </Link>
            </header>
            {announcements.length === 0 ? (
              <div className="da-feed-empty"><p>No announcements yet.</p></div>
            ) : (
              <ul className="dash-admin-feed">
                {announcements.slice(0, 4).map((item) => (
                  <li key={item.id} className="dash-admin-feed__item">
                    <div>
                      <p className="dash-admin-feed__title">{item.title}</p>
                      <p className="dash-admin-feed__meta">{formatDate(item.createdAt)}</p>
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
