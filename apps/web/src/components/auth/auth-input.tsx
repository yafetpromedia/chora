"use client";

import { useState } from "react";

type AuthInputProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  icon?: "email" | "password" | "user" | "none";
};

function FieldIcon({ kind }: { kind: AuthInputProps["icon"] }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "email") {
    return (
      <svg {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 7 10-7" />
      </svg>
    );
  }
  if (kind === "password") {
    return (
      <svg {...props}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (kind === "user") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    );
  }
  return null;
}

export function AuthInput({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
  required,
  minLength,
  icon = "none",
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="auth-input-wrap">
      <label className="auth-input-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-field">
        {icon !== "none" ? (
          <span className="auth-input-icon" aria-hidden>
            <FieldIcon kind={icon} />
          </span>
        ) : null}
        <input
          id={id}
          className={`auth-input${isPassword ? " auth-input--password" : ""}`}
          type={inputType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span aria-hidden>{showPassword ? "Hide" : "Show"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
