"use client";

import { useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { TeacherIdCardModal } from "@/components/teacher/teacher-id-card-modal";
import { TeacherIdPhotoUpload } from "@/components/teacher/teacher-id-photo-upload";
import { getMyTeacherIdCard, type TeacherIdCard } from "@/lib/teacher-cards";
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

export function TeacherIdCardPanel() {
  const { t } = useLocale();
  const [card, setCard] = useState<TeacherIdCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewBack, setPreviewBack] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void getMyTeacherIdCard()
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPortal.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tid-loading">
        <div className="tid-loading__spinner" aria-hidden />
        <p>{t("idCardPortal.loadingStaffId")}</p>
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

  const displayId = card.teacherId ?? card.cardCode;

  return (
    <div className="tid-page sid-portal">
      <header className="tid-hero">
        <div className="tid-hero__main">
          <div className="tid-hero__brand">
            <span className="tid-hero__chip">{t("idCardPortal.staffIdChip")}</span>
            <span className="tid-hero__icon" aria-hidden>
              <IdCardIcon />
            </span>
          </div>
          <h2 className="tid-hero__title">{card.name}</h2>
          <p className="tid-hero__sub">
            {card.roleLabel}
            {card.homeroom ? ` · ${card.homeroom}` : ""} ·{" "}
            {t("idCardPortal.validThrough", { date: card.validThrough })}
          </p>
        </div>
        <div className="tid-hero__stats">
          <div className="tid-stat">
            <span className="tid-stat__value">{displayId}</span>
            <span className="tid-stat__label">{t("idCardPortal.staffIdLabel")}</span>
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

      <TeacherIdPhotoUpload
        photoUrl={card.photoUrl}
        pendingPhotoUrl={card.pendingPhotoUrl}
        photoReviewStatus={card.photoReviewStatus}
        photoReviewNote={card.photoReviewNote}
        onUpdated={(next) =>
          setCard((prev) =>
            prev
              ? {
                  ...prev,
                  photoUrl: next.photoUrl,
                  pendingPhotoUrl: next.pendingPhotoUrl,
                  photoReviewStatus: next.photoReviewStatus,
                  photoReviewNote: next.photoReviewNote,
                  hasPendingPhoto: next.hasPendingPhoto,
                }
              : prev,
          )
        }
      />

      <div className="sid-portal__tips no-print">
        <article className="sid-portal__tip">
          <span className="sid-portal__tip-icon" aria-hidden>
            <DashIcon name="attendance" className="dash-icon--sm" />
          </span>
          <div>
            <strong>{t("idCardPortal.tipGateCampusTitle")}</strong>
            <p>{t("idCardPortal.tipGateCampusStaff")}</p>
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
            <strong>{t("idCardPortal.tipAccessScanTitle")}</strong>
            <p>{t("idCardPortal.tipAccessScanStaff")}</p>
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
                window.open("/print/teacher-id-card?me=1&duplex=1", "_blank")
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
            <h3 className="tid-card__title">{t("idCardPortal.yourStaffId")}</h3>
            <p className="tid-card__sub">{t("idCardPortal.staffIdSub")}</p>
          </div>
          <span className="tid-card__badge">
            {previewBack ? t("idCardPortal.frontBack") : t("idCardPortal.frontOnly")}
          </span>
        </div>
        <div className="tid-preview-stage sid-portal__stage">
          <TeacherIdCardView
            card={card}
            showBack={previewBack}
            className={previewBack ? "sid-wrap--duplex" : undefined}
          />
        </div>
      </section>

      <p className="tid-footnote no-print">{t("idCardPortal.footnote")}</p>

      {modalOpen ? (
        <TeacherIdCardModal
          card={card}
          me
          onClose={() => setModalOpen(false)}
          showBack
          downloadHint
        />
      ) : null}
    </div>
  );
}
