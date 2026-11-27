"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AdmissionApplication, AdmissionCycle } from "@/lib/admissions";
import type { ParentRecord } from "@/lib/parents";
import type { StudentRecord } from "@/lib/api";
import { DashIcon } from "./dash-icons";

export type RegistrarMetrics = {
  students: StudentRecord[];
  parents: ParentRecord[];
  applications: AdmissionApplication[];
  cycles: AdmissionCycle[];
};

const PIPELINE_STATUSES = ["APPLIED", "SCORED", "PLACED", "ACCEPTED"] as const;

function useAdmissionStatusLabels() {
  const { t } = useLocale();
  return (status: string) => {
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
  };
}

function EnrollmentByGrade({ students }: { students: StudentRecord[] }) {
  const { t } = useLocale();
  const byGrade = new Map<string, number>();
  for (const s of students) {
    const label = s.section ? `${s.grade.name} · ${s.section.name}` : s.grade.name;
    byGrade.set(label, (byGrade.get(label) ?? 0) + 1);
  }

  const rows = [...byGrade.entries()]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count || a.grade.localeCompare(b.grade));

  const max = Math.max(1, ...rows.map((r) => r.count));

  if (rows.length === 0) {
    return <p className="da-chart__empty">{t("staffDash.noStudentsEnrolled")}</p>;
  }

  return (
    <ul className="da-enroll">
      {rows.map((row) => (
        <li key={row.grade}>
          <div className="da-enroll__head">
            <span>{row.grade}</span>
            <strong>{row.count}</strong>
          </div>
          <div className="da-enroll__track">
            <div
              className="da-enroll__fill"
              style={{
                width: `${(row.count / max) * 100}%`,
                background: "var(--brand-teal)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdmissionsPipeline({ applications }: { applications: AdmissionApplication[] }) {
  const { t } = useLocale();
  const statusLabel = useAdmissionStatusLabels();

  const counts = Object.fromEntries(
    ["APPLIED", "SCORED", "PLACED", "ACCEPTED", "ENROLLED", "REJECTED", "WITHDRAWN"].map((s) => [
      s,
      0,
    ]),
  ) as Record<string, number>;

  for (const app of applications) {
    counts[app.status] = (counts[app.status] ?? 0) + 1;
  }

  const rows = [
    ...PIPELINE_STATUSES.map((s) => ({ status: s, count: counts[s] ?? 0, pipeline: true })),
    { status: "ENROLLED", count: counts.ENROLLED ?? 0, pipeline: false },
    { status: "REJECTED", count: counts.REJECTED ?? 0, pipeline: false },
    { status: "WITHDRAWN", count: counts.WITHDRAWN ?? 0, pipeline: false },
  ].filter((r) => r.count > 0 || r.pipeline);

  const max = Math.max(1, ...rows.map((r) => r.count));

  if (applications.length === 0) {
    return <p className="da-chart__empty">{t("staffDash.noApplicationsThisCycle")}</p>;
  }

  return (
    <ul className="da-enroll">
      {rows.map((row) => (
        <li key={row.status}>
          <div className="da-enroll__head">
            <span>{statusLabel(row.status)}</span>
            <strong>{row.count}</strong>
          </div>
          <div className="da-enroll__track">
            <div
              className="da-enroll__fill"
              style={{
                width: `${(row.count / max) * 100}%`,
                background: row.pipeline ? "var(--brand-teal-dark)" : "#94a3b8",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ParentLinkageRing({
  linked,
  total,
}: {
  linked: number;
  total: number;
}) {
  const { t } = useLocale();
  const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
  const deg = (pct / 100) * 360;
  const unlinked = total - linked;

  return (
    <div className="da-finance">
      <div
        className="da-finance__ring"
        style={{
          background: `conic-gradient(var(--brand-teal) 0deg ${deg}deg, #e8f4f4 ${deg}deg 360deg)`,
        }}
        aria-hidden
      >
        <div className="da-finance__ring-inner">
          <span className="da-finance__pct">{pct}%</span>
          <span className="da-finance__pct-label">{t("staffDash.linkedLabel")}</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot da-finance__dot--collected" />
          {t("staffDash.linkedLabel")} <strong>{linked}</strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          {t("staffDash.unlinked")} <strong>{unlinked}</strong>
        </li>
        <li className="da-finance__meta">
          {total === 1
            ? t("staffDash.oneStudentOnRoll")
            : t("staffDash.studentsOnRollPlural", { count: total })}
        </li>
      </ul>
    </div>
  );
}

function RecentApplications({ applications }: { applications: AdmissionApplication[] }) {
  const { t } = useLocale();
  const statusLabel = useAdmissionStatusLabels();

  const recent = [...applications]
    .filter((a) => a.status !== "ENROLLED")
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="da-feed-empty">
        <p>{t("staffDash.noOpenApplications")}</p>
      </div>
    );
  }

  return (
    <ul className="reg-recent">
      {recent.map((app) => (
        <li key={app.id} className="reg-recent__item">
          <div>
            <p className="reg-recent__name">
              {app.firstName} {app.lastName}
            </p>
            <p className="reg-recent__meta">
              {statusLabel(app.status)}
              {app.targetGrade ? ` · ${app.targetGrade.name}` : ""}
            </p>
          </div>
          {app.totalScore != null ? (
            <span className="reg-recent__score">{app.totalScore}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type Props = {
  metrics: RegistrarMetrics;
};

export function RegistrarAnalyticsSection({ metrics }: Props) {
  const { t } = useLocale();
  const { students, parents, applications } = metrics;

  const linkedIds = new Set(parents.flatMap((p) => p.children.map((c) => c.profileId)));
  const linkedStudents = students.filter((s) => linkedIds.has(s.id)).length;

  const openCycle = metrics.cycles.find((c) => c.isOpen) ?? metrics.cycles[0];
  const pipelineCount = applications.filter((a) =>
    PIPELINE_STATUSES.includes(a.status as (typeof PIPELINE_STATUSES)[number]),
  ).length;

  const rollSub =
    students.length === 1
      ? t("staffDash.oneStudentOnRoll")
      : t("staffDash.studentsOnRollPlural", { count: students.length });

  return (
    <section className="da-analytics" aria-label={t("staffDash.registrarAnalyticsAria")}>
      <div className="da-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("staffDash.enrollmentByClass")}</h2>
              <p className="da-card__sub">{rollSub}</p>
            </div>
            <Link href="/admin/students" className="da-card__link">
              {t("staffDash.studentRoster")} <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <EnrollmentByGrade students={students} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("staffDash.parentPortal")}</h2>
              <p className="da-card__sub">{t("staffDash.familyAccountLinkage")}</p>
            </div>
            <Link href="/admin/parents" className="da-card__link">
              {t("adminDash.parents")} <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <ParentLinkageRing linked={linkedStudents} total={students.length} />
        </article>

        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("staffDash.admissionsPipeline")}</h2>
              <p className="da-card__sub">
                {openCycle ? openCycle.name : t("staffDash.noCycle")}
                {pipelineCount > 0 ? t("staffDash.inProgress", { count: pipelineCount }) : ""}
              </p>
            </div>
            <Link href="/admin/admissions" className="da-card__link">
              {t("staffDash.admissions")} <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <AdmissionsPipeline applications={applications} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">{t("staffDash.recentApplications")}</h2>
              <p className="da-card__sub">{t("staffDash.awaitingAction")}</p>
            </div>
          </header>
          <RecentApplications applications={applications} />
        </article>
      </div>
    </section>
  );
}