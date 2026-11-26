"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";
import { useHydrated } from "@/lib/use-client-snapshot";
import { setSchoolPlan } from "@/lib/platform-plans";
import type { PlatformSchoolDetail, PlatformSchoolRow } from "./platform-types";

const PLAN_VALUES: PlanType[] = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

function planOptionLabel(plan: PlanType, translate: (key: string) => string) {
  if (plan === "TRIAL") return translate("platformUi.planTrial");
  if (plan === "STARTER") return translate("platformUi.planStarter");
  if (plan === "PROFESSIONAL") return translate("platformUi.planProfessional");
  if (plan === "ENTERPRISE") return translate("platformUi.planEnterprise");
  return plan;
}

function tenantStatusLabel(status: string, translate: (key: string) => string) {
  if (status === "ACTIVE") return translate("platformUi.statusActive");
  if (status === "TRIAL") return translate("platformUi.statusTrial");
  if (status === "SUSPENDED") return translate("platformUi.statusSuspended");
  return status;
}

type Props = {
  school: PlatformSchoolRow | null;
  onClose: () => void;
  onStatusChange: (schoolId: string, status: "ACTIVE" | "SUSPENDED" | "TRIAL") => Promise<void>;
  onDelete: (schoolId: string) => Promise<void>;
  canSuspend: boolean;
  canDelete: boolean;
};

