"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BRAND_NAME } from "@/lib/brand";

type Variant = "light" | "dark";
type StoreKind = "play" | "apple";

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
  label,
  title,
  icon,
  variant,
  onClick,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  variant: Variant;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`lp3-store lp3-store--${variant}`}
      onClick={onClick}
      aria-label={`${label} ${title}`}
    >
      <span className="lp3-store__icon">{icon}</span>
      <span className="lp3-store__text">
        <small>{label}</small>
        <strong>{title}</strong>
      </span>
    </button>
  );
}

function ComingSoonDialog({
  open,
  store,
  onClose,
}: {
  open: boolean;
  store: StoreKind | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open || !store) return null;

  const storeName = store === "play" ? "Google Play" : "App Store";

  return createPortal(
    <div className="lp3-soon" role="presentation">
      <button
        type="button"
        className="lp3-soon__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="lp3-soon__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="lp3-soon__mark" aria-hidden>
          {store === "play" ? <PlayIcon /> : <AppleIcon />}
        </div>
        <p className="lp3-soon__eyebrow">{BRAND_NAME} mobile</p>
        <h2 id={titleId} className="lp3-soon__title">
          Coming soon
        </h2>
        <p id={descId} className="lp3-soon__body">
          The {BRAND_NAME} app for {storeName} is almost ready. Families and staff can
          keep using the web portal with the same school code and login until
          launch.
        </p>
        <ul className="lp3-soon__list">
          <li>Attendance, results, and fees on the go</li>
          <li>Same account as the school web portal</li>
          <li>Free for families linked to your school</li>
        </ul>
        <div className="lp3-soon__actions">
          <button type="button" className="lp3-soon__btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
  const [store, setStore] = useState<StoreKind | null>(null);

  return (
    <>
      <div
        className={`lp3-stores${layout === "stack" ? " lp3-stores--stack" : ""}${
          className ? ` ${className}` : ""
        }`}
      >
        <StoreButton
          label="Get it on"
          title="Google Play"
          icon={<PlayIcon />}
          variant={variant}
          onClick={() => setStore("play")}
        />
        <StoreButton
          label="Download on the"
          title="App Store"
          icon={<AppleIcon />}
          variant={variant}
          onClick={() => setStore("apple")}
        />
      </div>
      <ComingSoonDialog
        open={store !== null}
        store={store}
        onClose={() => setStore(null)}
      />
    </>
  );
}
