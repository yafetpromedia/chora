"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";

type AuthShellProps = {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  showDemoHint?: boolean;
};

export function AuthShell({
  mode,
  title,
  subtitle,
  children,
  footer,
  showDemoHint = false,
}: AuthShellProps) {
  const reduce = useReducedMotion();

  return (
    <div className="auth-scene">
      <header className="auth-topbar">
        <Link href="/" className="auth-logo no-underline">
          <span className="logo-mark">C1</span>
          <span>CampusOne</span>
        </Link>
        <Link href="/" className="auth-topbar-link">
          Home
        </Link>
      </header>

      <div className="auth-layout">
        <aside className="auth-visual-col" aria-hidden={false}>
          <AuthVisualPanel />
        </aside>

        <main className="auth-main">
          <motion.div
            className="auth-card"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="auth-eyebrow">{mode === "login" ? "Sign in" : "Create account"}</p>
            <h1 className="auth-heading">{title}</h1>
            <p className="auth-subheading">{subtitle}</p>

            <div className="auth-card-body">{children}</div>

            <p className="auth-card-footer">{footer}</p>

            {showDemoHint ? (
              <div className="auth-demo-box" role="note">
                <p className="auth-demo-title">Demo workspace</p>
                <p className="auth-demo-text">
                  Demo: <strong>BRIGHT1</strong> · <strong>admin</strong> / <strong>Passw0rd!</strong>
                  <br />
                  Join code: <strong>BRIGHT1</strong> (for /join)
                </p>
              </div>
            ) : null}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
