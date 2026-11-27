"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LoginVisualPanel } from "@/components/auth/login-visual-panel";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME } from "@/lib/brand";

/** Shared seam curve (objectBoundingBox). Soft 3-wave graph down the middle. */
const SEAM =
  "M0.485,0 C0.545,0.14 0.430,0.30 0.500,0.46 C0.570,0.62 0.435,0.78 0.505,0.92 C0.530,0.97 0.490,0.99 0.495,1";

type LoginShellProps = {
  children: ReactNode;
  error?: string;
};

export function LoginShell({ children, error }: LoginShellProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const leftClipId = `login-split-left-${uid}`;
  const rightClipId = `login-split-right-${uid}`;

  const leftPath = `M0,0 L0.485,0 C0.545,0.14 0.430,0.30 0.500,0.46 C0.570,0.62 0.435,0.78 0.505,0.92 C0.530,0.97 0.490,0.99 0.495,1 L0,1 Z`;
  const rightPath = `${SEAM} L1,1 L1,0 Z`;

  const clipVars = {
    ["--login-clip-left"]: `url(#${leftClipId})`,
    ["--login-clip-right"]: `url(#${rightClipId})`,
  } as CSSProperties;

  return (
    <div className="reg-scene reg-scene--login" style={clipVars}>
      <div className="login-split">
        <svg className="login-split__defs" width="0" height="0" aria-hidden>
          <defs>
            <clipPath id={leftClipId} clipPathUnits="objectBoundingBox">
              <path d={leftPath} />
            </clipPath>
            <clipPath id={rightClipId} clipPathUnits="objectBoundingBox">
              <path d={rightPath} />
            </clipPath>
          </defs>
        </svg>

        <section className="reg-panel login-split__panel">
          <div className="reg-panel__mesh" aria-hidden />

          <header className="reg-top">
            <Link href="/" className="reg-top__brand no-underline">
              <BrandMark className="logo-mark reg-top__logo" />
              <span>{BRAND_NAME}</span>
            </Link>
            <div className="reg-top__actions">
              <LanguageSwitcher compact />
              <Link href="/" className="reg-top__link">
                {t("auth.home")}
              </Link>
            </div>
          </header>

          <motion.main
            className="reg-main reg-main--login"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">
                <span className="reg-hero__pulse" aria-hidden />
                {t("auth.welcomeBack")}
              </p>
              <h1 className="reg-hero__title">{t("auth.heroTitle")}</h1>
              <p className="reg-hero__sub">{t("auth.heroSub")}</p>
            </div>

            {error ? (
              <p className="auth-alert auth-alert--error reg-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="reg-card">{children}</div>

            <div className="reg-footer">
              <LoginFooterLinks />
            </div>
          </motion.main>
        </section>

        <section className="login-split__visual" aria-hidden={false}>
          <LoginVisualPanel />
        </section>

        <div className="login-split__seam" aria-hidden>
          <svg viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path
              d="M48.5 0 C54.5 140 43 300 50 460 C57 620 43.5 780 50.5 920 C53 970 49 990 49.5 1000"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function LoginFooterLinks() {
  const { t } = useLocale();
  return (
    <p className="reg-footer__line">
      {t("auth.newSchool")} <Link href="/register">{t("auth.register")}</Link>
    </p>
  );
}
