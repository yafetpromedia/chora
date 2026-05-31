"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listStudentIdCards } from "@/lib/student-cards";
import type { StudentIdCard } from "@/lib/student-cards";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function StudentCardsPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [cards, setCards] = useState<StudentIdCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printBack, setPrintBack] = useState(true);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listStudentIdCards({
        gradeId: gradeId || undefined,
        sectionId: sectionId || undefined,
      });
      setCards(data);
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
      subtitle="Digital cards with QR codes — print and laminate for homeroom scan attendance."
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
              checked={printBack}
              onChange={(e) => setPrintBack(e.target.checked)}
            />
            Print back of card
          </label>
          <button type="button" className="att-btn att-btn--primary" onClick={() => window.print()}>
            Print cards
          </button>
          <Link href="/admin/attendance" className="att-btn att-btn--ghost">
            Scan attendance →
          </Link>
          <Link href="/admin/students" className="att-btn att-btn--ghost">
            ← Students
          </Link>
        </div>

        {loading ? (
          <p className="setup-hint">Generating cards…</p>
        ) : error ? null : cards.length === 0 ? (
          <p className="setup-hint">
            {gradeId
              ? "No students in this class. Try “All grades” or enroll students first."
              : "No students yet. Register students from the Students page."}
          </p>
        ) : (
          <div className="idcards-grid">
            {cards.map((card) => (
              <StudentIdCardView key={card.studentProfileId} card={card} showBack={printBack} />
            ))}
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
