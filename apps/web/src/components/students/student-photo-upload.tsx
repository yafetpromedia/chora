"use client";

import { useRef, useState } from "react";
import { fileToPhotoDataUrl } from "@/lib/student-photo";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
};

export function StudentPhotoUpload({ value, onChange, label = "Student photo" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid photo");
    }
  }

  return (
    <div className="stu-photo-upload">
      <p className="stu-photo-upload__label">{label}</p>
      <div className="stu-photo-upload__row">
        <div className="stu-photo-upload__preview">
          {value ? (
            <img src={value} alt="" width={96} height={120} />
          ) : (
            <span className="stu-photo-upload__placeholder" aria-hidden>
              Photo
            </span>
          )}
        </div>
        <div className="stu-photo-upload__actions">
          <button
            type="button"
            className="stu-btn stu-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Change photo" : "Upload photo"}
          </button>
          {value ? (
            <button
              type="button"
              className="stu-btn stu-btn--ghost stu-btn--danger-text"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="stu-field-hint">JPEG, PNG or WebP · max 2 MB</p>
          {error ? <p className="stu-toast stu-toast--error stu-photo-upload__error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
