"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, apiPost, type Announcement, type SchoolInfo } from "@/lib/api";
import type { AdminDayOverview } from "@/lib/dashboard-day";
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
import { getMyTeacherProfile } from "@/lib/teachers";
import { isNavActive, isNavChildActive, navForRole, type NavItem } from "./nav-config";
import { AiChatWidget } from "@/components/ai/ai-chat-widget";

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [actionAlerts, setActionAlerts] = useState<AdminDayOverview["alerts"]["items"]>([]);
  const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>({});
  const notifyRef = useRef<HTMLDivElement | null>(null);

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

    if (effectiveRole === "teacher") {
      void getMyTeacherProfile()
        .then((profile) => {
          setNav(
            navForRole(effectiveRole, {
              canTakeAttendance: profile.canTakeAttendance,
            }),
          );
        })
        .catch(() => setNav(navForRole(effectiveRole)));
    } else {
      setNav(navForRole(effectiveRole));
    }
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

    void apiFetch<{ count: number }>("/announcements/unread-count")
      .then((res) => setUnreadCount(res.count ?? 0))
      .catch(() => setUnreadCount(0));

    if (role === "admin" || role === "staff") {
      void loadActionAlerts();
    }

    setShellReady(true);
  }, [role, router]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onDocClick(event: MouseEvent) {
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
    }
    window.addEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
    return () => window.removeEventListener(SCHOOL_BRAND_UPDATED_EVENT, onBrandUpdate);
  }, []);

  useEffect(() => {
    setExpandedNav((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of nav) {
        if (item.children?.length && isNavActive(pathname, item.href) && !next[item.href]) {
          next[item.href] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, nav]);

  function logout() {
    clearSessionStorage();
    router.push("/login");
  }

  async function loadActionAlerts() {
    try {
      const res = await apiFetch<{ day?: AdminDayOverview }>("/dashboards/me");
      if (res.day?.kind === "admin_day") {
        setActionAlerts(res.day.alerts.items);
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
          setNotifications(rows);
        }),
      ];
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
    if (item.isRead) return;
    try {
      await apiPost(`/announcements/${item.id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* no-op */
    }
  }

  async function markAllNotificationsRead() {
    if (unreadCount === 0) return;
    try {
      await apiPost<{ updated: number }>("/announcements/read-all", {});
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      /* no-op */
    }
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
  const actionAlertCount = actionAlerts.length;
  const notifyBadgeCount = unreadCount + (isAdminWorkspace ? actionAlertCount : 0);
  const pageTitle = title ?? (isAdminWorkspace ? "Dashboard" : `${roleLabel} dashboard`);
  return (
    <div
      className={`dash-shell dash-shell--pro${mobileNav ? " dash-shell--nav-open" : ""}`}
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

        <nav className="dash-nav dash-nav--pro">
          {!shellReady
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dash-nav-item dash-nav-item--pro dash-nav-item--skeleton" />
              ))
            : nav.map((item) => {
                const active = isNavActive(pathname, item.href);
                const hasChildren = !!item.children?.length;
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
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </header>
                {notifyLoading ? (
                  <p className="dash-notify-empty">Loading…</p>
                ) : actionAlerts.length === 0 && notifications.length === 0 ? (
                  <p className="dash-notify-empty">No notifications yet.</p>
                ) : (
                  <>
                    {actionAlerts.length > 0 ? (
                      <>
                        <p className="dash-notify-section">Action needed</p>
                        <ul className="dash-notify-list dash-notify-list--actions">
                          {actionAlerts.map((alert) => (
                            <li key={alert.type}>
                              <Link
                                href={alert.href}
                                className="dash-notify-action"
                                onClick={() => setNotificationsOpen(false)}
                              >
                                <span className="dash-notify-action__count">{alert.count}</span>
                                <span className="dash-notify-action__text">
                                  <strong>{alert.label}</strong>
                                  <span>Tap to review</span>
                                </span>
                                <DashIcon name="chevron" className="dash-icon--xs" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {notifications.length > 0 ? (
                      <>
                        {actionAlerts.length > 0 ? (
                          <p className="dash-notify-section">Announcements</p>
                        ) : null}
                        <ul className="dash-notify-list">
                          {(showAllNotifications ? notifications : notifications.slice(0, 8)).map(
                            (item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  className={`dash-notify-item${item.isRead ? "" : " dash-notify-item--unread"}`}
                                  onClick={() => void markAnnouncementRead(item)}
                                >
                                  <p className="dash-notify-title">{item.title}</p>
                                  {item.body ? (
                                    <p className="dash-notify-body">{item.body}</p>
                                  ) : null}
                                  <p className="dash-notify-time">
                                    {new Date(item.createdAt).toLocaleString()}
                                  </p>
                                </button>
                              </li>
                            ),
                          )}
                        </ul>
                      </>
                    ) : null}
                    <footer className="dash-notify-foot">
                      {notifications.length > 8 ? (
                        <button
                          type="button"
                          className="dash-notify-view-all"
                          onClick={() => setShowAllNotifications((v) => !v)}
                        >
                          {showAllNotifications
                            ? "Show less"
                            : `View all (${notifications.length})`}
                        </button>
                      ) : (
                        <span className="dash-notify-count">
                          {unreadCount} unread
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
        </header>
        <div className="dash-content dash-content--pro">{children}</div>
      </div>
      <AiChatWidget role={navRole} />
    </div>
  );
}
