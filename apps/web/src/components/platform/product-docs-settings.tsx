"use client";

import { useEffect, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [probe, setProbe] = useState<"idle" | "ok" | "missing">("idle");

  const hasUploaded = Boolean(docsUrl.trim());
  const resolved = resolveProductDocsUrl(docsUrl);
  const downloadHref = productDocsDownloadUrl(resolved);
  const usingFallback = !hasUploaded;
  const thumbPreview = resolvePreviewUrl(thumbnailUrl);

  useEffect(() => {
    let cancelled = false;
    setProbe("idle");
    void fetch(resolved, { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        setProbe(res.ok ? "ok" : "missing");
      })
      .catch(() => {
        if (!cancelled) setProbe("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 40 * 1024 * 1024) {
      setError("PDF must be 40 MB or smaller");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setError("Please choose a PDF file");
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
      setError(err instanceof Error ? err.message : "Upload failed");
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
      setError(err instanceof Error ? err.message : "Invalid image");
    }
  }

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">Product documentation PDF</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Shown on the public homepage Explore section (
        <a href="/#explore" target="_blank" rel="noopener noreferrer">
          /#explore
        </a>
        ). Upload the Chora Product Documentation PDF (max 40&nbsp;MB).
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
              ? "Uploading…"
              : hasUploaded
                ? "Replace PDF"
                : "Upload PDF"}
          </button>
          <a
            className="cfg-btn cfg-btn--ghost"
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
          <a
            className="cfg-btn cfg-btn--ghost"
            href={resolved}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </a>
          <a
            className="cfg-btn cfg-btn--ghost"
            href="/#explore"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Explore
          </a>
          {hasUploaded ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled || uploading}
              onClick={() => onDocsUrlChange("")}
            >
              Clear
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
          Homepage uses uploaded file: <code>{docsUrl}</code>
          {probe === "ok" ? " · reachable" : null}
          {probe === "missing" ? " · not reachable yet (check API)" : null}
        </p>
      ) : (
        <p className="cfg-section__lead" style={{ marginTop: "0.65rem" }}>
          No upload yet. Homepage uses fallback{" "}
          <code>{PRODUCT_DOCS_FALLBACK_PATH}</code>
          {usingFallback && probe === "ok" ? " · available" : null}
          {usingFallback && probe === "missing"
            ? " · missing from public/ — upload a PDF here"
            : null}
        </p>
      )}

      <p className="cfg-logo-upload__label" style={{ marginTop: "1.25rem" }}>
        Documentation thumbnail (optional)
      </p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Cover image on the Explore docs card (JPEG/PNG/WebP, up to 25&nbsp;MB —
        we compress it automatically). Leave empty for the default mockup. Save
        settings after uploading.
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
            {thumbPreview ? "Upload new thumbnail" : "Upload thumbnail"}
          </button>
          {thumbPreview ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled}
              onClick={() => onThumbnailUrlChange("")}
            >
              Remove thumbnail
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
