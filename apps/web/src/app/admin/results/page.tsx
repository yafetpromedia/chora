"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import {
  approveResultWorkflow,
  getReportCard,
  listPendingWorkflow,
  listTerms,
  openReportCardPrint,
  publishResultWorkflow,
  type AcademicTerm,
  type PendingWorkflowItem,
  type ReportCard,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminResultsPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [termId, setTermId] = useState("");
  const [viewStudentId, setViewStudentId] = useState("");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [pending, setPending] = useState<PendingWorkflowItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([listTerms(), listStudents(), listPendingWorkflow()])
      .then(([t, st, pw]) => {
        setTerms(t);
        setStudents(st);
        setPending(pw);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId(current.id);
        if (st[0]) setViewStudentId(st[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [router]);

  async function refreshPending() {
    setPending(await listPendingWorkflow());
  }

  async function onApprove(termId: string, classSubjectId: string) {
    try {
      await approveResultWorkflow(termId, classSubjectId);
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function onPublish(termId: string, classSubjectId: string) {
    try {
      await publishResultWorkflow(termId, classSubjectId);
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    }
  }

  async function onPreviewReport() {
    if (!viewStudentId || !termId) return;
    setError("");
    try {
      setReport(await getReportCard(viewStudentId, termId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Results"
      subtitle="Terms, weighted exams, numeric + letter grades, printable report cards."
      eyebrow="Academics"
    >
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

        <p className="setup-hint">
          <Link href="/admin/results/academic-years">Academic years</Link>
          {" · "}
          <Link href="/admin/results/subjects">Subject & teacher assignment</Link>
          {" · "}
          <Link href="/admin/results/templates">Assessment templates</Link>
        </p>

        {pending.length > 0 ? (
          <section className="att-admin-section" style={{ borderTop: "none", marginTop: 0 }}>
            <h2 className="setup-panel-label">Pending approvals</h2>
            <ul className="setup-student-list">
              {pending.map((p) => {
                const cs = p.classSubject;
                const label = `${cs.grade.name}${cs.section ? ` ${cs.section.name}` : ""} — ${cs.subject.name}`;
                return (
                  <li key={p.id}>
                    <strong>{label}</strong> · {p.term.name}
                    {p.submitter
                      ? ` · ${p.submitter.firstName} ${p.submitter.lastName}`
                      : ""}
                    <div className="setup-actions-row" style={{ marginTop: "0.35rem" }}>
                      <button
                        type="button"
                        className="auth-page-submit"
                        onClick={() => void onApprove(p.termId, p.classSubjectId)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="dash-copy-btn"
                        onClick={() => void onPublish(p.termId, p.classSubjectId)}
                      >
                        Publish
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="att-admin-section" style={{ borderTop: "none", marginTop: 0 }}>
          <h2 className="setup-panel-label">Enter scores (matrix)</h2>
          <ScoreMatrixPanel role="admin" />
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Terms</h2>
          <p className="setup-hint">
            {terms.map((t) => `${t.name} (${t.academicYear.name})`).join(" · ") || "No terms yet"}
          </p>
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Preview report card</h2>
          <div className="att-filters">
            <label className="att-field att-field--wide">
              <span>Student</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
                value={viewStudentId}
                onChange={(e) => setViewStudentId(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.firstName} {s.user.lastName} — {s.grade.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="setup-actions-row">
            <button type="button" className="auth-page-submit" onClick={() => void onPreviewReport()}>
              Load report
            </button>
            {viewStudentId && termId ? (
              <button
                type="button"
                className="dash-copy-btn"
                onClick={() => openReportCardPrint(viewStudentId, termId)}
              >
                Print / PDF
              </button>
            ) : null}
          </div>

          {report ? (
            <div className="att-summary-block" style={{ marginTop: "1rem" }}>
              <p className="att-summary-rate">
                {report.overallAverage ?? "—"}% {report.overallLetter ? `(${report.overallLetter})` : ""}
              </p>
              {report.rank ? (
                <p className="setup-hint">
                  Rank {report.rank} of {report.classSize}
                </p>
              ) : null}
              {report.attendance?.rate != null ? (
                <p className="setup-hint">
                  Attendance {report.attendance.rate}% ({report.attendance.present}/
                  {report.attendance.total} days)
                </p>
              ) : null}
              <ul className="setup-student-list">
                {report.subjects.map((s) => (
                  <li key={s.subject}>
                    <strong>{s.subject}</strong> — {s.average}% ({s.letter})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

    </DashboardPage>
  );
}
