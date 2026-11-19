"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";
import { useHydrated } from "@/lib/use-client-snapshot";
import { setSchoolPlan } from "@/lib/platform-plans";
import type { PlatformSchoolDetail, PlatformSchoolRow } from "./platform-types";

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: "TRIAL", label: "Trial" },
  { value: "STARTER", label: "Starter" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

type Props = {
  school: PlatformSchoolRow | null;
  onClose: () => void;
  onStatusChange: (schoolId: string, status: "ACTIVE" | "SUSPENDED" | "TRIAL") => Promise<void>;
  onDelete: (schoolId: string) => Promise<void>;
  canSuspend: boolean;
  canDelete: boolean;
};

type Tab = "overview" | "contact" | "billing" | "access";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function schoolInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function telLink(phone: string | null | undefined) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("0") ? digits.slice(1) : digits}` : null;
}

function mailLink(email: string | null | undefined) {
  return email?.trim() ? `mailto:${email.trim()}` : null;
}

export function SchoolDetailDrawer({
  school,
  onClose,
  onStatusChange,
  onDelete,
  canSuspend,
  canDelete,
}: Props) {
  const [detail, setDetail] = useState<PlatformSchoolDetail | null>(null);
  const [loading, setLoading] = useState(school !== null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [planDraft, setPlanDraft] = useState<PlanType>("TRIAL");
  const [planActive, setPlanActive] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const mounted = useHydrated();

  useEffect(() => {
    if (!school) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [school]);

  // Reset local state when the selected school changes (adjusted during render).
  const [prevSchool, setPrevSchool] = useState(school);
  if (school !== prevSchool) {
    setPrevSchool(school);
    if (!school) {
      setDetail(null);
      setTab("overview");
      setDeleteConfirm("");
    } else {
      setLoading(true);
      setError("");
    }
  }

  useEffect(() => {
    if (!school) return;
    void platformFetch<PlatformSchoolDetail>(`/platform/schools/${school.id}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load tenant"),
      )
      .finally(() => setLoading(false));
  }, [school]);

  const sub = school ? (detail?.subscription ?? school.subscription) : null;

  const planSyncKey =
    school && sub?.plan ? `${school.id}:${sub.plan}:${String(sub.isActive)}` : null;
  const [prevPlanSyncKey, setPrevPlanSyncKey] = useState<string | null>(null);
  if (planSyncKey !== prevPlanSyncKey) {
    setPrevPlanSyncKey(planSyncKey);
    if (sub?.plan) {
      setPlanDraft(sub.plan as PlanType);
      setPlanActive(sub.isActive ?? true);
    }
  }

  if (!school || !mounted) return null;

  const status = (detail?.school.status ?? school.status).toLowerCase();
  const usage = detail?.usage ?? {
    student: school.usage.students,
    teacher: school.usage.teachers,
    admin: school.usage.admins,
    parent: school.usage.parents,
  };
  const email = detail?.school.email;
  const phone = detail?.school.phone;
  const setupDone = detail?.school.setupComplete ?? false;

  async function copyCode() {
    if (!school) return;
    try {
      await navigator.clipboard.writeText(school.joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function savePlan() {
    if (!school) return;
    setPlanSaving(true);
    setPlanMessage("");
    setError("");
    try {
      await setSchoolPlan(school.id, { plan: planDraft, isActive: planActive });
      const refreshed = await platformFetch<PlatformSchoolDetail>(
        `/platform/schools/${school.id}`,
      );
      setDetail(refreshed);
      setPlanMessage("Plan updated for this tenant.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update plan");
    } finally {
      setPlanSaving(false);
    }
  }

  async function patchStatus(next: "ACTIVE" | "SUSPENDED" | "TRIAL") {
    if (!school) return;
    setBusy(true);
    setError("");
    try {
      await onStatusChange(school.id, next);
      const refreshed = await platformFetch<PlatformSchoolDetail>(
        `/platform/schools/${school.id}`,
      );
      setDetail(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeTenant() {
    if (!school || deleteConfirm !== school.name) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete(school.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove tenant");
    } finally {
      setDeleting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contact", label: "Contact" },
    { id: "billing", label: "Billing" },
    { id: "access", label: "Access" },
  ];

  const usageCards = [
    { key: "student", label: "Students", value: usage.student ?? school.usage.students, icon: "students" as const, tone: "teal" },
    { key: "teacher", label: "Teachers", value: usage.teacher ?? school.usage.teachers, icon: "teachers" as const, tone: "blue" },
    { key: "admin", label: "Admins", value: usage.admin ?? school.usage.admins, icon: "settings" as const, tone: "slate" },
    { key: "parent", label: "Parents", value: usage.parent ?? school.usage.parents, icon: "users" as const, tone: "green" },
  ];

  const isSuspended = (detail?.school.status ?? school.status) === "SUSPENDED";
  const logoUrl = detail?.school.logoUrl ?? school.logoUrl ?? null;

  return createPortal(
    <>
      <button
        type="button"
        className="stu-drawer-backdrop plat-manage-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        className="stu-drawer stu-drawer--wide plat-manage-drawer"
        role="dialog"
        aria-labelledby="plat-school-drawer-title"
      >
        <header className="plat-manage-hero">
          <div className="plat-manage-hero__top">
            <div className="plat-manage-hero__brand">
              <span
                className={`plat-manage-avatar${logoUrl ? " plat-manage-avatar--img" : ""}`}
                aria-hidden
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" />
                ) : (
                  schoolInitials(school.name)
                )}
              </span>
              <div className="plat-manage-hero__titles">
                <p className="plat-manage-hero__eyebrow">Tenant</p>
                <h2 id="plat-school-drawer-title" className="plat-manage-hero__title">
                  {school.name}
                </h2>
                {detail?.school.slug ? (
                  <p className="plat-manage-hero__slug">{detail.school.slug}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="stu-drawer__close plat-manage-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="plat-manage-hero__meta">
            <div className="plat-join-chip">
              <span className="plat-join-chip__label">Join code</span>
              <code className="plat-join-chip__code">{school.joinCode}</code>
              <button
                type="button"
                className={`plat-join-chip__btn${copied ? " plat-join-chip__btn--done" : ""}`}
                onClick={() => void copyCode()}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="plat-manage-chips">
              <span className={`plat-status plat-status--${status}`}>
                {detail?.school.status ?? school.status}
              </span>
              {sub?.plan &&
              sub.plan !== (detail?.school.status ?? school.status) ? (
                <span className="plat-plan-badge">{sub.plan}</span>
              ) : null}
              {sub && !sub.isActive ? (
                <span className="plat-status plat-status--suspended">Billing off</span>
              ) : null}
            </div>
          </div>

          <nav className="plat-manage-tabs" role="tablist" aria-label="Tenant sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`plat-manage-tab${tab === t.id ? " plat-manage-tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="stu-drawer__body plat-manage-body">
          <AppToast message={error} tone="error" onDismiss={() => setError("")} />

          {loading ? (
            <div className="plat-manage-skeleton" aria-busy="true">
              <div className="plat-manage-skeleton__row" />
              <div className="plat-manage-skeleton__grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="plat-manage-skeleton__card" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {tab === "overview" ? (
                <>
                  <div className="plat-manage-usage">
                    {usageCards.map((c) => (
                      <article key={c.key} className={`plat-manage-stat plat-manage-stat--${c.tone}`}>
                        <span className="plat-manage-stat__icon" aria-hidden>
                          <DashIcon name={c.icon} className="dash-icon--sm" />
                        </span>
                        <span className="plat-manage-stat__val">{c.value}</span>
                        <span className="plat-manage-stat__lbl">{c.label}</span>
                      </article>
                    ))}
                  </div>
                  {detail ? (
                    <div className="plat-manage-insights">
                      <div className="plat-manage-insight">
                        <DashIcon name="announcements" className="dash-icon--sm" />
                        <div>
                          <strong>{detail.announcements}</strong>
                          <span>Announcements</span>
                        </div>
                      </div>
                      <div className="plat-manage-insight">
                        <DashIcon name="students" className="dash-icon--sm" />
                        <div>
                          <strong>{detail.usage.studentProfiles ?? 0}</strong>
                          <span>Student profiles</span>
                        </div>
                      </div>
                      <div className="plat-manage-insight">
                        <DashIcon name="calendar" className="dash-icon--sm" />
                        <div>
                          <strong>{formatDate(detail.school.createdAt)}</strong>
                          <span>Enrolled</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <section className="plat-manage-card">
                    <h3 className="plat-manage-card__title">Setup progress</h3>
                    <div className={`plat-setup-bar${setupDone ? " plat-setup-bar--done" : ""}`}>
                      <div className="plat-setup-bar__fill" style={{ width: setupDone ? "100%" : "45%" }} />
                    </div>
                    <p className="plat-manage-card__hint">
                      {setupDone
                        ? "Tenant completed onboarding — admins can use all modules."
                        : "Tenant is still configuring grades and staff."}
                    </p>
                  </section>
                </>
              ) : null}

              {tab === "contact" ? (
                <section className="plat-manage-card">
                  <h3 className="plat-manage-card__title">Contact & location</h3>
                  <ul className="plat-contact-list">
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        @
                      </span>
                      <div>
                        <span className="plat-contact-item__label">Email</span>
                        <span className="plat-contact-item__value">{email ?? "—"}</span>
                      </div>
                      {mailLink(email) ? (
                        <a href={mailLink(email)!} className="plat-contact-action">
                          Email
                        </a>
                      ) : null}
                    </li>
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        ☎
                      </span>
                      <div>
                        <span className="plat-contact-item__label">Phone</span>
                        <span className="plat-contact-item__value">{phone ?? "—"}</span>
                      </div>
                      {telLink(phone) ? (
                        <a href={telLink(phone)!} className="plat-contact-action">
                          Call
                        </a>
                      ) : null}
                    </li>
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        ⌖
                      </span>
                      <div>
                        <span className="plat-contact-item__label">Country</span>
                        <span className="plat-contact-item__value">
                          {detail?.school.country ?? "—"}
                        </span>
                      </div>
                    </li>
                  </ul>
                </section>
              ) : null}

              {tab === "billing" ? (
                <section className="plat-manage-card plat-manage-card--billing">
                  <div className="plat-billing-hero">
                    <div>
                      <p className="plat-billing-hero__label">Current plan</p>
                      <p className="plat-billing-hero__plan">{sub?.plan ?? "No plan"}</p>
                    </div>
                    <span
                      className={`plat-status plat-status--${sub?.isActive ? "active" : "suspended"}`}
                    >
                      {sub?.isActive ? "Billing active" : "Billing inactive"}
                    </span>
                  </div>
                  <dl className="plat-billing-facts">
                    <div>
                      <dt>Trial ends</dt>
                      <dd>{formatDate(sub?.trialEndsAt)}</dd>
                    </div>
                    <div>
                      <dt>Access status</dt>
                      <dd>{detail?.school.status ?? school.status}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{formatDate(detail?.school.createdAt ?? school.createdAt)}</dd>
                    </div>
                  </dl>
                  <div className="plat-school-plan-form">
                    <h3 className="plat-manage-card__title">Assign plan</h3>
                    <p className="plat-manage-card__hint">
                      Override what this tenant is on. Edit catalog prices under Platform → Plans.
                    </p>
                    <label className="plat-field">
                      <span>Plan</span>
                      <select
                        className="plat-select"
                        value={planDraft}
                        onChange={(e) => setPlanDraft(e.target.value as PlanType)}
                      >
                        {PLAN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="plat-plan-editor__listed">
                      <input
                        type="checkbox"
                        checked={planActive}
                        onChange={(e) => setPlanActive(e.target.checked)}
                      />
                      Billing active
                    </label>
                    <button
                      type="button"
                      className="plat-btn plat-btn--primary plat-btn--block"
                      disabled={planSaving || loading}
                      onClick={() => void savePlan()}
                    >
                      {planSaving ? "Saving…" : "Save plan for tenant"}
                    </button>
                    {planMessage ? <p className="plat-plans__ok">{planMessage}</p> : null}
                  </div>
                </section>
              ) : null}

              {tab === "access" ? (
                <section className="plat-manage-card">
                  <h3 className="plat-manage-card__title">Tenant access</h3>
                  <p className="plat-manage-card__hint">
                    Suspending blocks all tenant logins immediately. Activate to restore access.
                  </p>
                  <div className={`plat-access-state${isSuspended ? " plat-access-state--off" : ""}`}>
                    <DashIcon name={isSuspended ? "alert" : "attendance"} className="dash-icon--sm" />
                    <div>
                      <strong>{isSuspended ? "Tenant is suspended" : "Tenant is operational"}</strong>
                      <span>
                        {isSuspended
                          ? "Users cannot sign in until you activate."
                          : "Admins, teachers, and families can sign in."}
                      </span>
                    </div>
                  </div>
                  {canSuspend ? (
                    <div className="plat-access-actions">
                      {isSuspended ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--primary plat-btn--block"
                          disabled={busy}
                          onClick={() => void patchStatus("ACTIVE")}
                        >
                          Activate tenant
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="plat-btn plat-btn--danger plat-btn--block"
                          disabled={busy}
                          onClick={() => void patchStatus("SUSPENDED")}
                        >
                          Suspend tenant
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="plat-manage-card__hint">
                      Your role cannot change tenant access. Contact a platform owner.
                    </p>
                  )}
                  {canDelete ? (
                    <div className="plat-tenant-remove">
                      <h4>Remove tenant permanently</h4>
                      <p>
                        Deletes this workspace, all users, and tenant data. This cannot be undone.
                        Type <strong>{school.name}</strong> to confirm.
                      </p>
                      <label className="plat-field">
                        <span>Confirm tenant name</span>
                        <input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder={school.name}
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        className="plat-btn plat-btn--danger plat-btn--block"
                        disabled={deleting || deleteConfirm !== school.name}
                        onClick={() => void removeTenant()}
                      >
                        {deleting ? "Removing…" : "Remove tenant permanently"}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>

        {canSuspend && tab !== "access" ? (
          <footer className="stu-drawer__foot plat-manage-foot">
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              onClick={() => setTab("access")}
            >
              Access controls
            </button>
            {!isSuspended ? (
              <button
                type="button"
                className="plat-btn plat-btn--danger"
                disabled={busy || loading}
                onClick={() => void patchStatus("SUSPENDED")}
              >
                Suspend
              </button>
            ) : (
              <button
                type="button"
                className="plat-btn plat-btn--primary"
                disabled={busy || loading}
                onClick={() => void patchStatus("ACTIVE")}
              >
                Activate
              </button>
            )}
          </footer>
        ) : null}
      </aside>
    </>,
    document.body,
  );
}
