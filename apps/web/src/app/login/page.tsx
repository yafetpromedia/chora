"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { LoginShell } from "@/components/auth/login-shell";
import { login, validateSchoolCode } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";
import { persistSchoolBrand } from "@/lib/school-brand";

const REMEMBER_SCHOOL_KEY = "campusone_remember_school";
const REMEMBER_USER_KEY = "campusone_remember_username";

type LoginStep = "school" | "credentials";

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("school");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedSchool = localStorage.getItem(REMEMBER_SCHOOL_KEY);
        const savedUser = localStorage.getItem(REMEMBER_USER_KEY);
        if (savedSchool) setSchoolCode(savedSchool);
        if (savedUser) {
          setUsername(savedUser);
          setRemember(true);
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  async function onValidateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = schoolCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter your school code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const school = await validateSchoolCode(code);
      setSchoolCode(school.joinCode);
      setSchoolName(school.name);
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
    if (trimmedUser.includes("platform@") || trimmedUser.endsWith("@campusone.local") || trimmedUser.endsWith("@chora.local")) {
      router.push("/platform/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await login(trimmedUser, password, schoolCode);
      if (remember) {
        localStorage.setItem(REMEMBER_SCHOOL_KEY, schoolCode.trim().toUpperCase());
        localStorage.setItem(REMEMBER_USER_KEY, trimmedUser);
      } else {
        localStorage.removeItem(REMEMBER_SCHOOL_KEY);
        localStorage.removeItem(REMEMBER_USER_KEY);
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
    setStep("school");
    setError("");
    setPassword("");
  }

  return (
    <LoginShell error={error || undefined}>
      {step === "school" ? (
        <form onSubmit={(e) => void onValidateSchool(e)} className="reg-form login-form">
          <div className="reg-form__step">
            <h2 className="reg-form__title">Find your school</h2>
            <p className="login-form__lead">
              Enter your school code first. We&apos;ll verify it before you sign in.
            </p>
            <div className="reg-form__grid reg-form__grid--single login-form__fields">
              <AuthInput
                id="login-school"
                label="School code"
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
              {loading ? "Checking…" : "Continue →"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => void onSignIn(e)} className="reg-form login-form">
          <div className="reg-form__step">
            <div className="login-form__school-bar">
              <div>
                <p className="login-form__school-label">School verified</p>
                <p className="login-form__school-name">{schoolName}</p>
                <p className="login-form__school-code">Code: {schoolCode}</p>
              </div>
              <button
                type="button"
                className="login-form__change-school"
                onClick={backToSchoolStep}
              >
                Change
              </button>
            </div>

            <h2 className="reg-form__title">Sign in</h2>
            <div className="reg-form__grid reg-form__grid--single login-form__fields">
              <AuthInput
                id="login-username"
                label="Username"
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

            <div className="login-form__row">
              <label className="login-form__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link href="/register" className="login-form__link">
                Create account
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
              ← Back
            </button>
            <button type="submit" className="reg-form__next" disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </div>
        </form>
      )}
    </LoginShell>
  );
}
