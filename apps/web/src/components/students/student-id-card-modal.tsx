"use client";

import { useEffect, useState } from "react";
import { StudentIdCardView } from "@/components/students/student-id-card";
import {
  getStudentIdCard,
  type StudentIdCard,
} from "@/lib/student-cards";
import type { StudentIdCardVariant } from "@/components/students/student-id-card";

type Props = {
  studentProfileId: string | null;
  /** Pre-loaded card (skips fetch). */
  card?: StudentIdCard | null;
  onClose: () => void;
  variant?: StudentIdCardVariant;
  showBack?: boolean;
  downloadHint?: boolean;
};

export function StudentIdCardModal({
  studentProfileId,
  card: initialCard,
  onClose,
  variant = "standard",
  showBack = true,
  downloadHint = false,
}: Props) {
  const [card, setCard] = useState<StudentIdCard | null>(initialCard ?? null);
  const [loading, setLoading] = useState(!initialCard && !!studentProfileId);
  const [error, setError] = useState("");
  const [duplex, setDuplex] = useState(showBack);

  useEffect(() => {
    if (initialCard) {
      setCard(initialCard);
      setLoading(false);
      return;
    }
    if (!studentProfileId) return;
    setLoading(true);
    setError("");
    void getStudentIdCard(studentProfileId)
      .then(setCard)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load ID card"))
      .finally(() => setLoading(false));
  }, [studentProfileId, initialCard]);

  if (!studentProfileId && !initialCard) return null;

  return (
    <>
      <button type="button" className="sid-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="sid-modal" role="dialog" aria-labelledby="sid-modal-title">
        <header className="sid-modal__head">
          <div>
            <h2 id="sid-modal-title" className="sid-modal__title">
              Student ID card
            </h2>
            <p className="sid-modal__sub">
              {downloadHint
                ? "Print or save as PDF — use both sides for lamination."
                : "Print, download, or show for attendance scan"}
            </p>
          </div>
          <button type="button" className="sid-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="sid-modal__toolbar no-print">
          <label className="sid-modal__toggle">
            <input
              type="checkbox"
              checked={duplex}
              onChange={(e) => setDuplex(e.target.checked)}
            />
            Show back of card
          </label>
          <button type="button" className="att-btn att-btn--primary" onClick={() => window.print()}>
            Print
          </button>
          {downloadHint ? (
            <span className="sid-modal__download-hint">
              Tip: choose &quot;Save as PDF&quot; in the print dialog to download.
            </span>
          ) : null}
        </div>

        <div className="sid-modal__body">
          {loading ? (
            <p className="setup-hint">Loading ID card…</p>
          ) : error ? (
            <p className="att-toast att-toast--error">{error}</p>
          ) : card ? (
            <StudentIdCardView card={card} variant={variant} showBack={duplex} />
          ) : null}
        </div>
      </div>
    </>
  );
}
