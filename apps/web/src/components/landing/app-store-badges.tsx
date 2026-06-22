import type { ReactNode } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-links";

type Variant = "light" | "dark";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="lp3-store__icon-svg">
      <path
        fill="currentColor"
        d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="lp3-store__icon-svg">
      <path
        fill="currentColor"
        d="M18.71 19.5C17.14 20.96 15.29 20.73 13.76 19.82C12.11 18.84 10.64 18.86 8.87 19.82C6.75 21.03 5.4 20.72 4.05 19.5C0.71 16.28 1.22 10.36 5.05 10.13C6.58 10.22 7.64 11.05 8.77 11.11C10.28 10.83 11.72 9.98 13.3 10.07C15.17 10.19 16.6 10.87 17.55 12.13C14.55 13.85 15.17 17.87 18.05 18.5C18.55 18.61 19.04 18.74 18.71 19.5ZM13.25 10.01C13.08 7.85 14.87 6.04 16.94 6C17.23 8.28 14.96 10.09 13.25 10.01Z"
      />
    </svg>
  );
}

function StoreButton({
  href,
  label,
  title,
  icon,
  variant,
}: {
  href: string;
  label: string;
  title: string;
  icon: ReactNode;
  variant: Variant;
}) {
  return (
    <a
      href={href}
      className={`lp3-store lp3-store--${variant}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <span className="lp3-store__icon">{icon}</span>
      <span className="lp3-store__text">
        <small>{label}</small>
        <strong>{title}</strong>
      </span>
    </a>
  );
}

export function AppStoreBadges({
  variant = "light",
  className = "",
  layout = "row",
}: {
  variant?: Variant;
  className?: string;
  layout?: "row" | "stack";
}) {
  return (
    <div
      className={`lp3-stores${layout === "stack" ? " lp3-stores--stack" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <StoreButton
        href={PLAY_STORE_URL}
        label="Get it on"
        title="Google Play"
        icon={<PlayIcon />}
        variant={variant}
      />
      <StoreButton
        href={APP_STORE_URL}
        label="Download on the"
        title="App Store"
        icon={<AppleIcon />}
        variant={variant}
      />
    </div>
  );
}
