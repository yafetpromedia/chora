"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

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
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <div className="auth-scene">
      <header className="auth-topbar">
        <Link href="/" className="auth-logo no-underline">
          <BrandMark className="logo-mark" />
          <span>{BRAND_NAME}</span>
        </Link>
        <Link href="/" className="auth-topbar-link">
          {t("auth.home")}
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
            <p className="auth-eyebrow">
              {mode === "login" ? t("authShellUi.eyebrowLogin") : t("authShellUi.eyebrowRegister")}
            </p>
            <h1 className="auth-heading">{title}</h1>
            <p className="auth-subheading">{subtitle}</p>

            <div className="auth-card-body">{children}</div>

            <p className="auth-card-footer">{footer}</p>

            {showDemoHint ? (
              <div className="auth-demo-box" role="note">
                <p className="auth-demo-title">{t("authShellUi.demoTitle")}</p>
                <p className="auth-demo-text">
                  {t("authShellUi.demoLine1")}{" "}
                  <strong>BRIGHT1</strong> · <strong>admin</strong> / <strong>Passw0rd!</strong>
                  <br />
                  {t("authShellUi.demoSchoolCode")} <strong>BRIGHT1</strong>{" "}
                  {t("authShellUi.demoSignInHint")}
                </p>
              </div>
            ) : null}
          </motion.div>
        </main>
      </div>
    </div>
  );
}