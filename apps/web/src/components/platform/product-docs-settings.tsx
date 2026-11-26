"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { getApiBaseUrl } from "@/lib/api";
import { platformUpload } from "@/lib/platform-auth";
import {
  PRODUCT_DOCS_FALLBACK_PATH,
  productDocsDownloadUrl,
  resolveProductDocsUrl,
} from "@/lib/product-docs";
import type { PlatformSettings } from "@/lib/platform-settings";
import { fileToDocsThumbnailDataUrl } from "@/lib/student-photo";

type Props = {
  docsUrl: string;
  thumbnailUrl: string;
  onDocsUrlChange: (url: string) => void;
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

export function ProductDocsSettings({
  docsUrl,
  thumbnailUrl,
  onDocsUrlChange,
  onThumbnailUrlChange,
  onUploaded,
  disabled,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    url: string;
    status: "ok" | "missing";
  } | null>(null);

  const hasUploaded = Boolean(docsUrl.trim());
  const resolved = resolveProductDocsUrl(docsUrl);
  const probe: "idle" | "ok" | "missing" =
    probeResult && probeResult.url === resolved ? probeResult.status : "idle";
  const downloadHref = productDocsDownloadUrl(resolved);
  const usingFallback = !hasUploaded;
  const thumbPreview = resolvePreviewUrl(thumbnailUrl);

  useEffect(() => {
    let cancelled = false;
    void fetch(resolved, { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        setProbeResult({ url: resolved, status: res.ok ? "ok" : "missing" });
      })
      .catch(() => {
        if (!cancelled) setProbeResult({ url: resolved, status: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 40 * 1024 * 1024) {
      setError(t("platformUi.docsPdfTooLarge"));
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setError(t("platformUi.docsChoosePdf"));
      return;
    }
    setUploading(true);
    try {
      const settings = await platformUpload<PlatformSettings>(
        "/platform/settings/product-docs",
        file,
      );
      onUploaded(settings);
      onDocsUrlChange(settings.productDocsUrl ?? "");
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
      const dataUrl = await fileToDocsThumbnailDataUrl(file);
      onThumbnailUrlChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.invalidImage"));
    }
  }

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">{t("platformUi.docsLabel")}</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("platformUi.docsLeadBefore")}
        <a href="/#explore" target="_blank" rel="noopener noreferrer">
          /#explore
        </a>
        {t("platformUi.docsLeadAfter")}
      </p>

      <div className="cfg-logo-upload__row" style={{ marginTop: "0.85rem" }}>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading
              ? t("platformUi.uploading")
              : hasUploaded
                ? t("platformUi.docsReplace")
                : t("platformUi.docsUpload")}
          </button>
          <a
            className="cfg-btn cfg-btn--ghost"
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("platformUi.docsDownload")}
          </a>
          <a
            className="cfg-btn cfg-btn--ghost"
            href={resolved}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("platformUi.docsView")}
          </a>
          <a
            className="cfg-btn cfg-btn--ghost"
            href="/#explore"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("platformUi.docsOpenExplore")}
          </a>
          {hasUploaded ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled || uploading}
              onClick={() => onDocsUrlChange("")}
            >
              {t("platformUi.docsClear")}
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {hasUploaded ? (
        <p className="cfg-section__lead" style={{ marginTop: "0.65rem" }}>
          {t("platformUi.docsUsingUpload")} <code>{docsUrl}</code>
          {probe === "ok" ? t("platformUi.docsReachable") : null}
          {probe === "missing" ? t("platformUi.docsNotReachable") : null}
        </p>
      ) : (
        <p className="cfg-section__lead" style={{ marginTop: "0.65rem" }}>
          {t("platformUi.docsNoUploadYet")}{" "}
          <code>{PRODUCT_DOCS_FALLBACK_PATH}</code>
          {usingFallback && probe === "ok" ? t("platformUi.docsAvailable") : null}
          {usingFallback && probe === "missing" ? t("platformUi.docsMissingPublic") : null}
        </p>
      )}

      <p className="cfg-logo-upload__label" style={{ marginTop: "1.25rem" }}>
        {t("platformUi.docsThumbLabel")}
      </p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        {t("platformUi.docsThumbLead")}
      </p>

      <div
        className="cfg-logo-upload__preview-wrap"
        style={{
          borderRadius: "0.85rem",
          overflow: "hidden",
          aspectRatio: "210 / 297",
          maxWidth: "11rem",
          background:
            "linear-gradient(160deg, #0f4f4b 0%, #147d76 48%, #1a9a92 100%)",
        }}
      >
        {thumbPreview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbPreview}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
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
            {thumbPreview
              ? t("platformUi.demoUploadNewThumb")
              : t("platformUi.demoUploadThumb")}
          </button>
          {thumbPreview ? (
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

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}
