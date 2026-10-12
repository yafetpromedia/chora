"use client";

import { useEffect, useRef, useState } from "react";
import { AppToast } from "@/components/ui/app-toast";
import { platformUpload } from "@/lib/platform-auth";
import {
  PRODUCT_DOCS_FALLBACK_PATH,
  productDocsDownloadUrl,
  resolveProductDocsUrl,
} from "@/lib/product-docs";
import type { PlatformSettings } from "@/lib/platform-settings";

type Props = {
  docsUrl: string;
  onDocsUrlChange: (url: string) => void;
  onUploaded: (settings: PlatformSettings) => void;
  disabled?: boolean;
};

export function ProductDocsSettings({
  docsUrl,
  onDocsUrlChange,
  onUploaded,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [probe, setProbe] = useState<"idle" | "ok" | "missing">("idle");

  const hasUploaded = Boolean(docsUrl.trim());
  const resolved = resolveProductDocsUrl(docsUrl);
  const downloadHref = productDocsDownloadUrl(resolved);
  const usingFallback = !hasUploaded;

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

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}
