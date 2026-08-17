"use client";

import { useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid image");
    }
  }

  const preview = value.trim() || null;
  const displayLabel = label.trim() || "Authorized signature";

  return (
    <div className="cfg-logo-upload cfg-sig-upload">
      <p className="cfg-logo-upload__label">Authorized signature</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Printed on student and staff ID cards and on report cards (Director sign
        block). Use a clear PNG or JPEG of the wet-ink or stamped signature.
      </p>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb cfg-sig-upload__thumb">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">No signature</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? "Upload new" : "Upload image"}
          </button>
          {preview ? (
            <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => onChange("")}>
              Remove
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
        <span>Label under signature</span>
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Director"
        />
      </label>

      <label className="cfg-field" style={{ marginTop: "0.75rem" }}>
        <span>Or paste image URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://yourschool.edu/signature.png"
        />
      </label>

      {preview ? (
        <p className="cfg-hint" style={{ marginTop: "0.75rem" }}>
          Preview label: {displayLabel}
        </p>
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}
