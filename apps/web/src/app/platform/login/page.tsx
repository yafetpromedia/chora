"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { platformLogin, persistPlatformSession } from "@/lib/platform-auth";

export default function PlatformLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Login failed");
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
              <span className="logo-mark reg-top__logo">C1</span>
              <span>CampusOne</span>
            </Link>
            <Link href="/login" className="reg-top__link">
              School sign in
            </Link>
          </header>

          <motion.main
            className="reg-main"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reg-hero">
              <p className="reg-hero__eyebrow">Operator console</p>
              <h1 className="reg-hero__title">
                Platform <span>admin</span>
              </h1>
              <p className="reg-hero__sub">
                Manage schools, trials, billing, and curriculum for CampusOne.
              </p>
            </div>

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
                      label="Email"
                      type="email"
                      icon="email"
                      variant="login"
                      autoComplete="email"
                      placeholder="you@campusone.app"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                  </div>
                  <div className="reg-form__full">
                    <AuthInput
                      id="platform-password"
                      label="Password"
                      type="password"
                      icon="password"
                      variant="login"
                      autoComplete="current-password"
                      placeholder="Your password"
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
                    label="Sign in"
                    loadingLabel="Signing in…"
                  />
                </div>
              </form>
            </div>

            <div className="reg-footer">
              <p className="reg-footer__line">
                Running a school?{" "}
                <Link href="/login">School sign in</Link>
                <span aria-hidden>·</span>
                <Link href="/register">Register</Link>
              </p>
            </div>
          </motion.main>
        </section>

        <section className="reg-visual-col" aria-hidden={false}>
          <div className="reg-visual reg-visual--photo">
            <div className="reg-visual__bg" aria-hidden>
              <img
                src={heroSrc}
                alt=""
                className="reg-visual__photo"
              />
              <div className="reg-visual__tint" />
            </div>
            <div className="reg-visual__content reg-visual__content--photo">
              <div className="reg-visual__copy">
                <p className="reg-visual__eyebrow">CampusOne platform</p>
                <h2 className="reg-visual__title">One console for every school</h2>
                <p className="reg-visual__body">
                  Provision workspaces, manage plans, and keep curriculum packs
                  current — without touching school portals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
