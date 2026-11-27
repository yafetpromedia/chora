"use client";

import { useRef, useState } from "react";
import { fileToPhotoDataUrl } from "@/lib/student-photo";
import {
  cancelMyPendingTeacherPhoto,
  submitMyTeacherPhoto,
  type TeacherPhotoReviewStatus,
} from "@/lib/teachers";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  photoUrl: string | null;
  pendingPhotoUrl: string | null;
  photoReviewStatus: TeacherPhotoReviewStatus;
  photoReviewNote: string | null;
  onUpdated: (next: {
    photoUrl: string | null;
    pendingPhotoUrl: string | null;
    photoReviewStatus: TeacherPhotoReviewStatus;
    photoReviewNote: string | null;
    hasPendingPhoto: boolean;
  }) => void;
};

export function TeacherIdPhotoUpload({
  photoUrl,
  pendingPhotoUrl,
  photoReviewStatus,
  photoReviewNote,
  onUpdated,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const preview = draft ?? pendingPhotoUrl ?? photoUrl;
  const pending = photoReviewStatus === "PENDING" && !!pendingPhotoUrl;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setToast("");
    try {
      setDraft(await fileToPhotoDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teacherIdPhotoUi.invalidPhoto"));
    }
  }

  async function onSubmit() {
    if (!draft) return;
    setBusy(true);
    setError("");
    setToast("");
    try {
      const next = await submitMyTeacherPhoto(draft);
      setDraft(null);
      onUpdated(next);
      setToast(t("teacherIdPhotoUi.submittedToast"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teacherIdPhotoUi.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onCancelPending() {
    setBusy(true);
    setError("");
    setToast("");
    try {
      const next = await cancelMyPendingTeacherPhoto();
      setDraft(null);
      onUpdated(next);
      setToast(t("teacherIdPhotoUi.cancelledToast"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teacherIdPhotoUi.cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tid-card tid-card--photo no-print">
      <div className="tid-card__head">
        <div>
          <h3 className="tid-card__title">{t("teacherIdPhotoUi.title")}</h3>
          <p className="tid-card__sub">{t("teacherIdPhotoUi.sub")}</p>
        </div>
        {pending ? (
          <span className="tid-card__badge">{t("teacherIdPhotoUi.badgePending")}</span>
        ) : photoReviewStatus === "REJECTED" ? (
          <span className="tid-card__badge">{t("teacherIdPhotoUi.badgeRejected")}</span>
        ) : photoUrl ? (
          <span className="tid-card__badge">{t("teacherIdPhotoUi.badgeApproved")}</span>
        ) : null}
      </div>

      <div className="tid-photo-upload">
        <div className="tid-photo-upload__preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span aria-hidden>{t("teacherIdPhotoUi.photoPlaceholder")}</span>
          )}
        </div>
        <div className="tid-photo-upload__actions">
          <button
            type="button"
            className="tid-btn tid-btn--ghost"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {draft || pending || photoUrl
              ? t("teacherIdPhotoUi.chooseNew")
              : t("teacherIdPhotoUi.uploadPhoto")}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {draft ? (
            <button
              type="button"
              className="tid-btn tid-btn--primary"
              disabled={busy}
              onClick={() => void onSubmit()}
            >
              {busy ? t("teacherIdPhotoUi.submitting") : t("teacherIdPhotoUi.submitApproval")}
            </button>
          ) : null}
          {pending && !draft ? (
            <button
              type="button"
              className="tid-btn tid-btn--ghost"
              disabled={busy}
              onClick={() => void onCancelPending()}
            >
              {t("teacherIdPhotoUi.cancelPending")}
            </button>
          ) : null}
          <p className="cfg-hint">{t("teacherIdPhotoUi.hint")}</p>
          {photoReviewStatus === "REJECTED" && photoReviewNote ? (
            <p className="tid-alert tid-alert--error">{photoReviewNote}</p>
          ) : null}
          {error ? <p className="tid-alert tid-alert--error">{error}</p> : null}
          {toast ? <p className="cfg-hint">{toast}</p> : null}
        </div>
      </div>
    </section>
  );
}