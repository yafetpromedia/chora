"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { StudentIdCardPrintDialog } from "@/components/students/student-id-card-print-dialog";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { countStudentIdCards, listStudentIdCards } from "@/lib/student-cards";
import type { StudentIdCard } from "@/lib/student-cards";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

const PREVIEW_LIMIT = 12;

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
  const previewCards = cards.slice(0, PREVIEW_LIMIT);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [{ count }, page] = await Promise.all([
        countStudentIdCards({
          gradeId: gradeId || undefined,
          sectionId: sectionId || undefined,
        }),
        listStudentIdCards({
          gradeId: gradeId || undefined,
          sectionId: sectionId || undefined,
          take: PREVIEW_LIMIT,
        }),
      ]);
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
    void listGrades()
      .then((g) => setGrades(g))
      .catch(() => undefined);
    void load();
  }, [router]);

  useEffect(() => {
    void load();
  }, [gradeId, sectionId]);

  return (
    <DashboardPage
      role="admin"
      title="Student ID cards"
      eyebrow="Management"
    >
      <div className="att-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}

        <div className="idcards-toolbar no-print">
          <div className="att-field">
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
          </div>
          {selectedGrade && selectedGrade.sections.length > 0 ? (
            <div className="att-field">
              <span>Section</span>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">All sections</option>
                {selectedGrade.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button type="button" className="att-btn att-btn--ghost" onClick={() => void load()}>
            Refresh
          </button>
          <label className="sid-modal__toggle">
            <input
              type="checkbox"
              checked={previewBack}
              onChange={(e) => setPreviewBack(e.target.checked)}
            />
            Preview back
          </label>
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={loading || total === 0}
            onClick={() => setPrintOpen(true)}
          >
            Print…
          </button>
          <Link href="/admin/attendance" className="att-btn att-btn--ghost">
            Scan attendance →
          </Link>
          <Link href="/admin/students" className="att-btn att-btn--ghost">
            ← Students
          </Link>
        </div>

        {!loading && total > 0 ? (
          <p className="idcards-count-hint no-print">
            <strong>{total.toLocaleString()}</strong> student{total === 1 ? "" : "s"} match this
            filter.
            {total > PREVIEW_LIMIT
              ? ` Showing ${PREVIEW_LIMIT} previews — click Print to choose options and print all.`
              : null}
          </p>
        ) : null}

        {loading ? (
          <p className="setup-hint">Loading cards…</p>
        ) : error ? null : total === 0 ? (
          <p className="setup-hint">
            {gradeId
              ? "No students in this class. Try “All grades” or enroll students first."
              : "No students yet. Register students from the Students page."}
          </p>
        ) : (
          <div className="idcards-preview-grid">
            {previewCards.map((card) => (
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
