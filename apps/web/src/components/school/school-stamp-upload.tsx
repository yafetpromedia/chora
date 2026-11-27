"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { fileToStampDataUrl } from "@/lib/student-photo";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function SchoolStampUpload({ value, onChange }: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToStampDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schoolBrandUploadUi.invalidImage"));
    }
  }

  const preview = value.trim() || null;

  return (
    <div className="cfg-logo-upload cfg-stamp-upload">
      <p className="cfg-logo-upload__label">{t("schoolBrandUploadUi.stampLabel")}</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("schoolBrandUploadUi.stampLead")}
      </p>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb cfg-stamp-upload__thumb">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">{t("schoolBrandUploadUi.noStamp")}</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? t("schoolBrandUploadUi.uploadNew") : t("schoolBrandUploadUi.uploadPng")}
          </button>
          {preview ? (
            <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => onChange("")}>
              {t("common.remove")}
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <label className="cfg-field" style={{ marginTop: "1rem" }}>
        <span>{t("schoolBrandUploadUi.pasteUrl")}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("schoolBrandUploadUi.stampUrlPh")}
        />
      </label>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}