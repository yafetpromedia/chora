"use client";

import { useRef, useState } from "react";
import { SchoolBrandLockup } from "@/components/dashboard/school-brand-lockup";
import { useLocale } from "@/components/i18n/locale-provider";
import { fileToSchoolLogoDataUrl } from "@/lib/student-photo";
import { AppToast } from "@/components/ui/app-toast";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  schoolName: string;
  value: string;
  onChange: (url: string) => void;
};

export function SchoolLogoUpload({ schoolName, value, onChange }: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToSchoolLogoDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schoolBrandUploadUi.invalidImage"));
    }
  }

  const previewLogo = value.trim() || null;

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">{t("schoolBrandUploadUi.logoLabel")}</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("schoolBrandUploadUi.logoLead", { brand: BRAND_NAME })}
      </p>

      <div className="cfg-logo-upload__preview-wrap">
        <SchoolBrandLockup
          schoolName={schoolName || t("schoolBrandUploadUi.yourSchool")}
          schoolLogoUrl={previewLogo}
        />
      </div>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb">
          {previewLogo ? (
            <img src={previewLogo} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">{t("schoolBrandUploadUi.noLogo")}</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {previewLogo ? t("schoolBrandUploadUi.uploadNew") : t("schoolBrandUploadUi.uploadImage")}
          </button>
          {previewLogo ? (
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
        <span>{t("schoolBrandUploadUi.pasteUrl")}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("schoolBrandUploadUi.logoUrlPh")}
        />
      </label>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}