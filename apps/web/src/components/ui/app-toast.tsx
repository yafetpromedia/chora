"use client";

import { useEffect, useRef } from "react";

export type AppToastTone = "success" | "error" | "warn";

type Props = {
  message: string | null | undefined;
  onDismiss: () => void;
  tone?: AppToastTone;
  /** Auto-dismiss delay. Pass 0 to keep until dismissed. */
  durationMs?: number;
};

export function AppToast({
  message,
  onDismiss,
  tone = "success",
  durationMs = 4000,
}: Props) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message || durationMs <= 0) return;
    const id = window.setTimeout(() => onDismissRef.current(), durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs]);

  if (!message) return null;

  return (
    <div
      className={`app-toast app-toast--${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="app-toast__card">
        <span className="app-toast__dot" aria-hidden />
        <p>{message}</p>
        <button
          type="button"
          className="app-toast__close"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
