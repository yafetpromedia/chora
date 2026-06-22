"use client";

import { useEffect, useState } from "react";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { getMyTeacherIdCard, type TeacherIdCard } from "@/lib/teacher-cards";

function IdCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 10h4M14 14h4" />
    </svg>
  );
}

export function TeacherIdCardPanel() {
  const [card, setCard] = useState<TeacherIdCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewBack, setPreviewBack] = useState(true);

  useEffect(() => {
    void getMyTeacherIdCard()
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load ID card"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tid-loading">
        <div className="tid-loading__spinner" aria-hidden />
        <p>Loading your faculty card…</p>
      </div>
    );
  }

  if (error) {
    return <p className="tid-alert tid-alert--error">{error}</p>;
  }

  if (!card) return null;

  return (
    <div className="tid-page">
      <header className="tid-hero">
        <div className="tid-hero__main">
          <div className="tid-hero__brand">
            <span className="tid-hero__chip">Campus access</span>
            <span className="tid-hero__icon" aria-hidden>
              <IdCardIcon />
            </span>
          </div>
          <h2 className="tid-hero__title">{card.name}</h2>
          <p className="tid-hero__sub">
            {card.roleLabel}
            {card.homeroom ? ` · ${card.homeroom}` : ""} · Valid through {card.validThrough}
          </p>
        </div>
        <div className="tid-hero__stats">
          <div className="tid-stat">
            <span className="tid-stat__value">{card.teacherId ?? "—"}</span>
            <span className="tid-stat__label">Teacher ID</span>
          </div>
          <div className="tid-stat">
            <span className="tid-stat__value">{card.cardCode}</span>
            <span className="tid-stat__label">Card code</span>
          </div>
          <div className="tid-stat">
            <span className="tid-stat__value">{card.academicYear}</span>
            <span className="tid-stat__label">Academic year</span>
          </div>
        </div>
      </header>

      <section className="tid-card tid-card--actions no-print">
        <div className="tid-card__head">
          <div>
            <h3 className="tid-card__title">Card options</h3>
            <p className="tid-card__sub">Preview both sides or open the print layout</p>
          </div>
        </div>
        <div className="tid-actions">
          <label className="tid-toggle">
            <input
              type="checkbox"
              checked={previewBack}
              onChange={(e) => setPreviewBack(e.target.checked)}
            />
            <span className="tid-toggle__track" aria-hidden />
            <span className="tid-toggle__label">Preview back</span>
          </label>
          <button
            type="button"
            className="tid-btn tid-btn--primary"
            onClick={() =>
              window.open("/print/teacher-id-card?me=1&duplex=1", "_blank")
            }
          >
            Open full print view
          </button>
        </div>
      </section>

      <section className="tid-card tid-card--preview">
        <div className="tid-card__head">
          <div>
            <h3 className="tid-card__title">Your faculty card</h3>
            <p className="tid-card__sub">
              ISO CR80 — sign in with <strong>{card.teacherId}</strong> or your email at the
              gate and on campus systems.
            </p>
          </div>
          <span className="tid-card__badge">Front{previewBack ? " + back" : ""}</span>
        </div>
        <div className="tid-preview-stage">
          <TeacherIdCardView
            card={card}
            variant="standard"
            showBack={previewBack}
            className={previewBack ? "sid-wrap--print-duplex" : undefined}
          />
        </div>
      </section>

      <p className="tid-footnote no-print">
        Show this card for campus access. Teachers scan the QR for attendance. Report a lost card
        to your school office immediately.
      </p>
    </div>
  );
}
