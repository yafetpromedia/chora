"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { apiFetch, apiPost, getSchoolSubscription, type Announcement, type SchoolInfo, type SubscriptionStatus } from "@/lib/api";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import {
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  clearSessionStorage,
  type UserRole,
} from "@/lib/auth";
import {
  applySchoolTheme,
  persistSchoolBrand,
  readSchoolBrand,
  SCHOOL_BRAND_UPDATED_EVENT,
} from "@/lib/school-brand";
import { BRAND_NAME } from "@/lib/brand";
import {
  listStaffNotifications,
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
  staffNotificationsUnreadCount,
  type StaffNotification,
} from "@/lib/staff-notifications";
import { SchoolBrandLockup } from "./school-brand-lockup";
import { DashIcon } from "./dash-icons";
import { getMyTeacherProfile } from "@/lib/teachers";
import {
  isMobileMoreActive,
  isNavActive,
  isNavChildActive,
  mobilePrimaryNav,
  navForRole,
  type NavItem,
} from "./nav-config";
import { AiChatWidget } from "@/components/ai/ai-chat-widget";
import { TrialPaywall } from "@/components/trial-paywall";

const ACTION_ALERT_DISMISS_KEY = "campusone.actionAlerts.dismissed";
const NAV_EXPANDED_KEY = "campusone.dashNav.expanded";
const NAV_MODULES_KEY = "campusone.dashNav.enabledModules";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readCachedModules(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(NAV_MODULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((m): m is string => typeof m === "string")
      : [];
  } catch {
    return [];
  }
}

function writeCachedModules(modules: string[]) {
  try {
    sessionStorage.setItem(NAV_MODULES_KEY, JSON.stringify(modules));
  } catch {
    /* ignore quota / private mode */
  }
}

