"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME } from "@/lib/brand";

function FeatureGraphDivider({ delay = 0 }: { delay?: number }) {
  const gradId = `login-graph-fill-${String(delay).replace(".", "")}`;

  return (
    <span
      className="login-visual__feature-graph"
      aria-hidden
      style={{ animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 24 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path
          className="login-visual__feature-graph-area"
          d="M12 4 C16 14 8 24 12 34 C16 44 8 54 12 64 C16 74 9 84 12 96 L12 96 L12 4 Z"
          fill={`url(#${gradId})`}
        />
        <path
          className="login-visual__feature-graph-line"
          d="M12 4 C16 14 8 24 12 34 C16 44 8 54 12 64 C16 74 9 84 12 96"
          fill="none"
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="login-visual__feature-graph-dot"
          cx="12"
          cy="34"
          r="2.2"
          fill="#fff"
        />
        <circle
          className="login-visual__feature-graph-dot login-visual__feature-graph-dot--b"
          cx="12"
          cy="64"
          r="1.8"
          fill="#b8e8eb"
        />
      </svg>
    </span>
  );
}

export function LoginVisualPanel() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const heroSrc = useLandingHeroImage();

  const features = useMemo(
    () =>
      ([
        {
          titleKey: "auth.visualAttendanceTitle",
          descKey: "auth.visualAttendanceDesc",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7.5 12.5l2.75 2.75 6-6.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          titleKey: "auth.visualLibraryTitle",
          descKey: "auth.visualLibraryDesc",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6.25 5.75h5.25a2 2 0 012 2V18H8.25a2 2 0 01-2-2V5.75z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 7.75H16.75a2 2 0 012 2V18H11.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          titleKey: "auth.visualResultsTitle",
          descKey: "auth.visualResultsDesc",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 5.75h8a1.75 1.75 0 011.75 1.75v10.5A1.75 1.75 0 0116 19.75H8A1.75 1.75 0 016.25 18V7.5A1.75 1.75 0 018 5.75z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 10h4M10 13.25h4M10 16.5h2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
      ] as const).map((f) => ({
        ...f,
        title: t(f.titleKey),
        desc: t(f.descKey),
      })),
    [t],
  );

  return (
    <div className="login-visual">
      <div className="login-visual__bg" aria-hidden>
        {heroSrc ? (
          <img src={heroSrc} alt="" className="login-visual__photo" />
        ) : null}
        <div className="login-visual__tint" />
        <div className="login-visual__mesh" />
        <div className="login-visual__glow login-visual__glow--1" />
        <div className="login-visual__glow login-visual__glow--2" />
      </div>

      <div className="login-visual__content">
        <motion.header
          className="login-visual__brand"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="login-visual__brand-lockup">
            <span className="login-visual__logo-ring" aria-hidden>
              <span className="login-visual__logo-arc" />
              <BrandMark className="login-visual__logo-mark" />
            </span>
            <div className="login-visual__brand-text">
              <strong>{BRAND_NAME}</strong>
              <span>{t("auth.visualTagline")}</span>
            </div>
          </div>

          <div className="login-visual__trusted">
            <span className="login-visual__trusted-icon" aria-hidden>
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 8.25l2.25 2.25L12 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {t("auth.visualTrusted")}
          </div>
        </motion.header>

        <motion.div
          className="login-visual__hero"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="login-visual__title">
            {t("auth.visualTitleLine1")}
            <br />
            <span>{t("auth.visualTitleLine2")}</span>
          </h2>
          <p className="login-visual__body">{t("auth.visualBody")}</p>
        </motion.div>

        <motion.div
          className="login-visual__features-shell"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          <ul className="login-visual__features">
            {features.map((feature, index) => (
              <motion.li
                key={feature.titleKey}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
              >
                {index > 0 ? <FeatureGraphDivider delay={index * 0.55} /> : null}
                <span className="login-visual__feature-icon">{feature.icon}</span>
                <strong>{feature.title}</strong>
                <span>{feature.desc}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}