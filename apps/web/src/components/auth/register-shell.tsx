"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  RegisterVisualPanel,
  TRIAL_HIGHLIGHTS,
} from "@/components/auth/register-visual-panel";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";

const STEPS = ["School", "Admin"] as const;

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
  const reduce = useReducedMotion();
  const progress = ((activeStep + 1) / STEPS.length) * 100;
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
            <Link href="/login" className="reg-top__link">
              Sign in
            </Link>
          </header>

          <div className="reg-mobile-banner" aria-hidden>
            {heroSrc ? <img src={heroSrc} alt="" /> : null}
            <div className="reg-mobile-banner__tint" />
            <p>Free 14-day trial</p>
          </div>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">
                Free 14-day trial · No credit card
              </p>
              <h1 className="reg-hero__title">
                Create your <span>school workspace</span>
              </h1>
              <p className="reg-hero__sub">
                Two short steps. Add staff and students from the dashboard after
                you launch.
              </p>
              <ul className="reg-trial-features" aria-label="Included in the free trial">
                {TRIAL_HIGHLIGHTS.map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
            </div>

            <div className="reg-progress" aria-label="Registration progress">
              <div className="reg-progress__meta">
                <span>
                  Step {activeStep + 1} of {STEPS.length}
                </span>
                <strong>{STEPS[activeStep]}</strong>
              </div>
              <div className="reg-progress__track">
                <motion.div
                  className="reg-progress__bar"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
              <ol className="reg-progress__steps">
                {STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={
                      index === activeStep
                        ? "is-active"
                        : index < activeStep
                          ? "is-done"
                          : undefined
                    }
                    aria-current={index === activeStep ? "step" : undefined}
                  >
                    {label}
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
  return (
    <p className="reg-footer__line">
      Already have a workspace?{" "}
      <Link href="/login">Sign in</Link>
    </p>
  );
}
