"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LoginVisualPanel } from "@/components/auth/login-visual-panel";

type LoginShellProps = {
  children: ReactNode;
  error?: string;
  schoolCode?: string;
  schoolName?: string;
};

export function LoginShell({ children, error, schoolCode, schoolName }: LoginShellProps) {
  const reduce = useReducedMotion();

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
            className="reg-main reg-main--login"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">
                <span className="reg-hero__pulse" aria-hidden />
                Welcome back
              </p>
              <h1 className="reg-hero__title">
                Sign in to your <span>school portal</span>
              </h1>
              <p className="reg-hero__sub">
                First verify your school code, then sign in with username and
                password.
              </p>
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

        <section className="reg-visual-col" aria-hidden={false}>
          <LoginVisualPanel schoolCode={schoolCode} schoolName={schoolName} />
        </section>
      </div>
    </div>
  );
}

export function LoginFooterLinks() {
  return (
    <p className="reg-footer__line">
      New school?{" "}
      <Link href="/register">Register</Link>
      <span aria-hidden>·</span>
      <Link href="/join">Join with a code</Link>
      <span aria-hidden>·</span>
      <Link href="/platform/login">Platform admin</Link>
    </p>
  );
}
