"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BRAND_NAME } from "@/lib/brand";
import {
  buildShareHandout,
  getLoginUrl,
  SCHOOL_TRIAL_DAYS,
} from "@/lib/school-welcome";

type Props = {
  open: boolean;
  schoolName: string;
  joinCode: string;
  /** @deprecated kept for callers; not shown in the dialog */
  adminUsername?: string;
  onContinue: () => void;
};

const USAGE_STEPS = [
  {
    title: "Sign-in page",
    body: "Teachers, parents, and students open the login page and enter your school code first.",
  },
  {
    title: "Share with staff & families",
    body: "Share this code when people join, or use invitation links in Admin → Settings → Access.",
  },
  {
    title: "Mobile app",
    body: `The ${BRAND_NAME} app uses the same school code and login — no separate signup.`,
  },
] as const;

type CopiedKind = "code" | "url" | "handout";

export function SchoolWelcomeDialog({
  open,
  schoolName,
  joinCode,
  onContinue,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const [savedAck, setSavedAck] = useState(false);
  const reduce = useReducedMotion();

  const loginUrl = getLoginUrl();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSavedAck(false);
      setCopied(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.requestAnimationFrame(() => continueRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      window.cancelAnimationFrame(id);
    };
  }, [open]);

  async function copyText(kind: CopiedKind, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      /* ignore */
    }
  }

  if (!open || !mounted) return null;

  const handoutText = buildShareHandout({
    schoolName,
    joinCode,
    loginUrl,
  });

  return createPortal(
    <div className="school-welcome" role="presentation">
      <div className="school-welcome__backdrop" aria-hidden />

      <motion.div
        className="school-welcome__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="school-welcome__hero" aria-hidden>
          <span className="school-welcome__badge">✓</span>
        </div>

        <header className="school-welcome__head">
          <p className="school-welcome__eyebrow">Welcome to {BRAND_NAME}</p>
          <h2 id={titleId} className="school-welcome__title">
            {schoolName} is ready
          </h2>
          <p id={descId} className="school-welcome__lead">
            Save your school code — everyone uses it to sign in. You can always find it under{" "}
            <strong>Admin → Settings → Access</strong>.
          </p>
        </header>

        <p className="school-welcome__trial" role="status">
          Your {SCHOOL_TRIAL_DAYS}-day free trial starts today — explore every core module.
        </p>

        <div className="school-welcome__code-block">
          <span className="school-welcome__code-label">Your school code</span>
          <div className="school-welcome__code-row">
            <code className="school-welcome__code">{joinCode}</code>
            <button
              type="button"
              className="school-welcome__copy"
              onClick={() => void copyText("code", joinCode)}
            >
              {copied === "code" ? "Copied!" : "Copy code"}
            </button>
          </div>
          <p className="school-welcome__login-hint">
            Login page:{" "}
            <a href={loginUrl} target="_blank" rel="noopener noreferrer">
              {loginUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
          <div className="school-welcome__copy-row">
            <button
              type="button"
              className="school-welcome__copy-secondary"
              onClick={() => void copyText("url", loginUrl)}
            >
              {copied === "url" ? "Copied!" : "Copy login URL"}
            </button>
            <button
              type="button"
              className="school-welcome__copy-secondary school-welcome__copy-secondary--primary"
              onClick={() => void copyText("handout", handoutText)}
            >
              {copied === "handout" ? "Copied!" : "Copy share handout"}
            </button>
          </div>
        </div>

        <ol className="school-welcome__steps">
          {USAGE_STEPS.map((step, index) => (
            <li key={step.title} className="school-welcome__step">
              <span className="school-welcome__step-num" aria-hidden>
                {index + 1}
              </span>
              <div>
                <h3 className="school-welcome__step-title">{step.title}</h3>
                <p className="school-welcome__step-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <label className="school-welcome__ack">
          <input
            type="checkbox"
            checked={savedAck}
            onChange={(e) => setSavedAck(e.target.checked)}
          />
          <span>I&apos;ve saved my school code</span>
        </label>

        <footer className="school-welcome__actions">
          <button
            ref={continueRef}
            type="button"
            className="school-welcome__continue"
            disabled={!savedAck}
            onClick={onContinue}
          >
            Continue to your workspace →
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}
