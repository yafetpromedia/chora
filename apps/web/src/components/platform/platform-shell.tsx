"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import {
  PLATFORM_TOKEN_KEY,
  clearPlatformSession,
  type PlatformUser,
} from "@/lib/platform-auth";
import {
  SECTION_META,
  type PlatformSection,
} from "./platform-types";

const NAV: { id: PlatformSection; label: string; icon: DashIconName }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "schools", label: "Schools", icon: "students" },
  { id: "billing", label: "Billing", icon: "finance" },
  { id: "permissions", label: "Permissions", icon: "users" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "settings", label: "Settings", icon: "settings" },
];

type Props = {
  user: PlatformUser | null;
  section: PlatformSection;
  onSectionChange: (s: PlatformSection) => void;
  children: React.ReactNode;
};

export function PlatformShell({
  user,
  section,
  onSectionChange,
  children,
}: Props) {
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(PLATFORM_TOKEN_KEY)) {
      router.replace("/platform/login");
      return;
    }
    setReady(true);
  }, [router]);

  function logout() {
    clearPlatformSession();
    router.replace("/platform/login");
  }

  const meta = SECTION_META[section];
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "Platform operator";

  return (
    <div className="dash-shell dash-shell--pro plat-shell">
      <aside
        className={`dash-sidebar dash-sidebar--pro plat-sidebar${mobileNav ? " dash-sidebar--open" : ""}`}
        aria-label="Platform navigation"
      >
        <div className="dash-sidebar-brand dash-sidebar-brand--pro plat-sidebar-brand">
          <span className="logo-mark logo-mark--sidebar-pro plat-logo" aria-hidden>
            C1
          </span>
          <div>
            <span className="dash-sidebar-title">CampusOne</span>
            <span className="dash-sidebar-role">Platform console</span>
          </div>
        </div>

        <nav className="dash-nav dash-nav--pro">
          {!ready
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="dash-nav-item dash-nav-item--pro dash-nav-item--skeleton"
                />
              ))
            : NAV.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`dash-nav-item dash-nav-item--pro plat-nav-btn${active ? " dash-nav-item--active" : ""}`}
                    onClick={() => {
                      onSectionChange(item.id);
                      setMobileNav(false);
                    }}
                  >
                    <span className="dash-nav-icon-wrap" aria-hidden>
                      <DashIcon name={item.icon} />
                    </span>
                    {item.label}
                  </button>
                );
              })}
        </nav>

        <div className="dash-sidebar-foot dash-sidebar-foot--pro plat-sidebar-foot">
          <p className="dash-sidebar-school-label">Signed in</p>
          <p className="dash-sidebar-school">{displayName}</p>
          {user ? (
            <span className="plat-role-badge">{user.role}</span>
          ) : null}
        </div>
      </aside>

      {mobileNav ? (
        <button
          type="button"
          className="dash-sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <div className="dash-main dash-main--pro">
        <header className="dash-topbar dash-topbar--pro">
          <button
            type="button"
            className="dash-menu-btn dash-menu-btn--pro"
            aria-label="Open menu"
            onClick={() => setMobileNav(true)}
          >
            <DashIcon name="menu" />
          </button>
          <div className="dash-topbar-heading">
            <h1 className="dash-topbar-title">{meta.title}</h1>
            <p className="dash-topbar-sub">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="dash-logout dash-logout--pro"
          >
            <DashIcon name="logout" className="dash-icon--sm" />
            <span>Log out</span>
          </button>
        </header>
        <div className="dash-content dash-content--pro">{children}</div>
      </div>
    </div>
  );
}

export function PlatformFooterLinks() {
  return (
    <p className="plat-footer-links">
      <Link href="/" className="auth-page-footer-link">
        ← Public site
      </Link>
      <span aria-hidden> · </span>
      <Link href="/login" className="auth-page-footer-link">
        School login
      </Link>
      <span aria-hidden> · </span>
      <Link href="/platform/login" className="auth-page-footer-link">
        Platform login
      </Link>
    </p>
  );
}
