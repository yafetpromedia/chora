"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import {
  PLATFORM_TOKEN_KEY,
  clearPlatformSession,
  type PlatformUser,
} from "@/lib/platform-auth";
import { canAccessPlatformSection } from "@/lib/platform-access";
import { AiChatWidget } from "@/components/ai/ai-chat-widget";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { PlatformNotifyBell } from "./platform-notify-bell";
import type { PlatformSection } from "./platform-types";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const NAV_LABEL_KEYS: Record<PlatformSection, MessageKey> = {
  overview: "platformChromeUi.navOverview",
  schools: "platformChromeUi.navTenants",
  curriculum: "platformChromeUi.navPackages",
  subjects: "platformChromeUi.navSubjects",
  library: "platformChromeUi.navLibrary",
  messages: "platformChromeUi.navMessages",
  support: "platformChromeUi.navSupport",
  structures: "platformChromeUi.navStructures",
  provisioning: "platformChromeUi.navProvisioning",
  assessments: "platformChromeUi.navAssessments",
  billing: "platformChromeUi.navBilling",
  invoices: "platformChromeUi.navInvoices",
  usage: "platformChromeUi.navUsage",
  plans: "platformChromeUi.navPlans",
  coupons: "platformChromeUi.navCoupons",
  permissions: "platformChromeUi.navPermissions",
  email: "platformChromeUi.navEmail",
  profile: "platformChromeUi.navProfile",
  settings: "platformChromeUi.navSettings",
};

const SECTION_TITLE_KEYS: Record<PlatformSection, MessageKey> = {
  overview: "platformChromeUi.sectionOverviewTitle",
  schools: "platformChromeUi.sectionSchoolsTitle",
  curriculum: "platformChromeUi.sectionCurriculumTitle",
  subjects: "platformChromeUi.sectionSubjectsTitle",
  library: "platformChromeUi.sectionLibraryTitle",
  messages: "platformChromeUi.sectionMessagesTitle",
  support: "platformChromeUi.sectionSupportTitle",
  structures: "platformChromeUi.sectionStructuresTitle",
  provisioning: "platformChromeUi.sectionProvisioningTitle",
  assessments: "platformChromeUi.sectionAssessmentsTitle",
  billing: "platformChromeUi.sectionBillingTitle",
  invoices: "platformChromeUi.sectionInvoicesTitle",
  usage: "platformChromeUi.sectionUsageTitle",
  plans: "platformChromeUi.sectionPlansTitle",
  coupons: "platformChromeUi.sectionCouponsTitle",
  permissions: "platformChromeUi.sectionPermissionsTitle",
  profile: "platformChromeUi.sectionProfileTitle",
  settings: "platformChromeUi.sectionSettingsTitle",
  email: "platformChromeUi.sectionEmailTitle",
};

const SECTION_SUB_KEYS: Record<PlatformSection, MessageKey> = {
  overview: "platformChromeUi.sectionOverviewSub",
  schools: "platformChromeUi.sectionSchoolsSub",
  curriculum: "platformChromeUi.sectionCurriculumSub",
  subjects: "platformChromeUi.sectionSubjectsSub",
  library: "platformChromeUi.sectionLibrarySub",
  messages: "platformChromeUi.sectionMessagesSub",
  support: "platformChromeUi.sectionSupportSub",
  structures: "platformChromeUi.sectionStructuresSub",
  provisioning: "platformChromeUi.sectionProvisioningSub",
  assessments: "platformChromeUi.sectionAssessmentsSub",
  billing: "platformChromeUi.sectionBillingSub",
  invoices: "platformChromeUi.sectionInvoicesSub",
  usage: "platformChromeUi.sectionUsageSub",
  plans: "platformChromeUi.sectionPlansSub",
  coupons: "platformChromeUi.sectionCouponsSub",
  permissions: "platformChromeUi.sectionPermissionsSub",
  profile: "platformChromeUi.sectionProfileSub",
  settings: "platformChromeUi.sectionSettingsSub",
  email: "platformChromeUi.sectionEmailSub",
};

