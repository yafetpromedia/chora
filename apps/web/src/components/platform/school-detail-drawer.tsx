"use client";

import { useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";
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
  canSuspend: boolean;
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
  canSuspend,
}: Props) {
  const [detail, setDetail] = useState<PlatformSchoolDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [planDraft, setPlanDraft] = useState<PlanType>("TRIAL");
  const [planActive, setPlanActive] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);
  const [planMessage, setPlanMessage] = useState("");

  useEffect(() => {
    if (!school) {
      setDetail(null);
      setTab("overview");
      return;
    }
    setLoading(true);
    setError("");
    void platformFetch<PlatformSchoolDetail>(`/platform/schools/${school.id}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load school"),
      )
      .finally(() => setLoading(false));
  }, [school]);

  const sub = school ? (detail?.subscription ?? school.subscription) : null;

  useEffect(() => {
    if (!school || !sub?.plan) return;
    setPlanDraft(sub.plan as PlanType);
    setPlanActive(sub.isActive ?? true);
  }, [school, sub?.plan, sub?.isActive]);

  if (!school) return null;

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
      setPlanMessage("Plan updated for this school.");
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

  return (
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
              <span className="plat-manage-avatar" aria-hidden>
                {schoolInitials(school.name)}
              </span>
              <div className="plat-manage-hero__titles">
                <p className="plat-manage-hero__eyebrow">Tenant school</p>
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

          <nav className="plat-manage-tabs" role="tablist" aria-label="School sections">
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
          {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

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
                        ? "School completed onboarding — admins can use all modules."
                        : "School is still configuring grades and staff."}
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
                      <dt>School status</dt>
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
                      Override what this school is on. Edit catalog prices under Platform → Plans.
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
                      {planSaving ? "Saving…" : "Save plan for school"}
                    </button>
                    {planMessage ? <p className="plat-plans__ok">{planMessage}</p> : null}
                  </div>
                </section>
              ) : null}

              {tab === "access" ? (
                <section className="plat-manage-card">
                  <h3 className="plat-manage-card__title">Tenant access</h3>
                  <p className="plat-manage-card__hint">
                    Suspending blocks all school logins immediately. Activate to restore access.
                  </p>
                  <div className={`plat-access-state${isSuspended ? " plat-access-state--off" : ""}`}>
                    <DashIcon name={isSuspended ? "alert" : "attendance"} className="dash-icon--sm" />
                    <div>
                      <strong>{isSuspended ? "School is suspended" : "School is operational"}</strong>
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
                          Activate school
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="plat-btn plat-btn--danger plat-btn--block"
                          disabled={busy}
                          onClick={() => void patchStatus("SUSPENDED")}
                        >
                          Suspend school
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="plat-manage-card__hint">
                      Your role cannot change school access. Contact a platform owner.
                    </p>
                  )}
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
    </>
  );
}
