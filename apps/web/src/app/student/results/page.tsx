"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { apiFetch, type ResultRecord } from "@/lib/api";
import {
  getMyReportCard,
  listTerms,
  openMyReportCardPrint,
  type AcademicTerm,
  type ReportCard,
} from "@/lib/results";

export default function StudentResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [termId, setTermId] = useState("");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
      return;
    }

    void Promise.all([apiFetch<ResultRecord[]>("/results/student"), listTerms()])
      .then(([rows, availableTerms]) => {
        setResults(rows);
        setTerms(availableTerms);
        const current = availableTerms.find((t) => t.isCurrent) ?? availableTerms[0];
        if (current) setTermId(current.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onLoadReportCard() {
    if (!termId) return;
    setError("");
    setReportLoading(true);
    try {
      setReport(await getMyReportCard(termId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report card");
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (!termId || loading) return;
    void onLoadReportCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, loading]);

  return (
    <DashboardPage role="student" title="My results" eyebrow="Academics">
      <section className="dash-panel dash-panel--flat">
        <div className="dash-panel-head">
          <h2 className="dash-panel-title">Published results</h2>
          <span className="dash-panel-badge">{results.length} subjects</span>
        </div>

        {error ? <p className="att-toast att-toast--error">{error}</p> : null}

        {loading ? (
          <p className="setup-hint">Loading results…</p>
        ) : results.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon" aria-hidden>
              📊
            </div>
            <p>No results published yet.</p>
          </div>
        ) : (
          <ul className="dash-list">
            {results.map((row) => (
              <li key={row.id} className="dash-list-item">
                <div>
                  <p className="dash-list-title">{row.subject}</p>
                  <p className="dash-list-meta">Student {row.studentId}</p>
                </div>
                <span className="dash-score">{row.score}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dash-panel dash-panel--flat">
        <div className="dash-panel-head">
          <h2 className="dash-panel-title">Report card</h2>
          <span className="dash-panel-badge">By term</span>
        </div>

        <div className="att-filters">
          <label className="att-field att-field--wide">
            <span>Term</span>
            <select
              className="auth-input auth-input--login auth-input--login-plain"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={loading || terms.length === 0}
            >
              {terms.length === 0 ? (
                <option value="">No terms available</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.academicYear.name})
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="setup-actions-row">
          <button
            type="button"
            className="auth-page-submit"
            onClick={() => void onLoadReportCard()}
            disabled={!termId || reportLoading}
          >
            {reportLoading ? "Loading…" : "Load report card"}
          </button>
          {termId ? (
            <button
              type="button"
              className="dash-copy-btn"
              onClick={() => openMyReportCardPrint(termId)}
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
                Attendance {report.attendance.rate}% ({report.attendance.present}/{report.attendance.total}
                {" "}days)
              </p>
            ) : null}
            <ul className="setup-student-list">
              {report.subjects.map((subject) => (
                <li key={subject.subject}>
                  <strong>{subject.subject}</strong> — {subject.average}% ({subject.letter})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </DashboardPage>
  );
}
