"use client";

import { useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { StudentIdCardModal } from "@/components/students/student-id-card-modal";
import { getMyStudentIdCard, type StudentIdCard } from "@/lib/student-cards";
import { useLocale } from "@/components/i18n/locale-provider";

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

function classLabel(card: StudentIdCard) {
  return `${card.grade}${card.section ? ` · ${card.section}` : ""}`;
}

export function MyStudentIdCardPanel() {
  const { t } = useLocale();
  const [card, setCard] = useState<StudentIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewBack, setPreviewBack] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void getMyStudentIdCard()
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPortal.loadCampusFailed")),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tid-loading">
        <div className="tid-loading__spinner" aria-hidden />
        <p>{t("idCardPortal.loadingCampusId")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="tid-alert tid-alert--error">
        {error}. {t("idCardPortal.errorPersist")}
      </p>
    );
  }

  if (!card) return null;

  const displayId = card.studentId ?? card.cardCode;

  return (
    <div className="tid-page sid-portal">
      <header className="tid-hero">
        <div className="tid-hero__main">
          <div className="tid-hero__brand">
            <span className="tid-hero__chip">{t("idCardPortal.studentIdChip")}</span>
            <span className="tid-hero__icon" aria-hidden>
              <IdCardIcon />
            </span>
          </div>
          <h2 className="tid-hero__title">{card.name}</h2>
          <p className="tid-hero__sub">
            {t("idCardPortal.classAndValid", {
              classLabel: classLabel(card),
              date: card.validThrough,
            })}
          </p>
        </div>
        <div className="tid-hero__stats">
          <div className="tid-stat">
            <span className="tid-stat__value">{displayId}</span>
            <span className="tid-stat__label">{t("idCardPortal.studentIdLabel")}</span>
          </div>
          <div className="tid-stat">
            <span className="tid-stat__value">{card.cardCode}</span>
            <span className="tid-stat__label">{t("idCardPortal.cardCode")}</span>
          </div>
          <div className="tid-stat">
            <span className="tid-stat__value">{card.academicYear}</span>
            <span className="tid-stat__label">{t("idCardPortal.academicYear")}</span>
          </div>
        </div>
      </header>

      <div className="sid-portal__tips no-print">
        <article className="sid-portal__tip">
          <span className="sid-portal__tip-icon" aria-hidden>
            <DashIcon name="attendance" className="dash-icon--sm" />
          </span>
          <div>
            <strong>{t("idCardPortal.tipGateClassTitle")}</strong>
            <p>{t("idCardPortal.tipGateClassStudent")}</p>
          </div>
        </article>
        <article className="sid-portal__tip">
          <span className="sid-portal__tip-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h.01M17 14h.01M20 14h.01M14 17h.01M17 17h.01M20 17h.01M14 20h.01M17 20h.01M20 20h.01" />
            </svg>
          </span>
          <div>
            <strong>{t("idCardPortal.tipAttendanceScanTitle")}</strong>
            <p>{t("idCardPortal.tipAttendanceScanStudent")}</p>
          </div>
        </article>
        <article className="sid-portal__tip">
          <span className="sid-portal__tip-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </span>
          <div>
            <strong>{t("idCardPortal.tipPrintTitle")}</strong>
            <p>{t("idCardPortal.tipPrintBody")}</p>
          </div>
        </article>
      </div>

      <section className="tid-card tid-card--actions no-print">
        <div className="tid-card__head">
          <div>
            <h3 className="tid-card__title">{t("idCardPortal.cardOptions")}</h3>
            <p className="tid-card__sub">{t("idCardPortal.cardOptionsSub")}</p>
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
            <span className="tid-toggle__label">{t("idCardPortal.showBack")}</span>
          </label>
          <div className="sid-portal__action-btns">
            <button
              type="button"
              className="tid-btn tid-btn--ghost"
              onClick={() => setModalOpen(true)}
            >
              {t("idCardPortal.fullView")}
            </button>
            <button
              type="button"
              className="tid-btn tid-btn--primary"
              onClick={() =>
                window.open(
                  `/print/student-id-card?id=${encodeURIComponent(card.studentProfileId)}&duplex=1`,
                  "_blank",
                )
              }
            >
              {t("idCardPortal.openPrintView")}
            </button>
          </div>
        </div>
      </section>

      <section className="tid-card tid-card--preview">
        <div className="tid-card__head">
          <div>
            <h3 className="tid-card__title">{t("idCardPortal.yourCampusId")}</h3>
            <p className="tid-card__sub">{t("idCardPortal.campusIdSub")}</p>
          </div>
          <span className="tid-card__badge">
            {previewBack ? t("idCardPortal.frontBack") : t("idCardPortal.frontOnly")}
          </span>
        </div>
        <div className="tid-preview-stage sid-portal__stage">
          <StudentIdCardView
            card={card}
            showBack={previewBack}
            className={previewBack ? "sid-wrap--duplex" : undefined}
          />
        </div>
      </section>

      <p className="tid-footnote no-print">{t("idCardPortal.footnote")}</p>

      {modalOpen ? (
        <StudentIdCardModal
          studentProfileId={card.studentProfileId}
          card={card}
          onClose={() => setModalOpen(false)}
          showBack
          downloadHint
        />
      ) : null}
    </div>
  );
}
