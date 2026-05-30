"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { GoogleOAuthProviderWrapper } from "@/components/auth/google-oauth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { login, loginWithGoogle } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function completeAuth(action: () => ReturnType<typeof login>) {
    setLoading(true);
    setError("");
    try {
      const response = await action();
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
    void completeAuth(() => login(email.trim(), password));
  }

  return (
    <GoogleOAuthProviderWrapper>
      <AuthShell
        mode="login"
        title="Sign in"
        subtitle="Log in to your school workspace."
        showDemoHint
        footer={
          <>
            <Link href="/register" className="auth-link">
              Register a school
            </Link>
            {" · "}
            <Link href="/join" className="auth-link">
              Join with code
            </Link>
          </>
        }
      >
        <GoogleSignInButton
          onCredential={(credential) => completeAuth(() => loginWithGoogle(credential))}
          disabled={loading}
        />

        <div className="auth-separator">
          <span>or</span>
        </div>

        <form onSubmit={onSubmit} className="auth-form-stack">
          <AuthInput
            id="login-email"
            label="Email"
            type="email"
            icon="email"
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
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={setPassword}
            required
          />
          <AuthSubmitButton loading={loading} loadingLabel="Signing in…" label="Sign in" />
        </form>

        {error ? (
          <p className="auth-alert auth-alert--error" role="alert">
            {error}
          </p>
        ) : null}
      </AuthShell>
    </GoogleOAuthProviderWrapper>
  );
}
