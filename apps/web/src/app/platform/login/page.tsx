"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { platformLogin, persistPlatformSession } from "@/lib/platform-auth";
import { useLocale } from "@/components/i18n/locale-provider";

function PlatformLoginForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const invited = useMemo(() => searchParams.get("invited") === "1", [searchParams]);
  const reduce = useReducedMotion();
  const heroSrc = useLandingHeroImage();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await platformLogin(email.trim(), password);
      persistPlatformSession(res);
      router.push("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformLoginUi.errLogin"));
    } finally {
      setLoading(false);
    }
  }

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
              {t("platformLoginUi.schoolSignIn")}
            </Link>
          </header>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">{t("platformLoginUi.eyebrow")}</p>
              <h1 className="reg-hero__title">{t("platformLoginUi.title")}</h1>
              <p className="reg-hero__sub">
                {t("platformLoginUi.sub", { brand: BRAND_NAME })}
              </p>
            </div>

            {invited ? (
              <p className="auth-alert reg-error" role="status" style={{ borderColor: "#86efac", background: "#f0fdf4", color: "#166534" }}>
                {t("platformLoginUi.invitedOk")}
              </p>
            ) : null}

            {error ? (
              <p className="auth-alert auth-alert--error reg-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="reg-card">
              <form onSubmit={onSubmit} className="reg-form">
                <div className="reg-form__grid">
                  <div className="reg-form__full">
                    <AuthInput
                      id="platform-email"
                      label={t("platformLoginUi.email")}
                      type="email"
                      icon="email"
                      variant="login"
                      autoComplete="email"
                      placeholder="you@chora.app"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                  </div>
                  <div className="reg-form__full">
                    <AuthInput
                      id="platform-password"
                      label={t("platformLoginUi.password")}
                      type="password"
                      icon="password"
                      variant="login"
                      autoComplete="current-password"
                      placeholder={t("platformLoginUi.passwordPh")}
                      value={password}
                      onChange={setPassword}
                      required
                    />
                  </div>
                </div>

                <div className="reg-form__actions reg-form__actions--single">
                  <AuthSubmitButton
                    variant="page"
                    loading={loading}
                    label={t("platformLoginUi.signIn")}
                    loadingLabel={t("platformLoginUi.signingIn")}
                  />
                </div>
              </form>
            </div>

            <div className="reg-footer">
              <p className="reg-footer__line">
                {t("platformLoginUi.footerSchool")}{" "}
                <Link href="/login">{t("platformLoginUi.schoolSignIn")}</Link>
                <span aria-hidden>·</span>
                <Link href="/register">{t("platformLoginUi.register")}</Link>
              </p>
            </div>
          </motion.main>
        </section>

        <section className="reg-visual-col" aria-hidden={false}>
          <div className="reg-visual reg-visual--photo">
            <div className="reg-visual__bg" aria-hidden>
              {heroSrc ? (
                <img src={heroSrc} alt="" className="reg-visual__photo" />
              ) : null}
              <div className="reg-visual__tint" />
            </div>
            <div className="reg-visual__content reg-visual__content--photo">
              <div className="reg-visual__copy">
                <p className="reg-visual__eyebrow">
                  {t("platformLoginUi.visualEyebrow", { brand: BRAND_NAME })}
                </p>
                <h2 className="reg-visual__title">{t("platformLoginUi.visualTitle")}</h2>
                <p className="reg-visual__body">{t("platformLoginUi.visualBody")}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <Suspense fallback={<div className="reg-scene" aria-busy="true" />}>
      <PlatformLoginForm />
    </Suspense>
  );
}
