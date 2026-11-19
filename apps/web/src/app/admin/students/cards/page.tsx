"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { StudentIdCardPrintDialog } from "@/components/students/student-id-card-print-dialog";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { countStudentIdCards, listStudentIdCards } from "@/lib/student-cards";
import type { StudentIdCard } from "@/lib/student-cards";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { AppToast } from "@/components/ui/app-toast";

export default function StudentCardsPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [cards, setCards] = useState<StudentIdCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [previewBack, setPreviewBack] = useState(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  function fetchCards() {
    return Promise.all([
      countStudentIdCards({
        gradeId: gradeId || undefined,
        sectionId: sectionId || undefined,
      }),
      listStudentIdCards({
        gradeId: gradeId || undefined,
        sectionId: sectionId || undefined,
      }),
    ]);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [{ count }, page] = await fetchCards();
      setTotal(count);
      setCards(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void listGrades()
      .then((g) => {
        if (!cancelled) setGrades(g);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [{ count }, page] = await fetchCards();
        if (cancelled) return;
        setTotal(count);
        setCards(page);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load cards");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId, sectionId]);

  return (
    <DashboardPage role="admin" title="Student ID cards">
      <div className="idcards-page">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />

        <header className="idcards-head no-print">
          <div className="idcards-head__main">
            <Link href="/admin/students" className="idcards-back">
              <DashIcon name="chevron" className="dash-icon--xs" />
              Students
            </Link>
            <h2 className="idcards-title">Student ID cards</h2>
            <p className="idcards-subtitle">
              Preview campus cards, filter by class, then print the set you need.
            </p>
          </div>
          <div className="idcards-head__aside">
            <p className="idcards-summary">
              <span>
                <strong>{loading ? "—" : cards.length.toLocaleString()}</strong>{" "}
                shown
              </span>
              {gradeId ? (
                <span>
                  <strong>
                    {selectedGrade?.name ?? "Grade"}
                    {sectionId
                      ? ` · ${selectedGrade?.sections.find((s) => s.id === sectionId)?.name ?? ""}`
                      : ""}
                  </strong>{" "}
                  filter
                </span>
              ) : (
                <span>
                  <strong>All grades</strong>
                </span>
              )}
            </p>
            <div className="idcards-head__actions">
              <Link href="/admin/attendance" className="idcards-btn idcards-btn--ghost">
                Scan attendance
              </Link>
              <button
                type="button"
                className="idcards-btn idcards-btn--primary"
                disabled={loading || total === 0}
                onClick={() => setPrintOpen(true)}
              >
                Print…
              </button>
            </div>
          </div>
        </header>

        <div className="idcards-bar no-print">
          <label className="idcards-control">
            <span>Grade</span>
            <select
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionId("");
              }}
            >
              <option value="">All grades</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          {selectedGrade && selectedGrade.sections.length > 0 ? (
            <label className="idcards-control">
              <span>Section</span>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">All sections</option>
                {selectedGrade.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="idcards-toggle">
            <input
              type="checkbox"
              checked={previewBack}
              onChange={(e) => setPreviewBack(e.target.checked)}
            />
            <span>Show card back</span>
          </label>
          <button
            type="button"
            className="idcards-btn idcards-btn--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="idcards-status">Loading cards…</p>
        ) : error ? null : total === 0 ? (
          <p className="idcards-status">
            {gradeId
              ? "No students in this class. Try “All grades” or enroll students first."
              : "No students yet. Register students from the Students page."}
          </p>
        ) : (
          <div className="idcards-preview-grid">
            {cards.map((card) => (
              <StudentIdCardView
                key={card.studentProfileId}
                card={card}
                variant="standard"
                showBack={previewBack}
                className={previewBack ? "sid-wrap--print-duplex" : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <StudentIdCardPrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        grades={grades}
        initialGradeId={gradeId}
        initialSectionId={sectionId}
      />
    </DashboardPage>
  );
}
