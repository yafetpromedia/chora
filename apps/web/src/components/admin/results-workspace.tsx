"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
} from "@/components/academics/academics-ui";
import { PendingApprovalsPanel } from "@/components/results/pending-approvals-panel";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import type { StudentRecord } from "@/lib/api";
import {
  listClassSubjects,
  listPendingWorkflow,
  listTerms,
  type AcademicTerm,
} from "@/lib/results";

type Props = {
  students: StudentRecord[];
  onError?: (message: string) => void;
};

type ResultsSection = "scores" | "approvals";
type ScoreMode = "matrix" | "student";

const SECTIONS: Array<{ id: ResultsSection; label: string; hint: string }> = [
  { id: "scores", label: "Score entry", hint: "Enter and edit marks" },
  { id: "approvals", label: "Approvals", hint: "Review and publish sheets" },
];

const SCORE_MODES: Array<{ id: ScoreMode; label: string; hint: string }> = [
  { id: "matrix", label: "Class sheet", hint: "All students, one subject" },
  { id: "student", label: "By student", hint: "All subjects, one student" },
];

const SETUP_LINKS = [
  { href: "/admin/results/terms", label: "Terms & calendar" },
  { href: "/admin/results/templates", label: "Assessment templates" },
  { href: "/admin/results/academic-years", label: "Academic years" },
  { href: "/admin/results/promotion", label: "Year-end promotion" },
];

function parseSection(value: string | null): ResultsSection {
  if (value === "approvals") return value;
  return "scores";
}

function parseScoreMode(value: string | null): ScoreMode {
  return value === "student" ? "student" : "matrix";
}

export function ResultsWorkspace({ students, onError }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [viewStudentId, setViewStudentId] = useState("");
  const [error, setError] = useState("");

  const section = parseSection(searchParams.get("section"));
  const scoreMode = parseScoreMode(searchParams.get("mode"));

  useEffect(() => {
    if (searchParams.get("section") === "reports") {
      router.replace("/admin/report-cards");
    }
  }, [router, searchParams]);

  const setErr = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const setSection = useCallback(
    (next: ResultsSection) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "scores") {
        params.delete("section");
      } else {
        params.set("section", next);
      }
      const q = params.toString();
      router.replace(q ? `/admin/results?${q}` : "/admin/results", { scroll: false });
    },
    [router, searchParams],
  );

  const setScoreMode = useCallback(
    (next: ScoreMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "matrix") {
        params.delete("mode");
      } else {
        params.set("mode", next);
      }
      const q = params.toString();
      router.replace(q ? `/admin/results?${q}` : "/admin/results", { scroll: false });
    },
    [router, searchParams],
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [t, cs, pending] = await Promise.all([
        listTerms(),
        listClassSubjects(),
        listPendingWorkflow({ status: "SUBMITTED" }),
      ]);
      setTerms(t);
      setClassCount(cs.length);
      setPendingCount(pending.length);
      const current = t.find((x) => x.isCurrent) ?? t[0];
      if (current) setTermId((prev) => prev || current.id);
      if (students[0]) setViewStudentId((prev) => prev || students[0].id);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not load results workspace");
    } finally {
      setLoading(false);
    }
  }, [setErr, students]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms.find((t) => t.id === termId);

  const heroStats = useMemo(
    () => [
      { label: "Students", value: loading ? "—" : students.length },
      { label: "Class sheets", value: loading ? "—" : classCount },
      {
        label: "Pending review",
        value: loading ? "—" : pendingCount,
        accent: !loading && pendingCount > 0,
      },
    ],
    [loading, students.length, classCount, pendingCount],
  );

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        grade: s.grade.name,
      })),
    [students],
  );

  return (
    <div className="acad-page acad-page--results res-v2">
      <header className="res-v2__hero">
        <div className="res-v2__hero-glow" aria-hidden />
        <div className="res-v2__hero-inner">
          <div className="res-v2__hero-main">
            <h2 className="res-v2__hero-title">Grading workspace</h2>
            <p className="res-v2__hero-sub">
              {section === "scores"
                ? scoreMode === "matrix"
                  ? "Enter and review class score sheets by term, grade, and subject."
                  : "View all subjects for one student in a single read-only sheet."
                : "Review submitted sheets and publish results to families."}
            </p>
            {currentTerm || (!loading && pendingCount > 0) ? (
              <div className="res-v2__hero-badges">
                {currentTerm ? <span className="res-v2__badge">{currentTerm.name}</span> : null}
                {!loading && pendingCount > 0 ? (
                  <span className="res-v2__badge res-v2__badge--warn">
                    {pendingCount} pending review
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="res-v2__hero-stats">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className={`res-v2__stat${stat.accent ? " res-v2__stat--accent" : ""}`}
              >
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="res-v2__toolbar">
        <div className="res-v2__tabs" role="tablist" aria-label="Results workspace">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              className={`res-v2__tab${section === item.id ? " res-v2__tab--active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              <DashIcon
                name={item.id === "scores" ? "results" : "chart"}
                className="dash-icon--sm"
              />
              <span className="res-v2__tab-text">
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
            </button>
          ))}
        </div>

        {section === "scores" ? (
          <div className="res-v2__subtabs" role="tablist" aria-label="Score entry view">
            {SCORE_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={scoreMode === item.id}
                className={`res-v2__subtab${scoreMode === item.id ? " res-v2__subtab--active" : ""}`}
                onClick={() => setScoreMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="res-v2__setup">
          <details className="res-v2__setup-menu">
            <summary>
              <DashIcon name="settings" className="dash-icon--sm" />
              Setup
            </summary>
            <div className="res-v2__setup-links">
              {SETUP_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>

      {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}

      {section === "scores" ? (
        <section className="res-v2__panel" aria-label={scoreMode === "matrix" ? "Class sheet" : "By student"}>
          {scoreMode === "matrix" ? (
            <ScoreMatrixPanel role="admin" />
          ) : (
            <StudentSubjectScoresPanel
              role="admin"
              students={studentOptions}
              defaultTermId={termId}
              defaultStudentId={viewStudentId}
            />
          )}
        </section>
      ) : null}

      {section === "approvals" ? (
        <section className="res-v2__panel" aria-label="Approvals">
          <PendingApprovalsPanel
            terms={terms}
            defaultTermId={termId}
            onError={setErr}
            onCountChange={setPendingCount}
          />
        </section>
      ) : null}

      <p className="res-v2__footer-hint">
        Generate and print report cards from{" "}
        <Link href="/admin/report-cards" className="res-v2__text-link">
          Report cards
        </Link>
        . Calendar and grading rules live under{" "}
        <Link href="/admin/results/terms" className="res-v2__text-link">
          Setup
        </Link>{" "}
        — terms, templates, academic years, and promotion.
      </p>
    </div>
  );
}
