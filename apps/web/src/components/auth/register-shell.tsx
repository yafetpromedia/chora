"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { RegisterVisualPanel } from "@/components/auth/register-visual-panel";

type RegisterShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  error?: string;
  activeStep: number;
  stepCount: number;
  stepLabel: string;
  schoolName?: string;
};

export function RegisterShell({
  children,
  footer,
  error,
  activeStep,
  stepCount,
  stepLabel,
  schoolName,
}: RegisterShellProps) {
  const reduce = useReducedMotion();
  const progress = ((activeStep + 1) / stepCount) * 100;

  return (
    <div className="reg-scene">
      <div className="reg-layout">
        <section className="reg-panel">
          <div className="reg-panel__mesh" aria-hidden />

          <header className="reg-top">
            <Link href="/" className="reg-top__brand no-underline">
              <span className="logo-mark reg-top__logo">C1</span>
              <span>CampusOne</span>
            </Link>
            <Link href="/" className="reg-top__link">
              Home
            </Link>
          </header>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">
                <span className="reg-hero__pulse" aria-hidden />
                Free 14-day trial · No credit card
              </p>
              <h1 className="reg-hero__title">
                Create your <span>school workspace</span>
              </h1>
              <p className="reg-hero__sub">
                Join Ethiopian schools running attendance, grades, fees, and parent
                communication on one platform.
              </p>
            </div>

            <div className="reg-progress" aria-label="Registration progress">
              <div className="reg-progress__track">
                <motion.div
                  className="reg-progress__bar"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
              <p className="reg-progress__meta">
                <span>Step {activeStep + 1} of {stepCount}</span>
                <strong>{stepLabel}</strong>
              </p>
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
          <RegisterVisualPanel activeStep={activeStep} schoolName={schoolName} />
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
      <span aria-hidden>·</span>
      <Link href="/join">Join with a code</Link>
    </p>
  );
}
