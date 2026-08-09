"use client";

import Link from "next/link";
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

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCORED: "Scored",
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  ENROLLED: "Enrolled",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

function EnrollmentByGrade({ students }: { students: StudentRecord[] }) {
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
    return <p className="da-chart__empty">No students enrolled yet.</p>;
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
  const counts = Object.fromEntries(
    Object.keys(STATUS_LABELS).map((s) => [s, 0]),
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
    return <p className="da-chart__empty">No applications this cycle.</p>;
  }

  return (
    <ul className="da-enroll">
      {rows.map((row) => (
        <li key={row.status}>
          <div className="da-enroll__head">
            <span>{STATUS_LABELS[row.status]}</span>
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
          <span className="da-finance__pct-label">linked</span>
        </div>
      </div>
      <ul className="da-finance__legend">
        <li>
          <span className="da-finance__dot da-finance__dot--collected" />
          Linked <strong>{linked}</strong>
        </li>
        <li>
          <span className="da-finance__dot da-finance__dot--outstanding" />
          Unlinked <strong>{unlinked}</strong>
        </li>
        <li className="da-finance__meta">
          {total} students on roll
        </li>
      </ul>
    </div>
  );
}

function RecentApplications({ applications }: { applications: AdmissionApplication[] }) {
  const recent = [...applications]
    .filter((a) => a.status !== "ENROLLED")
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="da-feed-empty">
        <p>No open applications.</p>
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
              {STATUS_LABELS[app.status]}
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
  const { students, parents, applications } = metrics;

  const linkedIds = new Set(parents.flatMap((p) => p.children.map((c) => c.profileId)));
  const linkedStudents = students.filter((s) => linkedIds.has(s.id)).length;

  const openCycle = metrics.cycles.find((c) => c.isOpen) ?? metrics.cycles[0];
  const pipelineCount = applications.filter((a) =>
    PIPELINE_STATUSES.includes(a.status as (typeof PIPELINE_STATUSES)[number]),
  ).length;

  return (
    <section className="da-analytics" aria-label="Registrar analytics">
      <div className="da-analytics__grid">
        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Enrollment by class</h2>
              <p className="da-card__sub">
                {students.length} student{students.length === 1 ? "" : "s"} on roll
              </p>
            </div>
            <Link href="/admin/students" className="da-card__link">
              Student roster <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <EnrollmentByGrade students={students} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Parent portal</h2>
              <p className="da-card__sub">Family account linkage</p>
            </div>
            <Link href="/admin/parents" className="da-card__link">
              Parents <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <ParentLinkageRing linked={linkedStudents} total={students.length} />
        </article>

        <article className="da-card da-card--span2">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Admissions pipeline</h2>
              <p className="da-card__sub">
                {openCycle ? openCycle.name : "No cycle"}
                {pipelineCount > 0 ? ` · ${pipelineCount} in progress` : ""}
              </p>
            </div>
            <Link href="/admin/admissions" className="da-card__link">
              Admissions <DashIcon name="chevron" className="dash-icon--xs" />
            </Link>
          </header>
          <AdmissionsPipeline applications={applications} />
        </article>

        <article className="da-card">
          <header className="da-card__head">
            <div>
              <h2 className="da-card__title">Recent applications</h2>
              <p className="da-card__sub">Awaiting action</p>
            </div>
          </header>
          <RecentApplications applications={applications} />
        </article>
      </div>
    </section>
  );
}
