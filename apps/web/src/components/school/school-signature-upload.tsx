"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { fileToPhotoDataUrl } from "@/lib/student-photo";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  value: string;
  label: string;
  onChange: (url: string) => void;
  onLabelChange: (label: string) => void;
};

export function SchoolSignatureUpload({
  value,
  label,
  onChange,
  onLabelChange,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schoolBrandUploadUi.invalidImage"));
    }
  }

  const preview = value.trim() || null;
  const displayLabel = label.trim() || t("schoolBrandUploadUi.defaultSigLabel");

  return (
    <div className="cfg-logo-upload cfg-sig-upload">
      <p className="cfg-logo-upload__label">{t("schoolBrandUploadUi.signatureLabel")}</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("schoolBrandUploadUi.signatureLead")}
      </p>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb cfg-sig-upload__thumb">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">{t("schoolBrandUploadUi.noSignature")}</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? t("schoolBrandUploadUi.uploadNew") : t("schoolBrandUploadUi.uploadImage")}
          </button>
          {preview ? (
            <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => onChange("")}>
              {t("common.remove")}
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <label className="cfg-field" style={{ marginTop: "1rem" }}>
        <span>{t("schoolBrandUploadUi.labelUnderSig")}</span>
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={t("schoolBrandUploadUi.directorPh")}
        />
      </label>

      <label className="cfg-field" style={{ marginTop: "0.75rem" }}>
        <span>{t("schoolBrandUploadUi.pasteUrl")}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("schoolBrandUploadUi.signatureUrlPh")}
        />
      </label>

      {preview ? (
        <p className="cfg-hint" style={{ marginTop: "0.75rem" }}>
          {t("schoolBrandUploadUi.previewLabel", { label: displayLabel })}
        </p>
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}