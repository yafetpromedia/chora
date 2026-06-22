"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { LoginShell } from "@/components/auth/login-shell";
import { login } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

const REMEMBER_SCHOOL_KEY = "campusone_remember_school";
const REMEMBER_USER_KEY = "campusone_remember_username";

export default function LoginPage() {
  const [schoolCode, setSchoolCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
  }, []);

  async function completeAuth(action: () => ReturnType<typeof login>) {
    setLoading(true);
    setError("");
    try {
      const response = await action();
      if (remember) {
        localStorage.setItem(REMEMBER_SCHOOL_KEY, schoolCode.trim().toUpperCase());
        localStorage.setItem(REMEMBER_USER_KEY, username.trim());
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUser = username.trim();
    if (trimmedUser.includes("platform@") || trimmedUser.endsWith("@campusone.local")) {
      router.push("/platform/login");
      return;
    }
    void completeAuth(() =>
      login(trimmedUser, password, schoolCode.trim() || undefined),
    );
  }

  return (
    <LoginShell error={error || undefined}>
      <form onSubmit={onSubmit} className="auth-page-form">
        <AuthInput
          id="login-school"
          label="School code"
          type="text"
          icon="none"
          variant="login"
          autoComplete="organization"
          placeholder="e.g. BRIGHT1"
          value={schoolCode}
          onChange={(v) => setSchoolCode(v.toUpperCase())}
        />
        <AuthInput
          id="login-username"
          label="Username"
          type="text"
          icon="user"
          variant="login"
          autoComplete="username"
          placeholder="admin or STU-…"
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
    </LoginShell>
  );
}
