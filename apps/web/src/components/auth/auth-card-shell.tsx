"use client";

import { AuthPageShell } from "@/components/auth/auth-page-shell";

type AuthCardShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string;
  hint?: string;
  topLinkHref?: string;
  topLinkLabel?: string;
  wide?: boolean;
};

export function AuthCardShell({
  title,
  subtitle,
  children,
  footer,
  error,
  hint,
  topLinkHref = "/login",
  topLinkLabel = "Sign in",
  wide = false,
}: AuthCardShellProps) {
  return (
    <AuthPageShell
      variant="login"
      wide={wide}
      title={title}
      subtitle={subtitle}
      topLinkHref={topLinkHref}
      topLinkLabel={topLinkLabel}
      error={error}
      hint={hint}
      footer={footer}
    >
      {children}
    </AuthPageShell>
  );
}
