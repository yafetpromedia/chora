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
  variant?: "default" | "login";
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

function EyeIcon({ open }: { open: boolean }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (open) {
    return (
      <svg {...props}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
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
  variant = "default",
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;
  const isLogin = variant === "login";

  return (
    <div className={`auth-input-wrap${isLogin ? " auth-input-wrap--login" : ""}`}>
      <label className="auth-input-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-field">
        {!isLogin && icon !== "none" ? (
          <span className="auth-input-icon auth-input-icon--left" aria-hidden>
            <FieldIcon kind={icon} />
          </span>
        ) : null}
        <input
          id={id}
          className={`auth-input${isPassword ? " auth-input--password" : ""}${isLogin ? " auth-input--login" : ""}${isLogin && icon === "none" ? " auth-input--login-plain" : ""}`}
          type={inputType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
        />
        {isLogin && icon !== "none" && !isPassword ? (
          <span className="auth-input-icon auth-input-icon--right" aria-hidden>
            <FieldIcon kind={icon} />
          </span>
        ) : null}
        {isPassword ? (
          <button
            type="button"
            className={`auth-input-toggle${isLogin ? " auth-input-toggle--icon" : ""}`}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {isLogin ? (
              <EyeIcon open={showPassword} />
            ) : (
              <span aria-hidden>{showPassword ? "Hide" : "Show"}</span>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