type Tab = "overview" | "contact" | "billing" | "access";

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "am" ? "am-ET" : undefined, {
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
  const { t, locale } = useLocale();
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
        setError(err instanceof Error ? err.message : t("platformUi.errLoadTenant")),
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
      setPlanMessage(t("platformUi.detailPlanUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.detailErrPlan"));
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
      setError(err instanceof Error ? err.message : t("platformUi.errUpdateFailed"));
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
      setError(err instanceof Error ? err.message : t("platformUi.errRemoveTenant"));
    } finally {
      setDeleting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("platformUi.detailTabOverview") },
    { id: "contact", label: t("platformUi.detailTabContact") },
    { id: "billing", label: t("platformUi.detailTabBilling") },
    { id: "access", label: t("platformUi.detailTabAccess") },
  ];

  const usageCards = [
    { key: "student", label: t("platformUi.statStudents"), value: usage.student ?? school.usage.students, icon: "students" as const, tone: "teal" },
    { key: "teacher", label: t("platformUi.statTeachers"), value: usage.teacher ?? school.usage.teachers, icon: "teachers" as const, tone: "blue" },
    { key: "admin", label: t("platformUi.statAdmins"), value: usage.admin ?? school.usage.admins, icon: "settings" as const, tone: "slate" },
    { key: "parent", label: t("platformUi.statParents"), value: usage.parent ?? school.usage.parents, icon: "users" as const, tone: "green" },
  ];

  const isSuspended = (detail?.school.status ?? school.status) === "SUSPENDED";
  const logoUrl = detail?.school.logoUrl ?? school.logoUrl ?? null;

  return createPortal(
    <>
      <button
        type="button"
        className="stu-drawer-backdrop plat-manage-backdrop"
        aria-label={t("common.close")}
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
                <p className="plat-manage-hero__eyebrow">{t("platformUi.detailTenant")}</p>
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
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>

          <div className="plat-manage-hero__meta">
            <div className="plat-join-chip">
              <span className="plat-join-chip__label">{t("platformUi.detailJoinCode")}</span>
              <code className="plat-join-chip__code">{school.joinCode}</code>
              <button
                type="button"
                className={`plat-join-chip__btn${copied ? " plat-join-chip__btn--done" : ""}`}
                onClick={() => void copyCode()}
              >
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <div className="plat-manage-chips">
              <span className={`plat-status plat-status--${status}`}>
                {tenantStatusLabel(detail?.school.status ?? school.status, t)}
              </span>
              {sub?.plan &&
              sub.plan !== (detail?.school.status ?? school.status) ? (
                <span className="plat-plan-badge">{sub.plan}</span>
              ) : null}
              {sub && !sub.isActive ? (
                <span className="plat-status plat-status--suspended">{t("platformUi.detailBillingOff")}</span>
              ) : null}
            </div>
          </div>

          <nav className="plat-manage-tabs" role="tablist" aria-label={t("platformUi.detailTabsAria")}>
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={tab === tabItem.id}
                className={`plat-manage-tab${tab === tabItem.id ? " plat-manage-tab--active" : ""}`}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.label}
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
                          <span>{t("platformUi.detailAnnouncements")}</span>
                        </div>
                      </div>
                      <div className="plat-manage-insight">
                        <DashIcon name="students" className="dash-icon--sm" />
                        <div>
                          <strong>{detail.usage.studentProfiles ?? 0}</strong>
                          <span>{t("platformUi.detailStudentProfiles")}</span>
                        </div>
                      </div>
                      <div className="plat-manage-insight">
                        <DashIcon name="calendar" className="dash-icon--sm" />
                        <div>
                          <strong>{formatDate(detail.school.createdAt, locale)}</strong>
                          <span>{t("platformUi.detailEnrolled")}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <section className="plat-manage-card">
                    <h3 className="plat-manage-card__title">{t("platformUi.detailSetupTitle")}</h3>
                    <div className={`plat-setup-bar${setupDone ? " plat-setup-bar--done" : ""}`}>
                      <div className="plat-setup-bar__fill" style={{ width: setupDone ? "100%" : "45%" }} />
                    </div>
                    <p className="plat-manage-card__hint">
                      {setupDone ? t("platformUi.detailSetupDone") : t("platformUi.detailSetupPending")}
                    </p>
                  </section>
                </>
              ) : null}

              {tab === "contact" ? (
                <section className="plat-manage-card">
                  <h3 className="plat-manage-card__title">{t("platformUi.detailContactTitle")}</h3>
                  <ul className="plat-contact-list">
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        @
                      </span>
                      <div>
                        <span className="plat-contact-item__label">{t("platformUi.detailEmail")}</span>
                        <span className="plat-contact-item__value">{email ?? "—"}</span>
                      </div>
                      {mailLink(email) ? (
                        <a href={mailLink(email)!} className="plat-contact-action">
                          {t("platformUi.detailEmailAction")}
                        </a>
                      ) : null}
                    </li>
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        ☎
                      </span>
                      <div>
                        <span className="plat-contact-item__label">{t("platformUi.detailPhone")}</span>
                        <span className="plat-contact-item__value">{phone ?? "—"}</span>
                      </div>
                      {telLink(phone) ? (
                        <a href={telLink(phone)!} className="plat-contact-action">
                          {t("platformUi.detailCall")}
                        </a>
                      ) : null}
                    </li>
                    <li className="plat-contact-item">
                      <span className="plat-contact-item__icon" aria-hidden>
                        ⌖
                      </span>
                      <div>
                        <span className="plat-contact-item__label">{t("platformUi.detailCountry")}</span>
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
                      <p className="plat-billing-hero__label">{t("platformUi.detailCurrentPlan")}</p>
                      <p className="plat-billing-hero__plan">
                        {sub?.plan ? planOptionLabel(sub.plan as PlanType, t) : t("platformUi.planNone")}
                      </p>
                    </div>
                    <span
                      className={`plat-status plat-status--${sub?.isActive ? "active" : "suspended"}`}
                    >
                      {sub?.isActive ? t("platformUi.detailBillingActive") : t("platformUi.detailBillingInactive")}
                    </span>
                  </div>
                  <dl className="plat-billing-facts">
                    <div>
                      <dt>{t("platformUi.detailTrialEnds")}</dt>
                      <dd>{formatDate(sub?.trialEndsAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t("platformUi.detailAccessStatus")}</dt>
                      <dd>{tenantStatusLabel(detail?.school.status ?? school.status, t)}</dd>
                    </div>
                    <div>
                      <dt>{t("platformUi.detailCreated")}</dt>
                      <dd>{formatDate(detail?.school.createdAt ?? school.createdAt, locale)}</dd>
                    </div>
                  </dl>
                  <div className="plat-school-plan-form">
                    <h3 className="plat-manage-card__title">{t("platformUi.detailAssignPlan")}</h3>
                    <p className="plat-manage-card__hint">{t("platformUi.detailAssignHint")}</p>
                    <label className="plat-field">
                      <span>{t("platformUi.invoicesPlan")}</span>
                      <select
                        className="plat-select"
                        value={planDraft}
                        onChange={(e) => setPlanDraft(e.target.value as PlanType)}
                      >
                        {PLAN_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {planOptionLabel(value, t)}
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
                      {t("platformUi.detailBillingActiveCheck")}
                    </label>
                    <button
                      type="button"
                      className="plat-btn plat-btn--primary plat-btn--block"
                      disabled={planSaving || loading}
                      onClick={() => void savePlan()}
                    >
                      {planSaving ? t("common.saving") : t("platformUi.detailSavePlanTenant")}
                    </button>
                    {planMessage ? <p className="plat-plans__ok">{planMessage}</p> : null}
                  </div>
                </section>
              ) : null}

              {tab === "access" ? (
                <section className="plat-manage-card">
                  <h3 className="plat-manage-card__title">{t("platformUi.detailAccessTitle")}</h3>
                  <p className="plat-manage-card__hint">{t("platformUi.detailAccessHint")}</p>
                  <div className={`plat-access-state${isSuspended ? " plat-access-state--off" : ""}`}>
                    <DashIcon name={isSuspended ? "alert" : "attendance"} className="dash-icon--sm" />
                    <div>
                      <strong>
                        {isSuspended ? t("platformUi.detailSuspended") : t("platformUi.detailOperational")}
                      </strong>
                      <span>
                        {isSuspended ? t("platformUi.detailSuspendedHint") : t("platformUi.detailOperationalHint")}
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
                          {t("platformUi.detailActivateTenant")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="plat-btn plat-btn--danger plat-btn--block"
                          disabled={busy}
                          onClick={() => void patchStatus("SUSPENDED")}
                        >
                          {t("platformUi.detailSuspendTenant")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="plat-manage-card__hint">{t("platformUi.detailNoAccessPerm")}</p>
                  )}
                  {canDelete ? (
                    <div className="plat-tenant-remove">
                      <h4>{t("platformUi.detailRemoveTitle")}</h4>
                      <p>{t("platformUi.detailRemoveBody", { name: school.name })}</p>
                      <label className="plat-field">
                        <span>{t("platformUi.detailConfirmName")}</span>
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
                        {deleting ? t("platformUi.detailRemoving") : t("platformUi.detailRemoveBtn")}
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
              {t("platformUi.detailAccessControls")}
            </button>
            {!isSuspended ? (
              <button
                type="button"
                className="plat-btn plat-btn--danger"
                disabled={busy || loading}
                onClick={() => void patchStatus("SUSPENDED")}
              >
                {t("platformUi.detailSuspend")}
              </button>
            ) : (
              <button
                type="button"
                className="plat-btn plat-btn--primary"
                disabled={busy || loading}
                onClick={() => void patchStatus("ACTIVE")}
              >
                {t("platformUi.detailActivate")}
              </button>
            )}
          </footer>
        ) : null}
      </aside>
    </>,
    document.body,
  );
}
