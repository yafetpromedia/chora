"use client";

import type { AppConfirmTone } from "@/components/ui/app-confirm-dialog";

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

export function AppConfirmNotice({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={`app-confirm-notice app-confirm-notice--${tone}`}
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="app-confirm-notice-title"
      aria-describedby="app-confirm-notice-message"
    >
      <div className="app-confirm-notice__icon" aria-hidden>
        !
      </div>
      <div className="app-confirm-notice__body">
        <p id="app-confirm-notice-title" className="app-confirm-notice__title">
          {title}
        </p>
        <p id="app-confirm-notice-message" className="app-confirm-notice__message">
          {message}
        </p>
      </div>
      <div className="app-confirm-notice__actions">
        <button
          type="button"
          className="app-confirm-notice__btn app-confirm-notice__btn--ghost"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`app-confirm-notice__btn app-confirm-notice__btn--confirm app-confirm-notice__btn--${tone}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
