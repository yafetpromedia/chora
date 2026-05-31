"use client";

import Link from "next/link";
import { useState } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import type { PlatformUser } from "@/lib/platform-auth";
import { PlatformFooterLinks } from "./platform-shell";

type Props = {
  user: PlatformUser | null;
  onOpenProfile?: () => void;
};

const SHORTCUTS: {
  href: string;
  label: string;
  desc: string;
  icon: DashIconName;
  external?: boolean;
}[] = [
  {
    href: "/",
    label: "Public site",
    desc: "Marketing & school registration",
    icon: "overview",
  },
  {
    href: "/login",
    label: "School login",
    desc: "Staff, teachers, families",
    icon: "students",
  },
  {
    href: "/register",
    label: "Register school",
    desc: "Self-serve tenant signup",
    icon: "plus",
  },
  {
    href: "/platform/login",
    label: "Platform login",
    desc: "This operator console",
    icon: "settings",
  },
];

function getApiUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  }
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    localStorage.getItem("campusone_api_hint") ||
    "http://localhost:3001"
  );
}

export function PlatformSettings({ user, onOpenProfile }: Props) {
  const [copied, setCopied] = useState(false);
  const apiUrl = getApiUrl();

  async function copyApiUrl() {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="plat-section plat-settings">
      <header className="plat-section-hero plat-section-hero--settings">
        <div>
          <p className="plat-section-hero__eyebrow">Configuration</p>
          <h2 className="plat-section-hero__title">Settings & operations</h2>
          <p className="plat-section-hero__sub">
            Environment links, shortcuts, and pilot operations for the CampusOne platform team.
          </p>
        </div>
      </header>

      <div className="plat-settings-grid">
        <section className="plat-settings-card plat-settings-card--profile">
          <div className="plat-settings-card__icon">
            <DashIcon name="profile" />
          </div>
          <div className="plat-settings-card__body">
            <h3>Your account</h3>
            {user ? (
              <p>
                {user.firstName} {user.lastName} · <span className="plat-role-badge">{user.role}</span>
              </p>
            ) : (
              <p>Not signed in</p>
            )}
            {onOpenProfile ? (
              <button type="button" className="plat-btn plat-btn--primary plat-btn--sm" onClick={onOpenProfile}>
                Open profile
              </button>
            ) : (
              <Link href="/platform" className="plat-settings-card__link">
                Use Profile in sidebar →
              </Link>
            )}
          </div>
        </section>

        <section className="plat-settings-card plat-settings-card--env">
          <div className="plat-settings-card__icon plat-settings-card__icon--muted">
            <DashIcon name="settings" />
          </div>
          <div className="plat-settings-card__body">
            <h3>API environment</h3>
            <p className="plat-settings-env-url">
              <code>{apiUrl}</code>
            </p>
            <button
              type="button"
              className={`plat-btn plat-btn--ghost plat-btn--sm${copied ? " plat-btn--done" : ""}`}
              onClick={() => void copyApiUrl()}
            >
              {copied ? "Copied" : "Copy URL"}
            </button>
            <p className="plat-settings-card__hint">
              Set via <code>NEXT_PUBLIC_API_URL</code> in <code>apps/web/.env.local</code>
            </p>
          </div>
        </section>

        <section className="plat-settings-card plat-settings-card--status">
          <div className="plat-settings-card__icon plat-settings-card__icon--green">
            <span className="plat-status-dot" aria-hidden />
          </div>
          <div className="plat-settings-card__body">
            <h3>Console status</h3>
            <p>
              <strong className="plat-status-text--ok">Operational</strong> — Web on :3000, API on
              :3001 (dev)
            </p>
            <p className="plat-settings-card__hint">
              Payment provider keys and DB backups are managed outside this UI during pilot.
            </p>
          </div>
        </section>

        <section className="plat-settings-card plat-settings-card--security">
          <div className="plat-settings-card__icon plat-settings-card__icon--amber">
            <DashIcon name="alert" />
          </div>
          <div className="plat-settings-card__body">
            <h3>Security</h3>
            <ul className="plat-settings-list">
              <li>Platform JWT separate from school tokens</li>
              <li>Role checks on every platform API route</li>
              <li>School admins cannot self-edit permissions</li>
            </ul>
          </div>
        </section>
      </div>

      <section className="plat-panel">
        <h3 className="plat-panel__title">Quick links</h3>
        <div className="plat-shortcuts-grid">
          {SHORTCUTS.map((item) => (
            <Link key={item.href} href={item.href} className="plat-shortcut-card">
              <span className="plat-shortcut-card__icon" aria-hidden>
                <DashIcon name={item.icon} />
              </span>
              <span className="plat-shortcut-card__label">{item.label}</span>
              <span className="plat-shortcut-card__desc">{item.desc}</span>
              <DashIcon name="arrow" className="dash-icon--xs plat-shortcut-card__arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="plat-panel plat-panel--muted">
        <h3 className="plat-panel__title">Pilot checklist</h3>
        <ul className="plat-checklist">
          <li className="plat-checklist__done">
            <DashIcon name="attendance" className="dash-icon--xs" />
            Multi-tenant schools & platform console
          </li>
          <li className="plat-checklist__done">
            <DashIcon name="attendance" className="dash-icon--xs" />
            Billing visibility & trial tracking
          </li>
          <li>
            <span className="plat-checklist__pending" />
            Payment gateway integration (Chapa / Telebirr)
          </li>
          <li>
            <span className="plat-checklist__pending" />
            Automated plan upgrades & invoices
          </li>
        </ul>
      </section>

      <PlatformFooterLinks />
    </div>
  );
}
