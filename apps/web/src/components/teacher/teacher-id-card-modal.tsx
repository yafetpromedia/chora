"use client";

import { useEffect, useState } from "react";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import type { TeacherIdCardVariant } from "@/components/teacher/teacher-id-card";
import {
  getMyTeacherIdCard,
  getTeacherIdCard,
  printTeacherIdCard,
  type TeacherIdCard,
} from "@/lib/teacher-cards";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  /** Pre-loaded card (skips fetch). */
  card?: TeacherIdCard | null;
  userId?: string | null;
  me?: boolean;
  onClose: () => void;
  variant?: TeacherIdCardVariant;
  showBack?: boolean;
  downloadHint?: boolean;
};

export function TeacherIdCardModal({
  card: initialCard,
  userId = null,
  me = false,
  onClose,
  variant = "standard",
  showBack = true,
  downloadHint = false,
}: Props) {
  const { t } = useLocale();
  const [fetchedCard, setCard] = useState<TeacherIdCard | null>(null);
  const card = initialCard ?? fetchedCard;
  const [loading, setLoading] = useState(!initialCard && (me || !!userId));
  const [error, setError] = useState("");
  const [duplex, setDuplex] = useState(showBack);

  const fetchKey = initialCard ? "" : me ? "me" : (userId ?? "");
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
    if (initialCard) return;
    if (!me && !userId) return;
    const load = me ? getMyTeacherIdCard() : getTeacherIdCard(userId!);
    void load
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPortal.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [initialCard, me, userId, t]);

  if (!initialCard && !me && !userId) return null;

  return (
    <>
      <button
        type="button"
        className="sid-modal-backdrop"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="sid-modal" role="dialog" aria-labelledby="tid-modal-title">
        <header className="sid-modal__head">
          <div>
            <h2 id="tid-modal-title" className="sid-modal__title">
              {t("teacherIdCardModalUi.title")}
            </h2>
            <p className="sid-modal__sub">
              {downloadHint
                ? t("teacherIdCardModalUi.subDownload")
                : t("teacherIdCardModalUi.subDefault")}
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
            disabled={!card}
            onClick={() => {
              if (me) {
                printTeacherIdCard({ me: true, duplex });
                return;
              }
              if (userId || card?.userId) {
                printTeacherIdCard({
                  userId: userId ?? card?.userId,
                  duplex,
                });
              }
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
                  {card.teacherId ? ` · ${card.teacherId}` : ""}
                </p>
                {duplex ? (
                  <p className="sid-print-meta__hint">{t("studentIdCardModalUi.pageFrontBack")}</p>
                ) : (
                  <p className="sid-print-meta__hint">{t("studentIdCardModalUi.frontOnly")}</p>
                )}
              </header>
              <TeacherIdCardView
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