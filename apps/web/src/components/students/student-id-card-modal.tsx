"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { StudentIdCardView } from "@/components/students/student-id-card";
import {
  getStudentIdCard,
  type StudentIdCard,
} from "@/lib/student-cards";
import type { StudentIdCardVariant } from "@/components/students/student-id-card";
import { printStudentIdCard } from "@/lib/student-card-print";
import { BRAND_NAME } from "@/lib/brand";

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
  const { t } = useLocale();
  const [fetchedCard, setCard] = useState<StudentIdCard | null>(null);
  const card = initialCard ?? fetchedCard;
  const [loading, setLoading] = useState(!initialCard && !!studentProfileId);
  const [error, setError] = useState("");
  const [duplex, setDuplex] = useState(showBack);

  const fetchKey = initialCard ? "" : (studentProfileId ?? "");
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    if (fetchKey) {
      setLoading(true);
      setError("");
    } else {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCard || !studentProfileId) return;
    void getStudentIdCard(studentProfileId)
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPortal.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [studentProfileId, initialCard]);

  if (!studentProfileId && !initialCard) return null;

  return (
    <>
      <button
        type="button"
        className="sid-modal-backdrop"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="sid-modal" role="dialog" aria-labelledby="sid-modal-title">
        <header className="sid-modal__head">
          <div>
            <h2 id="sid-modal-title" className="sid-modal__title">
              {t("studentIdCardModalUi.title")}
            </h2>
            <p className="sid-modal__sub">
              {downloadHint
                ? t("studentIdCardModalUi.subDownload")
                : t("studentIdCardModalUi.subDefault")}
            </p>
          </div>
          <button
            type="button"
            className="sid-modal__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
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
            {t("idCardPortal.showBack")}
          </label>
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={!card || !studentProfileId}
            onClick={() => {
              if (!studentProfileId) return;
              printStudentIdCard({ studentProfileId, duplex });
            }}
          >
            {t("studentIdCardModalUi.printPdf")}
          </button>
          <span className="sid-modal__download-hint">
            {t("studentIdCardModalUi.printHintPrefix")}
            <strong>{t("studentIdCardModalUi.printHintBg")}</strong>
            {duplex ? t("studentIdCardModalUi.printHintDuplex") : ""}
            {downloadHint ? t("studentIdCardModalUi.printHintPdf") : ""}
          </span>
        </div>

        <div className="sid-modal__body sid-print-sheet">
          {loading ? (
            <p className="setup-hint">{t("idCardPortal.loadingIdCard")}</p>
          ) : error ? (
            <p className="att-toast att-toast--error">{error}</p>
          ) : card ? (
            <>
              <header className="sid-print-meta">
                <p className="sid-print-meta__brand">{BRAND_NAME}</p>
                <h1 className="sid-print-meta__title">{card.name}</h1>
                <p className="sid-print-meta__sub">
                  {card.schoolName}
                  {card.studentId ? ` · ${card.studentId}` : ""}
                </p>
                {duplex ? (
                  <p className="sid-print-meta__hint">{t("studentIdCardModalUi.pageFrontBack")}</p>
                ) : (
                  <p className="sid-print-meta__hint">{t("studentIdCardModalUi.frontOnly")}</p>
                )}
              </header>
              <StudentIdCardView
                card={card}
                variant={variant}
                showBack={duplex}
                className={duplex ? "sid-wrap--print-duplex" : undefined}
              />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}