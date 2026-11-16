"use client";

import { useRef, useState } from "react";
import { fileToStampDataUrl } from "@/lib/student-photo";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function SchoolStampUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToStampDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid image");
    }
  }

  const preview = value.trim() || null;

  return (
    <div className="cfg-logo-upload cfg-stamp-upload">
      <p className="cfg-logo-upload__label">School stamp</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Official seal for yearly report cards. You can optionally enable it on
        student ID cards in the checkbox below. Prefer a clear PNG with a
        transparent background.
      </p>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb cfg-stamp-upload__thumb">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">No stamp</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? "Upload new" : "Upload PNG"}
          </button>
          {preview ? (
            <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => onChange("")}>
              Remove
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
        <span>Or paste image URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://yourschool.edu/stamp.png"
        />
      </label>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}
