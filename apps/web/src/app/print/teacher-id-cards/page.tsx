"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { listTeacherIdCards, type TeacherIdCard } from "@/lib/teacher-cards";

export default function PrintTeacherIdCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<TeacherIdCard[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    void listTeacherIdCards()
      .then((rows) => {
        setCards(rows);
        setReady(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [router]);

  useEffect(() => {
    if (!ready || cards.length === 0) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [ready, cards.length]);

  if (error) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="sid-print-page">
        <p className="sid-print-page__loading">Preparing faculty cards…</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>No teacher cards. Generate TCH IDs from Admin → Teacher ID cards.</p>
      </div>
    );
  }

  return (
    <div className="sid-print-page sid-print-page--bulk">
      <header className="sid-print-meta sid-print-meta--page no-print">
        <p className="sid-print-meta__brand">CampusOne · Faculty ID bulk print</p>
        <p className="sid-print-meta__sub">
          {cards.length} card{cards.length === 1 ? "" : "s"} · Enable background graphics ·
          Double-sided long edge
        </p>
      </header>

      <div className="sid-bulk-grid sid-bulk-grid--6">
        {cards.map((c) => (
          <div key={c.userId} className="sid-bulk-cell">
            <TeacherIdCardView card={c} variant="standard" showBack={false} />
          </div>
        ))}
      </div>

      <div className="sid-bulk-sheet">
        <p className="sid-bulk-sheet__label sid-bulk-sheet__label--back">Back sides</p>
        <div className="sid-bulk-grid sid-bulk-grid--6">
          {cards.map((c) => (
            <div key={`${c.userId}-back`} className="sid-bulk-cell">
              <TeacherIdCardView card={c} variant="standard" backOnly />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
