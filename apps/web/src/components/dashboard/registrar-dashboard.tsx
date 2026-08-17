"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, type SchoolInfo } from "@/lib/api";
import {
  listAdmissionApplications,
  listAdmissionCycles,
  type AdmissionApplication,
  type AdmissionCycle,
} from "@/lib/admissions";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { listParents, type ParentRecord } from "@/lib/parents";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { RegistrarAnalyticsSection } from "@/components/dashboard/registrar-analytics";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { readSchoolBrand } from "@/lib/school-brand";
import { getStaffWorkspaceSubtitle } from "@/lib/staff-workspace";
import { hasPermission, Permission } from "@/lib/permissions";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  error: string;
};

const PIPELINE_STATUSES = new Set(["APPLIED", "SCORED", "PLACED", "ACCEPTED"]);

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function RegistrarDashboard({ error }: Props) {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(readSchoolBrand().name ?? BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [cycles, setCycles] = useState<AdmissionCycle[]>([]);

  const canStudents = hasPermission(Permission.STUDENTS_READ);
  const canAdmissions = hasPermission(Permission.ADMISSIONS_READ);

  useEffect(() => {
    const load = async () => {
      try {
        const tasks: Promise<void>[] = [
          apiFetch<{ school: SchoolInfo | null }>("/schools/me")
            .then((res) => {
              if (res.school?.name) setSchoolName(res.school.name);
            })
            .catch(() => undefined),
          apiFetch<Record<string, unknown> & { day?: AdminDayOverview }>("/dashboards/me")
            .then((data) => {
              if (data.day?.kind === "admin_day") setAdminDay(data.day);
            })
            .catch(() => undefined),
        ];

        if (canStudents) {
          tasks.push(
            listStudents().then(setStudents).catch(() => undefined),
            listParents().then(setParents).catch(() => undefined),
          );
        }

        if (canAdmissions) {
          tasks.push(
            listAdmissionApplications().then(setApplications).catch(() => undefined),
            listAdmissionCycles().then(setCycles).catch(() => undefined),
          );
        }

        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [canStudents, canAdmissions]);

  const metrics = useMemo(() => {
    const linkedIds = new Set(parents.flatMap((p) => p.children.map((c) => c.profileId)));
    const linkedStudents = students.filter((s) => linkedIds.has(s.id)).length;
    const linkagePct =
      students.length > 0 ? Math.round((linkedStudents / students.length) * 100) : 0;
    const pipeline = applications.filter((a) => PIPELINE_STATUSES.has(a.status)).length;
    const readyToEnroll = applications.filter((a) => a.status === "ACCEPTED").length;
    const openCycle = cycles.find((c) => c.isOpen);

    return {
      linkedStudents,
      linkagePct,
      pipeline,
      readyToEnroll,
      openCycle,
    };
  }, [students, parents, applications, cycles]);

  return (
    <div className="dash-admin dash-admin--modern">
      <header className="dash-admin-hero dash-admin-hero--modern">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">Registrar · {todayLabel()}</p>
          <h1 className="dash-admin-hero__title">{schoolName}</h1>
          <p className="dash-admin-hero__sub">{getStaffWorkspaceSubtitle()}</p>
        </div>
        <div className="dash-admin-hero__aside">
          {adminDay?.academicYear ? (
            <div className="dash-admin-hero__chip">
              <DashIcon name="calendar" className="dash-icon--sm" />
              <span>{adminDay.academicYear.name}</span>
              {adminDay.currentTerm ? (
                <span className="dash-admin-hero__chip-term">· {adminDay.currentTerm.name}</span>
              ) : null}
            </div>
          ) : null}
          {metrics.openCycle ? (
            <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
              <DashIcon name="students" className="dash-icon--sm" />
              <span>
                {metrics.openCycle.name}
                {metrics.openCycle.isOpen ? " · open" : " · closed"}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert" role="alert">
          {error}
        </section>
      ) : null}

      {loading ? (
        <div className="dash-loading dash-loading--pro">
          <span className="dash-loading-spinner" aria-hidden />
          <p>Loading registrar analytics…</p>
        </div>
      ) : (
        <>
          <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label="Registrar metrics">
            {canStudents ? (
              <Link
                href="/admin/students"
                className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
              >
                <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                  <DashIcon name="students" />
                </span>
                <div>
                  <p className="dash-admin-kpi__label">Students enrolled</p>
                  <p className="dash-admin-kpi__value">{students.length}</p>
                  <p className="dash-admin-kpi__hint">Active on roll</p>
                </div>
              </Link>
            ) : null}

            {canAdmissions ? (
              <Link
                href="/admin/admissions"
                className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
              >
                <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                  <DashIcon name="students" />
                </span>
                <div>
                  <p className="dash-admin-kpi__label">In pipeline</p>
                  <p className="dash-admin-kpi__value">{metrics.pipeline}</p>
                  <p className="dash-admin-kpi__hint">
                    {metrics.readyToEnroll > 0
                      ? `${metrics.readyToEnroll} ready to enroll`
                      : "Applications in progress"}
                  </p>
                </div>
              </Link>
            ) : null}

            {canStudents ? (
              <Link
                href="/admin/parents"
                className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
              >
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

            {canStudents ? (
              <Link
                href="/admin/parents"
                className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
              >
                <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                  <DashIcon name="profile" />
                </span>
                <div>
                  <p className="dash-admin-kpi__label">Parent linkage</p>
                  <p className="dash-admin-kpi__value">{metrics.linkagePct}%</p>
                  <p className="dash-admin-kpi__hint">
                    {metrics.linkedStudents} of {students.length} students linked
                  </p>
                </div>
              </Link>
            ) : null}
          </section>

          <RegistrarAnalyticsSection
            metrics={{ students, parents, applications, cycles }}
          />
        </>
      )}
    </div>
  );
}
