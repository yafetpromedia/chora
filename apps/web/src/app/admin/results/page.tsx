"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { PendingApprovalsPanel } from "@/components/results/pending-approvals-panel";
import { ReportCardCommentsPanel } from "@/components/results/report-card-comments-panel";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import {
  getReportCard,
  listTerms,
  openReportCardPrint,
  type AcademicTerm,
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([listTerms(), listStudents()])
      .then(([t, st]) => {
        setTerms(t);
        setStudents(st);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId(current.id);
        if (st[0]) setViewStudentId(st[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [router]);

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
      eyebrow="Academics"
    >
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

        <section className="att-admin-section" style={{ borderTop: "none", marginTop: 0 }}>
          <div className="setup-actions-row">
            <Link href="/admin/results/templates" className="auth-page-submit">
              Assessment templates
            </Link>
          </div>
          <p className="tch-meta" style={{ marginTop: "0.5rem" }}>
            Configure worksheet, activity, quiz, test, and assignment weights per grade or class.
          </p>
        </section>

        <PendingApprovalsPanel
          terms={terms}
          defaultTermId={termId}
          onError={(message) => setError(message)}
        />

        <section className="att-admin-section" style={{ borderTop: "none", marginTop: 0 }}>
          <h2 className="setup-panel-label">Enter scores (matrix)</h2>
          <ScoreMatrixPanel role="admin" />
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Terms</h2>
          <p className="tch-meta">
            {terms.map((t) => `${t.name} (${t.academicYear.name})`).join(" · ") || "No terms yet"}
          </p>
          <p className="setup-hint" style={{ marginTop: "0.5rem" }}>
            <a href="/admin/academics">Academics hub</a>
            {" · "}
            <a href="/admin/results/terms">Manage terms</a>
            {" · "}
            <a href="/admin/results/academic-years">Academic years</a>
          </p>
        </section>

        <ReportCardCommentsPanel
          terms={terms}
          students={students}
          defaultTermId={termId}
          defaultStudentId={viewStudentId}
        />

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
                <p className="tch-meta">
                  Rank {report.rank} of {report.classSize}
                </p>
              ) : null}
              {report.attendance?.rate != null ? (
                <p className="tch-meta">
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
