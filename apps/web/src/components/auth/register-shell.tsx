"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  RegisterVisualPanel,
  useTrialHighlights,
} from "@/components/auth/register-visual-panel";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME } from "@/lib/brand";

const STEP_KEYS = ["register.school", "register.admin"] as const;
const STEPS_COUNT = STEP_KEYS.length;

type RegisterShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  error?: string;
  activeStep: number;
};

export function RegisterShell({
  children,
  footer,
  error,
  activeStep,
}: RegisterShellProps) {
  const { t } = useLocale();
  const trialHighlights = useTrialHighlights();
  const reduce = useReducedMotion();
  const progress = ((activeStep + 1) / STEPS_COUNT) * 100;
  const heroSrc = useLandingHeroImage();

  return (
    <div className="reg-scene">
      <div className="reg-layout">
        <section className="reg-panel">
          <div className="reg-panel__mesh" aria-hidden />

          <header className="reg-top">
            <Link href="/" className="reg-top__brand no-underline">
              <BrandMark className="logo-mark reg-top__logo" />
              <span>{BRAND_NAME}</span>
            </Link>
            <div className="reg-top__actions">
              <LanguageSwitcher compact />
              <Link href="/login" className="reg-top__link">
                {t("register.signIn")}
              </Link>
            </div>
          </header>

          <div className="reg-mobile-banner" aria-hidden>
            {heroSrc ? <img src={heroSrc} alt="" /> : null}
            <div className="reg-mobile-banner__tint" />
            <p>{t("register.freeTrial")}</p>
          </div>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">{t("register.freeTrialEyebrow")}</p>
              <h1 className="reg-hero__title">
                {t("register.createTitle")} <span>{t("register.createAccent")}</span>
              </h1>
              <p className="reg-hero__sub">{t("register.createSub")}</p>
              <ul
                className="reg-trial-features"
                aria-label={t("register.trialFeaturesAria")}
              >
                {trialHighlights.map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
            </div>

            <div className="reg-progress" aria-label={t("register.progressAria")}>
              <div className="reg-progress__meta">
                <span>
                  {t("register.stepOf", { current: activeStep + 1, total: STEPS_COUNT })}
                </span>
                <strong>{t(STEP_KEYS[activeStep])}</strong>
              </div>
              <div className="reg-progress__track">
                <motion.div
                  className="reg-progress__bar"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
              <ol className="reg-progress__steps">
                {STEP_KEYS.map((key, index) => (
                  <li
                    key={key}
                    className={
                      index === activeStep
                        ? "is-active"
                        : index < activeStep
                          ? "is-done"
                          : undefined
                    }
                    aria-current={index === activeStep ? "step" : undefined}
                  >
                    {t(key)}
                  </li>
                ))}
              </ol>
            </div>

            {error ? (
              <p className="auth-alert auth-alert--error reg-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="reg-card">{children}</div>

            {footer ? <div className="reg-footer">{footer}</div> : null}
          </motion.main>
        </section>

        <section className="reg-visual-col" aria-hidden={false}>
          <RegisterVisualPanel activeStep={activeStep} />
        </section>
      </div>
    </div>
  );
}

export function RegisterFooterLinks() {
  const { t } = useLocale();
  return (
    <p className="reg-footer__line">
      {t("register.alreadyWorkspace")}{" "}
      <Link href="/login">{t("register.signIn")}</Link>
    </p>
  );
}
