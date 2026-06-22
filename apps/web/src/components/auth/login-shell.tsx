"use client";

import Link from "next/link";
import { AuthCardShell } from "@/components/auth/auth-card-shell";

type LoginShellProps = {
  children: React.ReactNode;
  error?: string;
};

export function LoginShell({ children, error }: LoginShellProps) {
  return (
    <AuthCardShell
      title="Welcome back"
      subtitle="Sign in with your school workspace email."
      topLinkHref="/"
      topLinkLabel="Home"
      error={error}
      hint="Demo: BRIGHT1 · admin · Passw0rd!"
      footer={
        <nav className="auth-login-links" aria-label="Other sign-in options">
          <Link href="/register">Register your school</Link>
          <Link href="/join">Join with a code</Link>
        </nav>
      }
    >
      {children}
    </AuthCardShell>
  );
}
