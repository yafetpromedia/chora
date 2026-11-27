"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import {
  acceptPlatformInvite,
  getPlatformInvitePreview,
  type PlatformInvitePreview,
} from "@/lib/platform-access";
import { useLocale } from "@/components/i18n/locale-provider";

export default function PlatformInviteAcceptPage() {
  const { t } = useLocale();
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();
  const reduce = useReducedMotion();
  const heroSrc = useLandingHeroImage();

  const [preview, setPreview] = useState<PlatformInvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) {
        setError(t("platformInviteAcceptUi.missingToken"));
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getPlatformInvitePreview(token);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("platformInviteAcceptUi.invalidInvite"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setError(t("platformInviteAcceptUi.passwordMin"));
      return;
    }
    if (password !== confirm) {
      setError(t("platformInviteAcceptUi.passwordsMismatch"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await acceptPlatformInvite(token, password);
      router.push("/platform/login?invited=1");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("platformInviteAcceptUi.setPasswordFailed"),
      );
    } finally {
      setSubmitting(false);
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
            <Link href="/platform/login" className="reg-top__link">
              {t("platformInviteAcceptUi.platformSignIn")}
            </Link>
          </header>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">{t("platformInviteAcceptUi.eyebrow")}</p>
              <h1 className="reg-hero__title">
                {t("platformInviteAcceptUi.titleBefore")}{" "}
                <span>{t("platformInviteAcceptUi.titleAccent")}</span>
              </h1>
              <p className="reg-hero__sub">
                {preview
                  ? t("platformInviteAcceptUi.welcomeRole", {
                      firstName: preview.firstName,
                      role: preview.role.toLowerCase(),
                    })
                  : t("platformInviteAcceptUi.acceptDefault", { brand: BRAND_NAME })}
              </p>
            </div>

            {error ? (
              <p className="auth-alert auth-alert--error reg-error" role="alert">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="reg-hero__sub">{t("platformInviteAcceptUi.checking")}</p>
            ) : null}

            {!loading && preview ? (
              <div className="reg-card">
                <p className="reg-hero__sub" style={{ marginBottom: "1rem" }}>
                  {preview.email} · {t("platformInviteAcceptUi.expires")}{" "}
                  {new Date(preview.expiresAt).toLocaleString()}
                </p>
                <form onSubmit={(e) => void onSubmit(e)} className="reg-form">
                  <div className="reg-form__grid">
                    <div className="reg-form__full">
                      <AuthInput
                        id="invite-password"
                        label={t("platformInviteAcceptUi.newPassword")}
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        icon="password"
                        variant="login"
                      />
                    </div>
                    <div className="reg-form__full">
                      <AuthInput
                        id="invite-password-confirm"
                        label={t("platformInviteAcceptUi.confirmPassword")}
                        type="password"
                        value={confirm}
                        onChange={setConfirm}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        icon="password"
                        variant="login"
                      />
                    </div>
                  </div>
                  <div className="reg-form__actions reg-form__actions--single">
                    <AuthSubmitButton
                      variant="page"
                      loading={submitting}
                      label={t("platformInviteAcceptUi.activate")}
                      loadingLabel={t("platformInviteAcceptUi.saving")}
                    />
                  </div>
                </form>
              </div>
            ) : null}
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
                  {t("platformInviteAcceptUi.platformEyebrow", { brand: BRAND_NAME })}
                </p>
                <h2 className="reg-visual__title">{t("platformInviteAcceptUi.visualTitle")}</h2>
                <p className="reg-visual__body">{t("platformInviteAcceptUi.visualBody")}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
