"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { GoogleOAuthProviderWrapper } from "@/components/auth/google-oauth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginShell } from "@/components/auth/login-shell";
import { login, loginWithGoogle } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

const REMEMBER_KEY = "campusone_remember_email";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function completeAuth(action: () => ReturnType<typeof login>) {
    setLoading(true);
    setError("");
    try {
      const response = await action();
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      persistAuthSession(response);
      router.push(getRolePath(response.user.role));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (trimmed.includes("platform@") || trimmed.endsWith("@campusone.local")) {
      router.push("/platform/login");
      return;
    }
    void completeAuth(() => login(trimmed, password));
  }

  return (
    <GoogleOAuthProviderWrapper>
      <LoginShell error={error || undefined}>
        <form onSubmit={onSubmit} className="auth-page-form">
          <AuthInput
            id="login-email"
            label="Email"
            type="email"
            icon="email"
            variant="login"
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={setEmail}
            required
          />
          <AuthInput
            id="login-password"
            label="Password"
            type="password"
            icon="password"
            variant="login"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
          />

          <div className="auth-page-form-row">
            <label className="auth-page-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link href="/register" className="auth-page-forgot">
              Create account
            </Link>
          </div>

          <button type="submit" className="auth-page-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="auth-page-separator">
          <span>or</span>
        </div>

        <GoogleSignInButton
          variant="login"
          onCredential={(credential) => completeAuth(() => loginWithGoogle(credential))}
          disabled={loading}
        />
      </LoginShell>
    </GoogleOAuthProviderWrapper>
  );
}
