"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { getApiBaseUrl } from "@/lib/api";
import { platformUpload } from "@/lib/platform-auth";
import type { PlatformSettings } from "@/lib/platform-settings";
import { fileToHeroDataUrl } from "@/lib/student-photo";

type Props = {
  videoUrl: string;
  thumbnailUrl: string;
  onVideoUrlChange: (url: string) => void;
  onThumbnailUrlChange: (url: string) => void;
  onUploaded: (settings: PlatformSettings) => void;
  disabled?: boolean;
};

function resolvePreviewUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return `${getApiBaseUrl()}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export function DemoVideoSettings({
  videoUrl,
  thumbnailUrl,
  onVideoUrlChange,
  onThumbnailUrlChange,
  onUploaded,
  disabled,
}: Props) {
  const { t } = useLocale();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function onVideoFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const settings = await platformUpload<PlatformSettings>(
        "/platform/settings/demo-video",
        file,
      );
      onUploaded(settings);
      onVideoUrlChange(settings.demoVideoUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function onThumbFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToHeroDataUrl(file);
      onThumbnailUrlChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.invalidImage"));
    }
  }

  const preview = resolvePreviewUrl(thumbnailUrl);
  const hasVideo = Boolean(videoUrl.trim());

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">{t("platformUi.demoLabel")}</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("platformUi.demoLead")}
      </p>

      <div className="cfg-field" style={{ marginTop: "0.85rem" }}>
        <label htmlFor="ps-demo-video-url">{t("platformUi.demoUrlLabel")}</label>
        <input
          id="ps-demo-video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          disabled={disabled || uploading}
          placeholder={t("platformUi.demoUrlPh")}
          autoComplete="off"
        />
      </div>

      <div className="cfg-logo-upload__row" style={{ marginTop: "0.65rem" }}>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            disabled={disabled || uploading}
            onClick={() => videoInputRef.current?.click()}
          >
            {uploading
              ? t("platformUi.uploading")
              : hasVideo
                ? t("platformUi.demoReplaceVideo")
                : t("platformUi.demoUploadVideo")}
          </button>
          {hasVideo ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled || uploading}
              onClick={() => onVideoUrlChange("")}
            >
              {t("platformUi.demoClearVideo")}
            </button>
          ) : null}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => {
              void onVideoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <p className="cfg-logo-upload__label" style={{ marginTop: "1.25rem" }}>
        {t("platformUi.demoThumbLabel")}
      </p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("platformUi.demoThumbLead")}
      </p>

      <div
        className="cfg-logo-upload__preview-wrap"
        style={{
          borderRadius: "0.85rem",
          overflow: "hidden",
          aspectRatio: "16 / 9",
          background:
            "linear-gradient(155deg, #0f2d2d 0%, #0f766e 40%, #14b8a6 100%)",
        }}
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>

      <div className="cfg-logo-upload__row" style={{ marginTop: "0.85rem" }}>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            disabled={disabled}
            onClick={() => thumbInputRef.current?.click()}
          >
            {preview ? t("platformUi.demoUploadNewThumb") : t("platformUi.demoUploadThumb")}
          </button>
          {preview ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled}
              onClick={() => onThumbnailUrlChange("")}
            >
              {t("platformUi.demoRemoveThumb")}
            </button>
          ) : null}
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void onThumbFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error ? <AppToast message={error} tone="error" onDismiss={() => setError("")} /> : null}
    </div>
  );
}
