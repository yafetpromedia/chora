"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { ScoreCorrectionsPanel } from "@/components/results/score-corrections-panel";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import { AppToast } from "@/components/ui/app-toast";
import type { StudentRecord } from "@/lib/api";
import {
  listClassSubjects,
  listScoreCorrections,
  listTerms,
  type AcademicTerm,
} from "@/lib/results";

type Props = {
  students: StudentRecord[];
  onError?: (message: string) => void;
};

type WorkspaceTab = "matrix" | "student" | "approvals";

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "matrix", label: "Class sheet" },
  { id: "student", label: "By student" },
  { id: "approvals", label: "Approvals" },
];

const SETUP_LINKS = [
  { href: "/admin/results/terms", label: "Terms & calendar" },
  { href: "/admin/results/templates", label: "Assessment templates" },
  { href: "/admin/results/academic-years", label: "Academic years" },
  { href: "/admin/results/promotion", label: "Year-end promotion" },
];

function parseTab(searchParams: URLSearchParams): WorkspaceTab {
  if (searchParams.get("section") === "approvals") return "approvals";
  if (searchParams.get("mode") === "student") return "student";
  return "matrix";
}

export function ResultsWorkspace({ students, onError }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [pendingCorrections, setPendingCorrections] = useState(0);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [viewStudentId, setViewStudentId] = useState("");
  const [error, setError] = useState("");

  const activeTab = parseTab(searchParams);

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

  const setTab = useCallback(
    (next: WorkspaceTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("section");
      params.delete("mode");
      if (next === "student") params.set("mode", "student");
      if (next === "approvals") params.set("section", "approvals");
      const q = params.toString();
      router.replace(q ? `/admin/results?${q}` : "/admin/results", { scroll: false });
    },
    [router, searchParams],
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [t, cs, corrections] = await Promise.all([
        listTerms(),
        listClassSubjects(),
        listScoreCorrections({ status: "PROPOSED" }).catch(() => []),
      ]);
      setTerms(t);
      setClassCount(cs.length);
      setPendingCorrections(corrections.length);
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
        label: "Corrections",
        value: loading ? "—" : pendingCorrections,
      },
    ],
    [loading, students.length, classCount, pendingCorrections],
  );

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        grade: s.grade.name,
        gradeId: s.grade.id,
        section: s.section?.name ?? null,
        sectionId: s.section?.id ?? null,
        studentId: s.user.externalRef,
        photoUrl: s.photoUrl,
      })),
    [students],
  );

  const heroSub =
    activeTab === "approvals"
      ? "Approve teacher-proposed score fixes after families report a published mark."
      : activeTab === "student"
        ? "View all subjects for one student in a single read-only sheet."
        : "Teachers enter scores while components are open. Publish a sheet when it’s ready for families.";

  return (
    <div className="acad-page acad-page--results res-v2">
      <header className="res-v2__hero">
        <div className="res-v2__hero-glow" aria-hidden />
        <div className="res-v2__hero-inner">
          <div className="res-v2__hero-main">
            <h2 className="res-v2__hero-title">Grading workspace</h2>
            <p className="res-v2__hero-sub">{heroSub}</p>
            {currentTerm ? (
              <div className="res-v2__hero-badges">
                <span className="res-v2__badge">{currentTerm.name}</span>
              </div>
            ) : null}
          </div>
          <div className="res-v2__hero-stats">
            {heroStats.map((stat) => (
              <div key={stat.label} className="res-v2__stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="res-v2__toolbar">
        <div className="res-v2__subtabs" role="tablist" aria-label="Results workspace">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              className={`res-v2__subtab${activeTab === item.id ? " res-v2__subtab--active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.id === "approvals" && pendingCorrections > 0
                ? ` (${pendingCorrections})`
                : ""}
            </button>
          ))}
        </div>

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

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <section
        className="res-v2__panel"
        aria-label={
          activeTab === "approvals"
            ? "Score corrections"
            : activeTab === "matrix"
              ? "Class sheet"
              : "By student"
        }
      >
        {activeTab === "approvals" ? (
          <ScoreCorrectionsPanel
            mode="admin"
            terms={terms}
            defaultTermId={termId}
            onCountChange={setPendingCorrections}
            onError={setErr}
          />
        ) : activeTab === "matrix" ? (
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
