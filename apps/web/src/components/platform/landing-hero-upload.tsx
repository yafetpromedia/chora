"use client";

import { useRef, useState } from "react";
import { fileToHeroDataUrl } from "@/lib/student-photo";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function LandingHeroUpload({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToHeroDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid image");
    }
  }

  const preview = value.trim();
  const isCustom = Boolean(preview);

  return (
    <div className="cfg-logo-upload">
      <p className="cfg-logo-upload__label">Landing hero image</p>
      <p className="cfg-section__lead" style={{ marginTop: 0 }}>
        Shown on the public homepage and school registration screens. Leave empty
        for the branded gradient background.
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
        {isCustom ? (
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
            onClick={() => inputRef.current?.click()}
          >
            {isCustom ? "Upload new" : "Upload image"}
          </button>
          {isCustom ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              Remove image
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <label className="cfg-field" style={{ marginTop: "1rem" }}>
        <span>Or paste image URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://cdn.example.com/hero.jpg"
        />
      </label>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
    </div>
  );
}
