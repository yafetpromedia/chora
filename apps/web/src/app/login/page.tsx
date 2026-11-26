"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { LoginShell } from "@/components/auth/login-shell";
import { useLocale } from "@/components/i18n/locale-provider";
import { login, validateSchoolCode } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import {
  AUTH_SCHOOL_JOIN_CODE_KEY,
  AUTH_SCHOOL_NAME_KEY,
  clearRememberedSchool,
  getRolePath,
} from "@/lib/auth";
import { persistSchoolBrand, readSchoolBrand } from "@/lib/school-brand";

const REMEMBER_USER_KEY = "campusone_remember_username";

type LoginStep = "school" | "credentials";

export default function LoginPage() {
  const { t } = useLocale();
  const [step, setStep] = useState<LoginStep>("school");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoringSchool, setRestoringSchool] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function restoreLastSchool() {
      try {
        const savedUser = localStorage.getItem(REMEMBER_USER_KEY);
        if (savedUser) {
          setUsername(savedUser);
          setRemember(true);
        }

        const savedCode =
          localStorage.getItem(AUTH_SCHOOL_JOIN_CODE_KEY)?.trim().toUpperCase() ??
          "";
        if (savedCode.length < 4) {
          if (!cancelled) setRestoringSchool(false);
          return;
        }

        const cachedName = localStorage.getItem(AUTH_SCHOOL_NAME_KEY)?.trim() ?? "";
        const brand = readSchoolBrand();
        if (brand) {
          persistSchoolBrand(brand);
        }

        try {
          const school = await validateSchoolCode(savedCode);
          if (cancelled) return;
          setSchoolCode(school.joinCode);
          setSchoolName(school.name);
          localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, school.joinCode);
          localStorage.setItem(AUTH_SCHOOL_NAME_KEY, school.name);
          persistSchoolBrand({
            name: school.name,
            logoUrl: school.logoUrl ?? null,
            primaryColor: school.primaryColor ?? null,
            accentColor: school.accentColor ?? null,
            accentDeep: school.accentDeep ?? null,
          });
          setStep("credentials");
        } catch {
          clearRememberedSchool();
          if (!cancelled) {
            setSchoolCode(savedCode);
            if (cachedName) setSchoolName(cachedName);
          }
        }
      } catch {
        /* ignore storage errors */
      } finally {
        if (!cancelled) setRestoringSchool(false);
      }
    }

    void restoreLastSchool();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onValidateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = schoolCode.trim().toUpperCase();
    if (code.length < 4) {
      setError(t("auth.enterSchoolCode"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const school = await validateSchoolCode(code);
      setSchoolCode(school.joinCode);
      setSchoolName(school.name);
      localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, school.joinCode);
      localStorage.setItem(AUTH_SCHOOL_NAME_KEY, school.name);
      persistSchoolBrand({
        name: school.name,
        logoUrl: school.logoUrl ?? null,
        primaryColor: school.primaryColor ?? null,
        accentColor: school.accentColor ?? null,
        accentDeep: school.accentDeep ?? null,
      });
      setStep("credentials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid school code");
    } finally {
      setLoading(false);
    }
  }

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUser = username.trim();
    setLoading(true);
    setError("");
    try {
      const response = await login(trimmedUser, password, schoolCode);
      if (remember) {
        localStorage.setItem(REMEMBER_USER_KEY, trimmedUser);
      } else {
        localStorage.removeItem(REMEMBER_USER_KEY);
      }
      if (response.school?.joinCode) {
        localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, response.school.joinCode);
        localStorage.setItem(AUTH_SCHOOL_NAME_KEY, response.school.name);
      } else {
        localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, schoolCode.trim().toUpperCase());
        if (schoolName) localStorage.setItem(AUTH_SCHOOL_NAME_KEY, schoolName);
      }
      persistAuthSession(response);
      router.push(getRolePath(response.user.role));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function backToSchoolStep() {
    clearRememberedSchool();
    setStep("school");
    setSchoolName("");
    setError("");
    setPassword("");
  }

  if (restoringSchool) {
    return (
      <LoginShell>
        <div className="reg-form login-form">
          <p className="login-form__lead">{t("auth.checkingSchool")}</p>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell error={error || undefined}>
      {step === "school" ? (
        <form onSubmit={(e) => void onValidateSchool(e)} className="reg-form login-form">
          <div className="reg-form__step">
            <h2 className="reg-form__title">{t("auth.findSchool")}</h2>
            <p className="login-form__lead">{t("auth.findSchoolLead")}</p>
            <div className="reg-form__grid reg-form__grid--single login-form__fields">
              <AuthInput
                id="login-school"
                label={t("auth.schoolCode")}
                type="text"
                icon="none"
                variant="login"
                autoComplete="organization"
                placeholder="e.g. WWHE84"
                value={schoolCode}
                onChange={(v) => setSchoolCode(v.toUpperCase())}
                required
              />
            </div>
          </div>

          <div className="reg-form__actions login-form__actions">
            <span />
            <button type="submit" className="reg-form__next" disabled={loading}>
              {loading ? t("auth.checking") : t("auth.continueArrow")}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => void onSignIn(e)} className="reg-form login-form">
          <div className="reg-form__step">
            <div className="login-form__school-bar">
              <div>
                <p className="login-form__school-label">{t("auth.schoolVerified")}</p>
                <p className="login-form__school-name">{schoolName}</p>
                <p className="login-form__school-code">
                  {t("auth.codeLabel", { code: schoolCode })}
                </p>
              </div>
              <button
                type="button"
                className="login-form__change-school"
                onClick={backToSchoolStep}
              >
                {t("auth.change")}
              </button>
            </div>

            <h2 className="reg-form__title">{t("auth.loginTitle")}</h2>
            <div className="reg-form__grid reg-form__grid--single login-form__fields">
              <AuthInput
                id="login-username"
                label={t("auth.username")}
                type="text"
                icon="user"
                variant="login"
                autoComplete="username"
                placeholder="admin, teacher, or STU-…"
                value={username}
                onChange={setUsername}
                required
              />
              <AuthInput
                id="login-password"
                label={t("auth.password")}
                type="password"
                icon="password"
                variant="login"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                required
              />
            </div>

            <div className="login-form__row">
              <label className="login-form__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>{t("auth.rememberUsername")}</span>
              </label>
              <Link href="/register" className="login-form__link">
                {t("auth.createAccount")}
              </Link>
            </div>
          </div>

          <div className="reg-form__actions login-form__actions">
            <button
              type="button"
              className="reg-form__back"
              onClick={backToSchoolStep}
              disabled={loading}
            >
              {t("auth.back")}
            </button>
            <button type="submit" className="reg-form__next" disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signInArrow")}
            </button>
          </div>
        </form>
      )}
    </LoginShell>
  );
}
