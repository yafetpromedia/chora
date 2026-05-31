"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, type SchoolInfo } from "@/lib/api";
import {
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  clearSessionStorage,
  type UserRole,
} from "@/lib/auth";
import {
  persistSchoolBrand,
  readSchoolBrand,
  SCHOOL_BRAND_UPDATED_EVENT,
} from "@/lib/school-brand";
import { SchoolBrandLockup } from "./school-brand-lockup";
import { DashIcon } from "./dash-icons";
import { isNavActive, navForRole, type NavItem } from "./nav-config";

type Props = {
  role: UserRole;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function DashboardShell({ role, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState("CampusOne");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [navRole, setNavRole] = useState<UserRole>(role);
  const [nav, setNav] = useState<NavItem[]>([]);
  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const stored = localStorage.getItem(AUTH_ROLE_KEY) as UserRole | null;
    const workspaceOk =
      stored === role ||
      (stored === "staff" && (role === "admin" || role === "staff")) ||
      (stored === "admin" && (role === "admin" || role === "staff"));
    if (!workspaceOk) {
      router.replace(`/${stored ?? "login"}`);
      return;
    }
    const effectiveRole = stored ?? role;
    setNavRole(effectiveRole);
    setNav(navForRole(effectiveRole));
    const brand = readSchoolBrand();
    setSchoolName(brand.name);
    setSchoolLogoUrl(brand.logoUrl);

    void apiFetch<{ school: SchoolInfo | null }>("/schools/me")
      .then((res) => {
        if (!res.school) return;
        persistSchoolBrand({
          name: res.school.name,
          logoUrl: res.school.logoUrl ?? null,
        });
        setSchoolName(res.school.name);
        setSchoolLogoUrl(res.school.logoUrl ?? null);
      })
      .catch(() => {
        /* keep cached brand */
      });

    setShellReady(true);
  }, [role, router]);

  useEffect(() => {
    function onBrandUpdate() {
      const brand = readSchoolBrand();
      setSchoolName(brand.name);
      setSchoolLogoUrl(brand.logoUrl);
    }
    window.addEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
    return () => window.removeEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
  }, []);

  function logout() {
    clearSessionStorage();
    router.push("/login");
  }

  const roleLabel =
    navRole === "admin"
      ? "Admin"
      : navRole === "staff"
        ? "Staff"
        : navRole === "teacher"
          ? "Teacher"
          : navRole === "parent"
            ? "Parent"
            : "Student";

  const isAdminWorkspace = role === "admin" || role === "staff";
  const pageTitle = title ?? (isAdminWorkspace ? "Dashboard" : `${roleLabel} dashboard`);
  const pageSub =
    subtitle ??
    (isAdminWorkspace ? `${schoolName} · School operations` : `${schoolName} · Campus portal`);

  return (
    <div className="dash-shell dash-shell--pro">
      <aside
        className={`dash-sidebar dash-sidebar--pro${mobileNav ? " dash-sidebar--open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="dash-sidebar-brand dash-sidebar-brand--pro dash-sidebar-brand--dual">
          <SchoolBrandLockup
            schoolName={schoolName}
            schoolLogoUrl={schoolLogoUrl}
            roleLabel={`${roleLabel} workspace`}
          />
        </div>

        <nav className="dash-nav dash-nav--pro">
          {!shellReady
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dash-nav-item dash-nav-item--pro dash-nav-item--skeleton" />
              ))
            : nav.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`dash-nav-item dash-nav-item--pro${active ? " dash-nav-item--active" : ""}`}
                    onClick={() => setMobileNav(false)}
                  >
                    <span className="dash-nav-icon-wrap" aria-hidden>
                      <DashIcon name={item.icon} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
        </nav>

        <div className="dash-sidebar-foot dash-sidebar-foot--pro">
          <p className="dash-sidebar-school-label">School</p>
          <p className="dash-sidebar-school">{schoolName}</p>
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
            <h1 className="dash-topbar-title">{pageTitle}</h1>
            <p className="dash-topbar-sub">{pageSub}</p>
          </div>
          <button type="button" onClick={logout} className="dash-logout dash-logout--pro">
            <DashIcon name="logout" className="dash-icon--sm" />
            <span>Log out</span>
          </button>
        </header>
        <div className="dash-content dash-content--pro">{children}</div>
      </div>
    </div>
  );
}
