"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BRAND_NAME } from "@/lib/brand";
import { useHydrated } from "@/lib/use-client-snapshot";
import {
  buildShareHandout,
  getLoginUrl,
  SCHOOL_TRIAL_DAYS,
} from "@/lib/school-welcome";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  open: boolean;
  schoolName: string;
  joinCode: string;
  /** @deprecated kept for callers; not shown in the dialog */
  adminUsername?: string;
  onContinue: () => void;
};

type CopiedKind = "code" | "url" | "handout";

export function SchoolWelcomeDialog({
  open,
  schoolName,
  joinCode,
  onContinue,
}: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const descId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const mounted = useHydrated();
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const [savedAck, setSavedAck] = useState(false);
  const reduce = useReducedMotion();

  const usageSteps = useMemo(
    () =>
      [
        { title: t("schoolWelcomeUi.step1Title"), body: t("schoolWelcomeUi.step1Body") },
        { title: t("schoolWelcomeUi.step2Title"), body: t("schoolWelcomeUi.step2Body") },
        {
          title: t("schoolWelcomeUi.step3Title"),
          body: t("schoolWelcomeUi.step3Body", { brand: BRAND_NAME }),
        },
      ] as const,
    [t],
  );

  const loginUrl = getLoginUrl();

  if (!open && (savedAck || copied)) {
    setSavedAck(false);
    setCopied(null);
  }

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
          <p className="school-welcome__eyebrow">
            {t("schoolWelcomeUi.welcomeEyebrow", { brand: BRAND_NAME })}
          </p>
          <h2 id={titleId} className="school-welcome__title">
            {t("schoolWelcomeUi.titleReady", { schoolName })}
          </h2>
          <p id={descId} className="school-welcome__lead">
            {t("schoolWelcomeUi.lead")}
            <strong>{t("schoolWelcomeUi.leadSettings")}</strong>
            {t("schoolWelcomeUi.leadEnd")}
          </p>
        </header>

        <p className="school-welcome__trial" role="status">
          {t("schoolWelcomeUi.trial", { days: SCHOOL_TRIAL_DAYS })}
        </p>

        <div className="school-welcome__code-block">
          <span className="school-welcome__code-label">{t("schoolWelcomeUi.codeLabel")}</span>
          <div className="school-welcome__code-row">
            <code className="school-welcome__code">{joinCode}</code>
            <button
              type="button"
              className="school-welcome__copy"
              onClick={() => void copyText("code", joinCode)}
            >
              {copied === "code" ? t("schoolWelcomeUi.copied") : t("schoolWelcomeUi.copyCode")}
            </button>
          </div>
          <p className="school-welcome__login-hint">
            {t("schoolWelcomeUi.loginPage")}{" "}
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
              {copied === "url" ? t("schoolWelcomeUi.copied") : t("schoolWelcomeUi.copyLoginUrl")}
            </button>
            <button
              type="button"
              className="school-welcome__copy-secondary school-welcome__copy-secondary--primary"
              onClick={() => void copyText("handout", handoutText)}
            >
              {copied === "handout" ? t("schoolWelcomeUi.copied") : t("schoolWelcomeUi.copyHandout")}
            </button>
          </div>
        </div>

        <ol className="school-welcome__steps">
          {usageSteps.map((step, index) => (
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
          <span>{t("schoolWelcomeUi.ack")}</span>
        </label>

        <footer className="school-welcome__actions">
          <button
            ref={continueRef}
            type="button"
            className="school-welcome__continue"
            disabled={!savedAck}
            onClick={onContinue}
          >
            {t("schoolWelcomeUi.continue")}
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}