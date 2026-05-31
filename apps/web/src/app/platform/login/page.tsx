"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCardFooterLinks } from "@/components/auth/auth-card-footer-links";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { platformLogin, persistPlatformSession } from "@/lib/platform-auth";

export default function PlatformLoginPage() {
  const [email, setEmail] = useState("platform@campusone.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <AuthCardShell
      title="Platform admin"
      subtitle="Internal portal — manage schools, trials, and billing."
      topLinkHref="/"
      topLinkLabel="Home"
      error={error || undefined}
      hint="Demo: platform@campusone.local · Passw0rd!"
      footer={
        <AuthCardFooterLinks
          links={[
            { href: "/login", label: "School sign in" },
            { href: "/register", label: "Register your school" },
            { href: "/join", label: "Join with a code", muted: true },
          ]}
        />
      }
    >
      <form onSubmit={onSubmit} className="auth-page-form">
        <AuthInput
          id="platform-email"
          label="Email"
          type="email"
          icon="email"
          variant="login"
          autoComplete="email"
          placeholder="platform@campusone.local"
          value={email}
          onChange={setEmail}
          required
        />
        <AuthInput
          id="platform-password"
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
        <AuthSubmitButton
          variant="page"
          loading={loading}
          label="Sign in"
          loadingLabel="Signing in…"
        />
      </form>
    </AuthCardShell>
  );
}