const NAV: { id: PlatformSection; label: string; icon: DashIconName }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "schools", label: "Tenants", icon: "students" },
  { id: "curriculum", label: "Packages", icon: "results" },
  { id: "subjects", label: "Subjects", icon: "library" },
  { id: "library", label: "eLibrary", icon: "library" },
  { id: "messages", label: "Messages", icon: "announcements" },
  { id: "support", label: "Support", icon: "support" },
  { id: "structures", label: "Structures", icon: "calendar" },
  { id: "assessments", label: "Assessments", icon: "results" },
  { id: "provisioning", label: "Provisioning", icon: "settings" },
  { id: "billing", label: "Billing", icon: "finance" },
  { id: "invoices", label: "Invoices", icon: "fees" },
  { id: "usage", label: "Usage", icon: "students" },
  { id: "plans", label: "Plans", icon: "settings" },
  { id: "coupons", label: "Coupons", icon: "fees" },
  { id: "permissions", label: "Permissions", icon: "users" },
  { id: "email", label: "Email", icon: "announcements" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const PLATFORM_MOBILE_TABS: PlatformSection[] = [
  "overview",
  "schools",
  "support",
  "billing",
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
  const { t } = useLocale();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const ready = hydrated && Boolean(localStorage.getItem(PLATFORM_TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(PLATFORM_TOKEN_KEY)) {
      router.replace("/platform/login");
    }
  }, [router]);

  function logout() {
    clearPlatformSession();
    router.replace("/platform/login");
  }

  const sectionTitle = t(SECTION_TITLE_KEYS[section]);
  const sectionSubtitle = t(SECTION_SUB_KEYS[section]);
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : t("platformChromeUi.operatorFallback");
  const visibleNav = NAV.filter((item) => canAccessPlatformSection(user, item.id));
  const mobileTabs = PLATFORM_MOBILE_TABS.flatMap((id) => {
    const item = visibleNav.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  const moreActive = !PLATFORM_MOBILE_TABS.includes(section);

  useEffect(() => {
    if (!ready || !user) return;
    if (canAccessPlatformSection(user, section)) return;
    onSectionChange(canAccessPlatformSection(user, "overview") ? "overview" : "profile");
  }, [ready, user, section, onSectionChange]);

  return (
    <div
      className={`dash-shell dash-shell--pro dash-shell--tabs plat-shell${mobileNav ? " dash-shell--nav-open" : ""}`}
    >
      <aside
        className={`dash-sidebar dash-sidebar--pro plat-sidebar${mobileNav ? " dash-sidebar--open" : ""}`}
        aria-label={t("platformChromeUi.ariaNav")}
      >
        <div className="dash-sidebar-brand dash-sidebar-brand--pro plat-sidebar-brand">
          <BrandMark className="logo-mark logo-mark--sidebar-pro plat-logo" />
          <div>
            <span className="dash-sidebar-title">{BRAND_NAME}</span>
            <span className="dash-sidebar-role">{t("platformChromeUi.consoleRole")}</span>
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
            : visibleNav.map((item) => {
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
                    {t(NAV_LABEL_KEYS[item.id])}
                  </button>
                );
              })}
        </nav>

        <div className="dash-sidebar-foot dash-sidebar-foot--pro plat-sidebar-foot">
          <p className="dash-sidebar-school-label">{t("platformChromeUi.signedIn")}</p>
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
          aria-label={t("platformChromeUi.closeMenu")}
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <div className="dash-main dash-main--pro">
        <header className="dash-topbar dash-topbar--pro">
          <button
            type="button"
            className="dash-menu-btn dash-menu-btn--pro"
            aria-label={t("platformChromeUi.openMenu")}
            onClick={() => setMobileNav(true)}
          >
            <DashIcon name="menu" />
          </button>
          <div className="dash-topbar-heading">
            <h1 className="dash-topbar-title">{sectionTitle}</h1>
            <p className="dash-topbar-sub">{sectionSubtitle}</p>
          </div>
          <div className="dash-topbar-actions">
            <PlatformNotifyBell
              user={user}
              onOpenSection={(next) => {
                onSectionChange(next);
                setMobileNav(false);
              }}
            />
            <button
              type="button"
              onClick={logout}
              className="dash-logout dash-logout--pro"
            >
              <DashIcon name="logout" className="dash-icon--sm" />
              <span>{t("platformChromeUi.logOut")}</span>
            </button>
          </div>
        </header>
        <div className="dash-content dash-content--pro">{children}</div>
      </div>

      <nav className="dash-tabbar" aria-label={t("platformChromeUi.ariaPrimary")}>
        {mobileTabs.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`dash-tabbar__item${active ? " dash-tabbar__item--active" : ""}`}
              onClick={() => {
                onSectionChange(item.id);
                setMobileNav(false);
              }}
            >
              <span className="dash-tabbar__icon" aria-hidden>
                <DashIcon name={item.icon} />
              </span>
              <span className="dash-tabbar__label">{t(NAV_LABEL_KEYS[item.id])}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`dash-tabbar__item${moreActive || mobileNav ? " dash-tabbar__item--active" : ""}`}
          aria-label={t("platformChromeUi.moreMenu")}
          aria-expanded={mobileNav}
          onClick={() => setMobileNav((open) => !open)}
        >
          <span className="dash-tabbar__icon" aria-hidden>
            <DashIcon name="menu" />
          </span>
          <span className="dash-tabbar__label">{t("platformChromeUi.more")}</span>
        </button>
      </nav>

      {ready ? (
        <AiChatWidget variant="platform" pageContext={`platform:${section}`} />
      ) : null}
    </div>
  );
}

export function PlatformFooterLinks() {
  const { t } = useLocale();
  return (
    <p className="plat-footer-links">
      <Link href="/" className="auth-page-footer-link">
        {t("platformChromeUi.publicSite")}
      </Link>
      <span aria-hidden> · </span>
      <Link href="/login" className="auth-page-footer-link">
        {t("platformChromeUi.schoolLogin")}
      </Link>
    </p>
  );
}
