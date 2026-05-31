"use client";

import Link from "next/link";

type AuthCardFooterLinksProps = {
  links: { href: string; label: string; muted?: boolean }[];
};

export function AuthCardFooterLinks({ links }: AuthCardFooterLinksProps) {
  return (
    <nav className="auth-login-links" aria-label="Related pages">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={link.muted ? "auth-login-links__muted" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
