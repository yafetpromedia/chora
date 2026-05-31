"use client";

import { useRef, useState } from "react";
import { SchoolBrandLockup } from "@/components/dashboard/school-brand-lockup";
import { fileToPhotoDataUrl } from "@/lib/student-photo";

type Props = {
  schoolName: string;
  value: string;
  onChange: (url: string) => void;
};

export function SchoolLogoUpload({ schoolName, value, onChange }: Props) {
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

  const previewLogo = value.trim() || null;

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">School logo</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Shown beside the CampusOne mark in the sidebar for all staff, teachers, students, and
        parents at your school.
      </p>

      <div className="cfg-logo-upload__preview-wrap">
        <SchoolBrandLockup schoolName={schoolName || "Your school"} schoolLogoUrl={previewLogo} />
      </div>

      <div className="cfg-logo-upload__row">
        <div className="cfg-logo-upload__thumb">
          {previewLogo ? (
            <img src={previewLogo} alt="" />
          ) : (
            <span className="cfg-logo-upload__placeholder">No logo</span>
          )}
        </div>
        <div className="cfg-logo-upload__actions">
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {previewLogo ? "Upload new" : "Upload image"}
          </button>
          {previewLogo ? (
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
        <span>Or paste image URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://yourschool.edu/logo.png"
        />
      </label>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
    </div>
  );
}
