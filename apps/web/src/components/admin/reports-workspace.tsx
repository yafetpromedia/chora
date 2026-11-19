"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { AppToast } from "@/components/ui/app-toast";
import { downloadAttendanceExport } from "@/lib/attendance";
import { downloadFinanceExport } from "@/lib/finance";
import {
  downloadParentsReport,
  downloadStudentsReport,
  downloadTeachersReport,
} from "@/lib/school-reports";
import { listGrades } from "@/lib/school-setup";
import {
  downloadResultsExport,
  listTerms,
  type AcademicTerm,
} from "@/lib/results";
import type { GradeWithSections } from "@/lib/api";

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function ReportsWorkspace() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [termId, setTermId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void Promise.all([listTerms(), listGrades()])
      .then(([termList, gradeList]) => {
        setTerms(termList);
        setGrades(gradeList);
        const current = termList.find((t) => t.isCurrent) ?? termList[0];
        if (current) setTermId((prev) => prev || current.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load reports");
      })
      .finally(() => setLoading(false));
  }, []);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms.find((t) => t.id === termId);

  async function runExport(id: string, action: () => Promise<void>) {
    setBusy(id);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess("Download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rpt-hub">
      <AcademicsHero
        chip="Data exports"
        title="Reports"
        subtitle="Download CSV files for attendance, fees, results, and school rosters. Print report cards from the Report cards workspace."
        stats={[
          { label: "Terms", value: loading ? "—" : terms.length },
          { label: "Grades", value: loading ? "—" : grades.length },
          {
            label: "Period",
            value: from && to ? `${from} → ${to}` : "—",
          },
        ]}
        badges={
          currentTerm ? (
            <AcademicsBadge variant="live">{currentTerm.name}</AcademicsBadge>
          ) : (
            <AcademicsBadge variant="muted">No current term</AcademicsBadge>
          )
        }
      />

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

      <div className="rpt-hub__grid">
        <section className="rpt-hub__card" aria-labelledby="rpt-attendance">
          <header className="rpt-hub__card-head">
            <span className="rpt-hub__card-icon" aria-hidden>
              <DashIcon name="attendance" className="dash-icon--sm" />
            </span>
            <div>
              <h2 id="rpt-attendance" className="rpt-hub__card-title">
                Attendance
              </h2>
              <p className="rpt-hub__card-sub">Daily status by student for a date range.</p>
            </div>
          </header>
          <div className="rpt-hub__filters">
            <label className="rpt-hub__field">
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="rpt-hub__field">
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            className="rpt-hub__btn"
            disabled={!from || !to || busy != null}
            onClick={() =>
              void runExport("attendance", () => downloadAttendanceExport(from, to))
            }
          >
            {busy === "attendance" ? "Preparing…" : "Download CSV"}
          </button>
        </section>

        <section className="rpt-hub__card" aria-labelledby="rpt-fees">
          <header className="rpt-hub__card-head">
            <span className="rpt-hub__card-icon" aria-hidden>
              <DashIcon name="finance" className="dash-icon--sm" />
            </span>
            <div>
              <h2 id="rpt-fees" className="rpt-hub__card-title">
                Fees
              </h2>
              <p className="rpt-hub__card-sub">Fee balances and payments by due date.</p>
            </div>
          </header>
          <div className="rpt-hub__filters">
            <label className="rpt-hub__field">
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="rpt-hub__field">
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            className="rpt-hub__btn"
            disabled={!from || !to || busy != null}
            onClick={() =>
              void runExport("fees", () => downloadFinanceExport(from, to))
            }
          >
            {busy === "fees" ? "Preparing…" : "Download CSV"}
          </button>
        </section>

        <section className="rpt-hub__card" aria-labelledby="rpt-results">
          <header className="rpt-hub__card-head">
            <span className="rpt-hub__card-icon" aria-hidden>
              <DashIcon name="results" className="dash-icon--sm" />
            </span>
            <div>
              <h2 id="rpt-results" className="rpt-hub__card-title">
                Results
              </h2>
              <p className="rpt-hub__card-sub">
                One row per student subject: average and letter for a term.
              </p>
            </div>
          </header>
          <div className="rpt-hub__filters">
            <label className="rpt-hub__field">
              <span>Term</span>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                disabled={loading || terms.length === 0}
              >
                {terms.length === 0 ? (
                  <option value="">No terms</option>
                ) : (
                  terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isCurrent ? " (current)" : ""} — {t.academicYear.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="rpt-hub__field">
              <span>Grade (optional)</span>
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                <option value="">All grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="rpt-hub__btn"
            disabled={!termId || busy != null}
            onClick={() =>
              void runExport("results", () =>
                downloadResultsExport(termId, gradeId || undefined),
              )
            }
          >
            {busy === "results" ? "Preparing…" : "Download CSV"}
          </button>
        </section>

        <section className="rpt-hub__card" aria-labelledby="rpt-rosters">
          <header className="rpt-hub__card-head">
            <span className="rpt-hub__card-icon" aria-hidden>
              <DashIcon name="users" className="dash-icon--sm" />
            </span>
            <div>
              <h2 id="rpt-rosters" className="rpt-hub__card-title">
                Rosters
              </h2>
              <p className="rpt-hub__card-sub">Current students, teachers, and parents lists.</p>
            </div>
          </header>
          <div className="rpt-hub__roster-actions">
            <button
              type="button"
              className="rpt-hub__btn rpt-hub__btn--ghost"
              disabled={busy != null}
              onClick={() => void runExport("students", () => downloadStudentsReport())}
            >
              {busy === "students" ? "Preparing…" : "Students CSV"}
            </button>
            <button
              type="button"
              className="rpt-hub__btn rpt-hub__btn--ghost"
              disabled={busy != null}
              onClick={() => void runExport("teachers", () => downloadTeachersReport())}
            >
              {busy === "teachers" ? "Preparing…" : "Teachers CSV"}
            </button>
            <button
              type="button"
              className="rpt-hub__btn rpt-hub__btn--ghost"
              disabled={busy != null}
              onClick={() => void runExport("parents", () => downloadParentsReport())}
            >
              {busy === "parents" ? "Preparing…" : "Parents CSV"}
            </button>
          </div>
        </section>

        <section className="rpt-hub__card rpt-hub__card--link" aria-labelledby="rpt-cards">
          <header className="rpt-hub__card-head">
            <span className="rpt-hub__card-icon" aria-hidden>
              <DashIcon name="report-card" className="dash-icon--sm" />
            </span>
            <div>
              <h2 id="rpt-cards" className="rpt-hub__card-title">
                Report cards
              </h2>
              <p className="rpt-hub__card-sub">
                Term and year-end printable report cards (not CSV).
              </p>
            </div>
          </header>
          <Link href="/admin/report-cards" className="rpt-hub__btn rpt-hub__btn--link">
            Open report cards
          </Link>
        </section>
      </div>
    </div>
  );
}
