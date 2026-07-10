"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";

const LINKS: { href: string; label: string; exact: boolean; icon: DashIconName }[] = [
  { href: "/admin/billing", label: "Overview", exact: true, icon: "overview" },
  { href: "/admin/billing/invoices", label: "Invoices", exact: false, icon: "fees" },
  { href: "/admin/billing/usage", label: "Usage", exact: false, icon: "chart" },
  { href: "/admin/billing/plans", label: "Plans", exact: false, icon: "finance" },
];

export function SchoolBillingNav() {
  const pathname = usePathname();

  return (
    <nav className="sb-v2__tabs" aria-label="Billing sections">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`sb-v2__tab${active ? " sb-v2__tab--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <DashIcon name={link.icon} className="dash-icon--sm" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
