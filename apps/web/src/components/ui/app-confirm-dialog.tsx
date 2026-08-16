"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AppConfirmTone = "danger" | "warning" | "default";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AppConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      window.cancelAnimationFrame(id);
    };
  }, [open]);

  useEffect(() => {
    if (!open || busy) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="app-confirm" role="presentation">
      <button
        type="button"
        className="app-confirm__backdrop"
        aria-label="Close dialog"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        className={`app-confirm__dialog app-confirm__dialog--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="app-confirm__icon" aria-hidden>
          {tone === "danger" ? "!" : tone === "warning" ? "!" : "?"}
        </div>
        <div className="app-confirm__body">
          <h2 id={titleId} className="app-confirm__title">
            {title}
          </h2>
          <p id={descId} className="app-confirm__message">
            {message}
          </p>
        </div>
        <footer className="app-confirm__actions">
          <button
            type="button"
            className="app-confirm__btn app-confirm__btn--ghost"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`app-confirm__btn app-confirm__btn--confirm app-confirm__btn--${tone}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
