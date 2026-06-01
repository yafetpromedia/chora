"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/billing", label: "Overview", exact: true },
  { href: "/admin/billing/invoices", label: "Invoices", exact: false },
  { href: "/admin/billing/usage", label: "Usage", exact: false },
  { href: "/admin/billing/plans", label: "Plans", exact: false },
] as const;

export function SchoolBillingNav() {
  const pathname = usePathname();

  return (
    <nav className="sbill-nav" aria-label="Billing sections">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`sbill-nav__link${active ? " sbill-nav__link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
