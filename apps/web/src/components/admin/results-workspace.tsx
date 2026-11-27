"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
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

function parseTab(searchParams: URLSearchParams): WorkspaceTab {
  if (searchParams.get("section") === "approvals") return "approvals";
  if (searchParams.get("mode") === "student") return "student";
  return "matrix";
}

export function ResultsWorkspace({ students, onError }: Props) {
  const { t, tn, tp } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const TABS: Array<{ id: WorkspaceTab; label: string }> = useMemo(
    () => [
      { id: "matrix", label: t("resultsWorkspaceUi.tabMatrix") },
      { id: "student", label: t("resultsWorkspaceUi.tabStudent") },
      { id: "approvals", label: t("resultsWorkspaceUi.tabApprovals") },
    ],
    [t],
  );

  const SETUP_LINKS = useMemo(
    () => [
      { href: "/admin/results/terms", label: t("resultsWorkspaceUi.setupTerms") },
      { href: "/admin/results/templates", label: tn("Assessment templates") },
      { href: "/admin/results/academic-years", label: t("resultsWorkspaceUi.setupYears") },
      { href: "/admin/results/promotion", label: t("resultsWorkspaceUi.setupPromotion") },
    ],
    [t, tn],
  );

  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [pendingCorrections, setPendingCorrections] = useState(0);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [viewStudentId, setViewStudentId] = useState("");
  const [error, setError] = useState("");

  const activeTab = parseTab(searchParams);
  const emptyDash = t("resultsWorkspaceUi.emptyDash");

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

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    void (async () => {
      try {
        const [tList, cs, corrections] = await Promise.all([
          listTerms(),
          listClassSubjects(),
          listScoreCorrections({ status: "PROPOSED" }).catch(() => []),
        ]);
        if (cancelled) return;
        setTerms(tList);
        setClassCount(cs.length);
        setPendingCorrections(corrections.length);
        const current = tList.find((x) => x.isCurrent) ?? tList[0];
        if (current) setTermId((prev) => prev || current.id);
        if (students[0]) setViewStudentId((prev) => prev || students[0].id);
      } catch (err) {
        if (!cancelled) {
          setErr(err instanceof Error ? err.message : t("resultsWorkspaceUi.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setErr, students, t]);

  const currentTerm = terms.find((term) => term.isCurrent) ?? terms.find((term) => term.id === termId);

  const heroStats = useMemo(
    () => [
      {
        label: t("resultsWorkspaceUi.statStudents"),
        value: loading ? emptyDash : students.length,
      },
      {
        label: t("resultsWorkspaceUi.statClassSheets"),
        value: loading ? emptyDash : classCount,
      },
      {
        label: t("resultsWorkspaceUi.statCorrections"),
        value: loading ? emptyDash : pendingCorrections,
      },
    ],
    [loading, students.length, classCount, pendingCorrections, t, emptyDash],
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
      ? t("resultsWorkspaceUi.heroSubApprovals")
      : activeTab === "student"
        ? t("resultsWorkspaceUi.heroSubStudent")
        : t("resultsWorkspaceUi.heroSubMatrix");

  const panelAria =
    activeTab === "approvals"
      ? t("resultsWorkspaceUi.panelApprovals")
      : activeTab === "matrix"
        ? t("resultsWorkspaceUi.panelMatrix")
        : t("resultsWorkspaceUi.panelStudent");

  return (
    <div className="acad-page acad-page--results res-v2">
      <header className="res-v2__hero">
        <div className="res-v2__hero-glow" aria-hidden />
        <div className="res-v2__hero-inner">
          <div className="res-v2__hero-main">
            <h2 className="res-v2__hero-title">{t("resultsWorkspaceUi.title")}</h2>
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
        <div className="res-v2__subtabs" role="tablist" aria-label={t("resultsWorkspaceUi.tabsAria")}>
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
              {t("resultsWorkspaceUi.setup")}
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

      <section className="res-v2__panel" aria-label={panelAria}>
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
        {t("resultsWorkspaceUi.footerPrefix")}{" "}
        <Link href="/admin/report-cards" className="res-v2__text-link">
          {tp("Report cards")}
        </Link>
        . {t("resultsWorkspaceUi.footerMid")}{" "}
        <Link href="/admin/results/terms" className="res-v2__text-link">
          {t("resultsWorkspaceUi.setup")}
        </Link>{" "}
        {t("resultsWorkspaceUi.footerEnd")}
      </p>
    </div>
  );
}