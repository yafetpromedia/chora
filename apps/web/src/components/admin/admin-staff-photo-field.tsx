"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { fileToPhotoDataUrl } from "@/lib/student-photo";
import {
  adminClearTeacherPhoto,
  adminSetTeacherPhoto,
  type TeacherRecord,
} from "@/lib/teachers";

type Props = {
  userId: string;
  photoUrl: string | null;
  onUpdated: (next: TeacherRecord) => void;
  onToast?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AdminStaffPhotoField({
  userId,
  photoUrl,
  onUpdated,
  onToast,
  onError,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview ?? photoUrl;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      setPreview(dataUrl);
      const next = await adminSetTeacherPhoto(userId, dataUrl);
      setPreview(null);
      onUpdated(next);
      onToast?.(t("teachersUi.photoSaved"));
    } catch (err) {
      setPreview(null);
      onError?.(
        err instanceof Error ? err.message : t("teachersUi.photoFailed"),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      const next = await adminClearTeacherPhoto(userId);
      setPreview(null);
      onUpdated(next);
      onToast?.(t("teachersUi.photoRemoved"));
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : t("teachersUi.photoFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tch-drawer-section tch-admin-photo">
      <h3 className="tch-drawer-section__title">{t("teachersUi.sectionPhoto")}</h3>
      <p className="tch-meta">{t("teachersUi.photoMeta")}</p>
      <div className="tch-admin-photo__row">
        <div className="tch-admin-photo__preview" aria-hidden={!shown}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" />
          ) : (
            <span>{t("teachersUi.photoNone")}</span>
          )}
        </div>
        <div className="tch-admin-photo__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy
              ? t("teachersUi.photoSaving")
              : shown
                ? t("teachersUi.photoChange")
                : t("teachersUi.photoChoose")}
          </button>
          {photoUrl || preview ? (
            <button
              type="button"
              className="att-btn att-btn--danger"
              disabled={busy}
              onClick={() => void onRemove()}
            >
              {t("teachersUi.photoRemove")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
