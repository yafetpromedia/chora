"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AuthPageVisual,
  type AuthVisualStep,
} from "@/components/auth/auth-page-visual";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  error?: string;
  hint?: string;
  visualTitle?: string;
  visualDescription?: string;
  steps?: AuthVisualStep[];
  activeStep?: number;
  hideVisual?: boolean;
  topLinkHref?: string;
  topLinkLabel?: string;
  narrowForm?: boolean;
  variant?: "default" | "login";
  wide?: boolean;
};

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
  error,
  hint,
  visualTitle,
  visualDescription,
  steps,
  activeStep = 0,
  topLinkHref = "/login",
  topLinkLabel = "Sign in",
  narrowForm = false,
  variant = "default",
  hideVisual = false,
  wide = false,
}: AuthPageShellProps) {
  const reduce = useReducedMotion();
  const isLogin = variant === "login";
  const showVisual = !hideVisual && !isLogin && visualTitle && visualDescription;

  if (isLogin) {
    return (
      <div className="auth-login-scene">
        <header className="auth-login-nav">
          <Link href="/" className="auth-login-nav__brand no-underline">
            <span className="logo-mark auth-login-nav__logo">C1</span>
            <span>CampusOne</span>
          </Link>
          <Link href={topLinkHref} className="auth-login-nav__link">
            {topLinkLabel}
          </Link>
        </header>

        <main className={`auth-login-main${wide ? " auth-login-main--wide" : ""}`}>
          <motion.div
            className="auth-login-card"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="auth-login-card__head">
              <h1 className="auth-login-card__title">{title}</h1>
              <p className="auth-login-card__subtitle">{subtitle}</p>
            </div>

            {error ? (
              <p className="auth-alert auth-alert--error auth-login-card__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="auth-login-card__body">{children}</div>

            {(footer || hint) ? (
              <div className="auth-login-card__more">
                {footer ? (
                  <div className="auth-login-card__links">{footer}</div>
                ) : null}
                {hint ? (
                  <p className="auth-login-card__demo" role="note">
                    {hint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page-scene">
      <div className="auth-page-layout">
        <section className="auth-page-panel-form">
          <>
              <header className="auth-page-top">
                <Link href="/" className="auth-page-top-brand no-underline">
                  <span className="logo-mark auth-page-logo-mark">C1</span>
                  <span>CampusOne</span>
                </Link>
                <Link href={topLinkHref} className="auth-page-top-link">
                  {topLinkLabel}
                </Link>
              </header>

              <motion.div
                className={`auth-page-panel-inner${narrowForm ? " auth-page-panel-inner--narrow" : ""}`}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <header className="auth-page-header">
                  <h1 className="auth-page-title">{title}</h1>
                  <p className="auth-page-subtitle">{subtitle}</p>
                </header>

                {error ? (
                  <p
                    className="auth-alert auth-alert--error auth-page-error"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="auth-page-body">{children}</div>

                <div className="auth-page-footer">{footer}</div>

                {hint ? (
                  <p className="auth-page-hint" role="note">
                    {hint}
                  </p>
                ) : null}
              </motion.div>
            </>
        </section>

        {showVisual ? (
          <section className="auth-page-panel-visual" aria-hidden>
            <AuthPageVisual
              title={visualTitle!}
              description={visualDescription!}
              steps={steps}
              activeStep={activeStep}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
