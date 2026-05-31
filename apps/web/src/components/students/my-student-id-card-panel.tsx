"use client";

import { useEffect, useState } from "react";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { StudentIdCardModal } from "@/components/students/student-id-card-modal";
import { getMyStudentIdCard, type StudentIdCard } from "@/lib/student-cards";

export function MyStudentIdCardPanel() {
  const [card, setCard] = useState<StudentIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBack, setShowBack] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void getMyStudentIdCard()
      .then(setCard)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your ID card"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="setup-hint">Loading your campus ID…</p>;
  }

  if (error) {
    return (
      <p className="att-toast att-toast--error">
        {error}. Contact your school office if this persists.
      </p>
    );
  }

  if (!card) return null;

  return (
    <section className="sid-my-panel">
      <div className="sid-my-panel__head no-print">
        <div>
          <h2 className="sid-my-panel__title">My campus ID</h2>
          <p className="sid-my-panel__sub">
            Show this card at the gate or in class — teachers scan the QR for attendance.
          </p>
        </div>
        <div className="sid-my-panel__actions">
          <label className="sid-modal__toggle">
            <input
              type="checkbox"
              checked={showBack}
              onChange={(e) => setShowBack(e.target.checked)}
            />
            Back of card
          </label>
          <button
            type="button"
            className="att-btn att-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            Full view · Print
          </button>
        </div>
      </div>
      <div className="sid-my-panel__card">
        <StudentIdCardView card={card} showBack={showBack} />
      </div>
      <p className="sid-my-panel__hint no-print">
        Open full view to print both sides or save as PDF. Lost your card? Ask the school office
        for a replacement.
      </p>

      {modalOpen ? (
        <StudentIdCardModal
          studentProfileId={card.studentProfileId}
          card={card}
          onClose={() => setModalOpen(false)}
          showBack
          downloadHint
        />
      ) : null}
    </section>
  );
}