function readExpandedNav(role: UserRole): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(`${NAV_EXPANDED_KEY}.${role}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "boolean"),
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeExpandedNav(role: UserRole, value: Record<string, boolean>) {
  try {
    sessionStorage.setItem(`${NAV_EXPANDED_KEY}.${role}`, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function readDismissedActionAlerts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ACTION_ALERT_DISMISS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date?: string; types?: string[] };
    if (parsed.date !== todayKey() || !Array.isArray(parsed.types)) return new Set();
    return new Set(parsed.types);
  } catch {
    return new Set();
  }
}

function writeDismissedActionAlerts(types: Set<string>) {
  localStorage.setItem(
    ACTION_ALERT_DISMISS_KEY,
    JSON.stringify({ date: todayKey(), types: [...types] }),
  );
}

function hrefForAnnouncement(item: Announcement): string | null {
  if (/^Support (resolved|update):/i.test(item.title)) {
    return "/admin/support";
  }
  return null;
}

type Props = {
  role: UserRole;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function DashboardShell({ role, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [navRole, setNavRole] = useState<UserRole>(role);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [cachedEnabledModules, setEnabledModules] = useState<string[]>(() =>
    readCachedModules(),
  );
  const enabledModules = subscription?.enabledModules ?? cachedEnabledModules;
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [staffNotifications, setStaffNotifications] = useState<StaffNotification[]>([]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [actionAlerts, setActionAlerts] = useState<AdminDayOverview["alerts"]["items"]>([]);
  const [dismissedActionTypes, setDismissedActionTypes] = useState<Set<string>>(() => new Set());
  const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>(() =>
    readExpandedNav(role),
  );
  const notifyRef = useRef<HTMLDivElement | null>(null);
  const navListRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDismissedActionTypes(readDismissedActionAlerts());
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    queueMicrotask(() => setNavRole(effectiveRole));

    async function loadNav() {
      // Prefer last-known entitlements while / until subscription is verified.
      let modules = readCachedModules();
      try {
        const sub = await getSchoolSubscription();
        modules = sub.enabledModules ?? [];
        writeCachedModules(modules);
        setSubscription(sub);
        setEnabledModules(modules);
      } catch {
        // Keep cached modules so People / Payroll / Attendance don't vanish on remount.
        setEnabledModules(modules);
      }

      let attendanceOk = false;
      if (effectiveRole === "teacher") {
        try {
          const profile = await getMyTeacherProfile();
          attendanceOk = Boolean(profile.canTakeAttendance);
        } catch {
          attendanceOk = false;
        }
      }
      setCanTakeAttendance(attendanceOk);
      setShellReady(true);
    }

    void loadNav();
    const brand = readSchoolBrand();
    queueMicrotask(() => {
      setSchoolName(brand.name);
      setSchoolLogoUrl(brand.logoUrl);
    });
    applySchoolTheme(brand);

    void apiFetch<{ school: SchoolInfo | null }>("/schools/me")
      .then((res) => {
        if (!res.school) return;
        persistSchoolBrand({
          name: res.school.name,
          logoUrl: res.school.logoUrl ?? null,
          primaryColor: res.school.primaryColor ?? null,
          accentColor: res.school.accentColor ?? null,
          accentDeep: res.school.accentDeep ?? null,
        });
        setSchoolName(res.school.name);
        setSchoolLogoUrl(res.school.logoUrl ?? null);
      })
      .catch(() => {
        /* keep cached brand */
      });

    void apiFetch<{ count: number }>("/announcements/unread-count")
      .then((res) => setUnreadCount(res.count ?? 0))
      .catch(() => setUnreadCount(0));

    if (role === "admin" || role === "staff" || role === "teacher") {
      void staffNotificationsUnreadCount()
        .then((res) => setStaffUnreadCount(res.count ?? 0))
        .catch(() => setStaffUnreadCount(0));
    }

    if (role === "admin" || role === "staff") {
      void loadActionAlerts();
    }
  }, [role, router]);

  const nav = useMemo<NavItem[]>(
    () =>
      shellReady
        ? navForRole(navRole, {
            canTakeAttendance,
            enabledModules,
          })
        : [],
    [shellReady, navRole, canTakeAttendance, enabledModules],
  );

  useEffect(() => {
    if (!subscription?.enabledModules) return;
    writeCachedModules(subscription.enabledModules);
  }, [subscription]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onDocClick(event: globalThis.MouseEvent) {
      if (!notifyRef.current) return;
      if (!notifyRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notificationsOpen]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void apiFetch<{ count: number }>("/announcements/unread-count")
        .then((res) => setUnreadCount(res.count ?? 0))
        .catch(() => undefined);
      if (role === "admin" || role === "staff" || role === "teacher") {
        void staffNotificationsUnreadCount()
          .then((res) => setStaffUnreadCount(res.count ?? 0))
          .catch(() => undefined);
      }
      if (role === "admin" || role === "staff") {
        void loadActionAlerts();
      }
      if (notificationsOpen) {
        void loadNotifications();
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [notificationsOpen, role]);

  useEffect(() => {
    function onBrandUpdate() {
      const brand = readSchoolBrand();
      setSchoolName(brand.name);
      setSchoolLogoUrl(brand.logoUrl);
      applySchoolTheme(brand);
    }
    window.addEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
    return () => window.removeEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setExpandedNav((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const item of nav) {
          if (!item.children?.length) continue;
          const groupActive = item.children.some((child) =>
            isNavChildActive(pathname, child.href),
          );
          // Open the active section; close others when you leave (e.g. Results).
          if (groupActive) {
            if (!next[item.href]) {
              next[item.href] = true;
              changed = true;
            }
          } else if (next[item.href]) {
            next[item.href] = false;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
  }, [pathname, nav]);

  useEffect(() => {
    writeExpandedNav(navRole, expandedNav);
  }, [expandedNav, navRole]);

  /* Pages remount DashboardShell on route change — keep the active item in view. */
  useEffect(() => {
    if (!shellReady) return;
    const root = navListRef.current;
    if (!root) return;

    const active =
      root.querySelector<HTMLElement>(".dash-nav-sub-item--active") ??
      root.querySelector<HTMLElement>(".dash-nav-group--active > .dash-nav-item--branch") ??
      root.querySelector<HTMLElement>(".dash-nav-item--active");
    if (!active) return;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        active.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [shellReady, pathname, nav, expandedNav]);

  function logout() {
    clearSessionStorage();
    router.push("/login");
  }

  async function loadActionAlerts() {
    try {
      const res = await apiFetch<{ day?: AdminDayOverview }>("/dashboards/me");
      const dismissed = readDismissedActionAlerts();
      setDismissedActionTypes(dismissed);
      if (res.day?.kind === "admin_day") {
        setActionAlerts(
          res.day.alerts.items.filter((alert) => !dismissed.has(alert.type)),
        );
      } else {
        setActionAlerts([]);
      }
    } catch {
      setActionAlerts([]);
    }
  }

  async function loadNotifications() {
    setNotifyLoading(true);
    try {
      const tasks: Promise<void>[] = [
        apiFetch<Announcement[]>("/announcements").then((rows) => {
          setNotifications(rows.filter((row) => !row.isRead));
        }),
      ];
      if (role === "admin" || role === "staff" || role === "teacher") {
        tasks.push(
          listStaffNotifications().then((rows) => {
            setStaffNotifications(rows.filter((row) => !row.readAt));
          }),
        );
      }
      if (role === "admin" || role === "staff") {
        tasks.push(loadActionAlerts());
      }
      await Promise.all(tasks);
    } finally {
      setNotifyLoading(false);
    }
  }

  async function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
    }
  }

  async function markAnnouncementRead(item: Announcement) {
    if (!item.isRead) {
      try {
        await apiPost(`/announcements/${item.id}/read`, {});
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        return;
      }
    }
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
  }

  async function openNotification(item: Announcement) {
    const href = hrefForAnnouncement(item);
    setNotificationsOpen(false);
    await markAnnouncementRead(item);
    if (href) router.push(href);
  }

  async function dismissNotification(item: Announcement, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await markAnnouncementRead(item);
  }

  async function markAllNotificationsRead() {
    if (unreadCount === 0 && staffUnreadCount === 0) return;
    try {
      const jobs: Promise<unknown>[] = [];
      if (unreadCount > 0) {
        jobs.push(apiPost<{ updated: number }>("/announcements/read-all", {}));
      }
      if (staffUnreadCount > 0) {
        jobs.push(markAllStaffNotificationsRead());
      }
      await Promise.all(jobs);
      setNotifications([]);
      setStaffNotifications([]);
      setUnreadCount(0);
      setStaffUnreadCount(0);
    } catch {
      /* no-op */
    }
  }

  async function openStaffNotification(item: StaffNotification) {
    setNotificationsOpen(false);
    try {
      await markStaffNotificationRead(item.id);
      setStaffUnreadCount((prev) => Math.max(0, prev - 1));
      setStaffNotifications((prev) => prev.filter((n) => n.id !== item.id));
    } catch {
      /* still navigate */
    }
    if (item.link) router.push(item.link);
  }

  async function dismissStaffNotification(item: StaffNotification, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await markStaffNotificationRead(item.id);
      setStaffUnreadCount((prev) => Math.max(0, prev - 1));
      setStaffNotifications((prev) => prev.filter((n) => n.id !== item.id));
    } catch {
      /* no-op */
    }
  }

  function openActionAlert(href: string) {
    setNotificationsOpen(false);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return;
    }
    router.push(href);
  }

  function dismissActionAlert(type: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(dismissedActionTypes);
    next.add(type);
    setDismissedActionTypes(next);
    writeDismissedActionAlerts(next);
    setActionAlerts((prev) => prev.filter((alert) => alert.type !== type));
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
  const visibleActionAlerts = actionAlerts.filter((alert) => {
    if (alert.type === "results") return false;
    return !(pathname === alert.href || pathname.startsWith(`${alert.href}/`));
  });
  const actionAlertCount = visibleActionAlerts.length;
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadStaff = staffNotifications.filter((n) => !n.readAt);
  const visibleNotifications = showAllNotifications
    ? unreadNotifications
    : unreadNotifications.slice(0, 8);
  const visibleStaffNotifications = showAllNotifications
    ? unreadStaff
    : unreadStaff.slice(0, 8);
  const notifyBadgeCount =
    unreadCount +
    staffUnreadCount +
    (isAdminWorkspace ? actionAlertCount : 0);
  const pageTitle = title ?? (isAdminWorkspace ? "Dashboard" : `${roleLabel} dashboard`);
  const mobileTabs = mobilePrimaryNav(nav, navRole);
  const moreActive = isMobileMoreActive(pathname, mobileTabs);
  const showMobileTabs = shellReady && mobileTabs.length > 0;

  return (
    <div
      className={`dash-shell dash-shell--pro${mobileNav ? " dash-shell--nav-open" : ""}${showMobileTabs ? " dash-shell--tabs" : ""}`}
    >
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

        <nav ref={navListRef} className="dash-nav dash-nav--pro">
          {!shellReady
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dash-nav-item dash-nav-item--pro dash-nav-item--skeleton" />
              ))
            : nav.map((item) => {
                const hasChildren = !!item.children?.length;
                const active = hasChildren
                  ? item.children!.some((child) => isNavChildActive(pathname, child.href))
                  : isNavActive(pathname, item.href);
                const groupOpen = hasChildren
                  ? (expandedNav[item.href] ?? active)
                  : false;

                if (!hasChildren) {
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
                }

                return (
                  <div
                    key={item.href}
                    className={`dash-nav-group${active ? " dash-nav-group--active" : ""}${groupOpen ? " dash-nav-group--open" : ""}`}
                  >
                    <button
                      type="button"
                      className={`dash-nav-item dash-nav-item--pro dash-nav-item--branch${active ? " dash-nav-item--active" : ""}`}
                      aria-expanded={groupOpen}
                      onClick={() => {
                        const nextOpen = !groupOpen;
                        setExpandedNav((prev) => ({ ...prev, [item.href]: nextOpen }));
                        if (nextOpen && !active) {
                          router.push(item.href);
                        }
                        setMobileNav(false);
                      }}
                    >
                      <span className="dash-nav-icon-wrap" aria-hidden>
                        <DashIcon name={item.icon} />
                      </span>
                      <span className="dash-nav-branch-label">{item.label}</span>
                      <DashIcon name="chevron" className="dash-nav-chevron" />
                    </button>
                    {groupOpen ? (
                      <div className="dash-nav-sub">
                        {item.children!.map((child) => {
                          const childActive = isNavChildActive(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`dash-nav-sub-item${childActive ? " dash-nav-sub-item--active" : ""}${child.tone === "ai" ? " dash-nav-sub-item--ai" : ""}`}
                              onClick={() => setMobileNav(false)}
                            >
                              {child.tone === "ai" ? (
                                <span className="dash-nav-sub-item__spark" aria-hidden>
                                  ✦
                                </span>
                              ) : null}
                              <span className="dash-nav-sub-item__text">
                                <span className="dash-nav-sub-item__label">{child.label}</span>
                                {child.description ? (
                                  <span className="dash-nav-sub-item__desc">{child.description}</span>
                                ) : null}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
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
            {subtitle ? <p className="dash-topbar-sub">{subtitle}</p> : null}
          </div>
          <div className="dash-topbar-actions">
            <div className="dash-notify-wrap" ref={notifyRef}>
              <button
                type="button"
                className="dash-notify"
                title={
                  notifyBadgeCount > 0
                    ? `${notifyBadgeCount} notification${notifyBadgeCount === 1 ? "" : "s"}`
                    : "Notifications"
                }
                onClick={() => void toggleNotifications()}
              >
                <DashIcon name="alert" className="dash-icon--sm" />
                {notifyBadgeCount > 0 ? (
                  <span className="dash-notify-badge">
                    {notifyBadgeCount > 99 ? "99+" : notifyBadgeCount}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <section className="dash-notify-panel" aria-label="Notifications">
                  <header className="dash-notify-head">
                    <h2>Notifications</h2>
                    <button
                      type="button"
                      className="dash-notify-mark-all"
                      onClick={() => void markAllNotificationsRead()}
                      disabled={unreadCount === 0 && staffUnreadCount === 0}
                    >
                      Mark all read
                    </button>
                  </header>
                  {notifyLoading ? (
                    <p className="dash-notify-empty">Loading…</p>
                  ) : visibleActionAlerts.length === 0 &&
                    unreadNotifications.length === 0 &&
                    unreadStaff.length === 0 ? (
                    <p className="dash-notify-empty">No notifications yet.</p>
                  ) : (
                    <>
                      {visibleActionAlerts.length > 0 ? (
                        <>
                          <p className="dash-notify-section">Action needed</p>
                          <ul className="dash-notify-list dash-notify-list--actions">
                            {visibleActionAlerts.map((alert) => (
                              <li key={alert.type} className="dash-notify-row">
                                <button
                                  type="button"
                                  className="dash-notify-action"
                                  onClick={() => openActionAlert(alert.href)}
                                >
                                  <span className="dash-notify-action__count">{alert.count}</span>
                                  <span className="dash-notify-action__text">
                                    <strong>{alert.label}</strong>
                                    <span>Tap to open</span>
                                  </span>
                                  <DashIcon name="chevron" className="dash-icon--xs" />
                                </button>
                                <button
                                  type="button"
                                  className="dash-notify-dismiss"
                                  aria-label={`Dismiss ${alert.label}`}
                                  title="Dismiss for today"
                                  onClick={(e) => dismissActionAlert(alert.type, e)}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {unreadStaff.length > 0 ? (
                        <>
                          <p className="dash-notify-section">Attendance & alerts</p>
                          <ul className="dash-notify-list">
                            {visibleStaffNotifications.map((item) => (
                              <li key={item.id} className="dash-notify-row">
                                <button
                                  type="button"
                                  className="dash-notify-item dash-notify-item--unread"
                                  onClick={() => void openStaffNotification(item)}
                                >
                                  <p className="dash-notify-title">{item.title}</p>
                                  {item.body ? (
                                    <p className="dash-notify-body">{item.body}</p>
                                  ) : null}
                                  <p className="dash-notify-time">
                                    {item.link ? "Tap to open · " : ""}
                                    {new Date(item.createdAt).toLocaleString()}
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  className="dash-notify-dismiss"
                                  aria-label={`Dismiss ${item.title}`}
                                  title="Dismiss"
                                  onClick={(e) => void dismissStaffNotification(item, e)}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {unreadNotifications.length > 0 ? (
                        <>
                          {visibleActionAlerts.length > 0 || unreadStaff.length > 0 ? (
                            <p className="dash-notify-section">Announcements</p>
                          ) : null}
                          <ul className="dash-notify-list">
                            {visibleNotifications.map((item) => {
                              const href = hrefForAnnouncement(item);
                              return (
                                <li key={item.id} className="dash-notify-row">
                                  <button
                                    type="button"
                                    className="dash-notify-item dash-notify-item--unread"
                                    onClick={() => void openNotification(item)}
                                  >
                                    <p className="dash-notify-title">{item.title}</p>
                                    {item.body ? (
                                      <p className="dash-notify-body">{item.body}</p>
                                    ) : null}
                                    <p className="dash-notify-time">
                                      {href ? "Tap to open · " : ""}
                                      {new Date(item.createdAt).toLocaleString()}
                                    </p>
                                  </button>
                                  <button
                                    type="button"
                                    className="dash-notify-dismiss"
                                    aria-label={`Dismiss ${item.title}`}
                                    title="Dismiss"
                                    onClick={(e) => void dismissNotification(item, e)}
                                  >
                                    ×
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      ) : null}
                      <footer className="dash-notify-foot">
                        {unreadNotifications.length + unreadStaff.length > 8 ? (
                          <button
                            type="button"
                            className="dash-notify-view-all"
                            onClick={() => setShowAllNotifications((v) => !v)}
                          >
                            {showAllNotifications
                              ? "Show less"
                              : `View all (${unreadNotifications.length + unreadStaff.length})`}
                          </button>
                        ) : (
                          <span className="dash-notify-count">
                            {unreadCount + staffUnreadCount} unread
                            {actionAlertCount > 0
                              ? ` · ${actionAlertCount} action${actionAlertCount === 1 ? "" : "s"}`
                              : ""}
                          </span>
                        )}
                      </footer>
                    </>
                  )}
                </section>
              ) : null}
            </div>
            <button type="button" onClick={logout} className="dash-logout dash-logout--pro">
              <DashIcon name="logout" className="dash-icon--sm" />
              <span>Log out</span>
            </button>
          </div>
        </header>
        <div className="dash-content dash-content--pro">{children}</div>
      </div>

      {showMobileTabs ? (
        <nav className="dash-tabbar" aria-label="Primary navigation">
          {mobileTabs.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-tabbar__item${active ? " dash-tabbar__item--active" : ""}`}
                onClick={() => setMobileNav(false)}
              >
                <span className="dash-tabbar__icon" aria-hidden>
                  <DashIcon name={item.icon} />
                </span>
                <span className="dash-tabbar__label">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`dash-tabbar__item${moreActive || mobileNav ? " dash-tabbar__item--active" : ""}`}
            aria-label="More menu"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((open) => !open)}
          >
            <span className="dash-tabbar__icon" aria-hidden>
              <DashIcon name="menu" />
            </span>
            <span className="dash-tabbar__label">More</span>
          </button>
        </nav>
      ) : null}

      <AiChatWidget role={navRole} />
      {subscription?.expired && !pathname.startsWith("/admin/billing") ? (
        <TrialPaywall
          subscription={subscription}
          role={navRole}
          onRedeemed={(next) => {
            setSubscription(next);
            if (!next.expired) {
              window.location.reload();
            }
          }}
        />
      ) : null}
    </div>
  );
}
