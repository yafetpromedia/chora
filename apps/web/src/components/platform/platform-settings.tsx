"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import {
  handlePlatformAuthFailure,
  type PlatformUser,
} from "@/lib/platform-auth";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings as SettingsRow,
} from "@/lib/platform-settings";
import type { BillingCurrency } from "@/lib/platform-billing";
import type { PlatformSection } from "./platform-types";
import { AppToast } from "@/components/ui/app-toast";
import { LandingHeroUpload } from "@/components/platform/landing-hero-upload";
import { BRAND_NAME } from "@/lib/brand";
import { SOCIAL_LINK_DEFS } from "@/lib/social-links";

type Props = {
  user: PlatformUser | null;
  onOpenProfile?: () => void;
  onNavigate?: (section: PlatformSection) => void;
};

type Tab = "general" | "onboarding" | "billing" | "communications" | "operations";

const TABS: { id: Tab; label: string; icon: DashIconName }[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "onboarding", label: "Onboarding", icon: "plus" },
  { id: "billing", label: "Billing", icon: "finance" },
  { id: "communications", label: "Communications", icon: "mail" },
  { id: "operations", label: "Operations", icon: "alert" },
];

const TIMEZONES = [
  "Africa/Addis_Ababa",
  "Africa/Nairobi",
  "UTC",
  "Europe/London",
  "America/New_York",
];

const SHORTCUTS: {
  href: string;
  label: string;
  desc: string;
  icon: DashIconName;
}[] = [
  { href: "/", label: "Public site", desc: "Marketing & school registration", icon: "overview" },
  { href: "/login", label: "School login", desc: "Staff, teachers, families", icon: "students" },
  { href: "/register", label: "Register school", desc: "Self-serve tenant signup", icon: "plus" },
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

function applySettings(s: SettingsRow) {
  return {
    platformName: s.platformName,
    supportEmail: s.supportEmail ?? "",
    supportPhone: s.supportPhone ?? "",
    defaultCountry: s.defaultCountry,
    defaultTimezone: s.defaultTimezone,
    allowSelfRegistration: s.allowSelfRegistration,
    requireAdminApproval: s.requireAdminApproval,
    defaultTrialDays: String(s.defaultTrialDays),
    welcomeMessage: s.welcomeMessage ?? "",
    defaultBillingCurrency: s.defaultBillingCurrency,
    invoicePrefix: s.invoicePrefix,
    invoiceGraceDays: String(s.invoiceGraceDays),
    autoSuspendOverdue: s.autoSuspendOverdue,
    emailFromName: s.emailFromName ?? "",
    emailReplyTo: s.emailReplyTo ?? "",
    smsSenderName: s.smsSenderName ?? "",
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage ?? "",
    sessionTimeoutMinutes: String(s.sessionTimeoutMinutes),
    landingHeroImageUrl: s.landingHeroImageUrl ?? "",
    bankName: s.bankName ?? "",
    bankAccountHolder: s.bankAccountHolder ?? "",
    bankAccountNumber: s.bankAccountNumber ?? "",
    telebirrNumber: s.telebirrNumber ?? "",
    telebirrAccountName: s.telebirrAccountName ?? "",
    payoutInstructions: s.payoutInstructions ?? "",
    socialInstagramUrl: s.socialInstagramUrl ?? "",
    socialFacebookUrl: s.socialFacebookUrl ?? "",
    socialLinkedinUrl: s.socialLinkedinUrl ?? "",
    socialYoutubeUrl: s.socialYoutubeUrl ?? "",
    socialTiktokUrl: s.socialTiktokUrl ?? "",
    socialGithubUrl: s.socialGithubUrl ?? "",
  };
}

type Draft = ReturnType<typeof applySettings>;

export function PlatformSettings({ user, onOpenProfile, onNavigate }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = user?.role === "OWNER";
  const apiUrl = getApiUrl();

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    const row = await getPlatformSettings();
    setSettings(row);
    setDraft(applySettings(row));
  }, []);

  useEffect(() => {
    void load()
      .catch((err) => fail(err, "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [load, router]);

  const heroStats = useMemo(() => {
    if (!settings) return { reg: "—", trial: "—", maint: "—" };
    return {
      reg: settings.allowSelfRegistration ? "Open" : "Closed",
      trial: `${settings.defaultTrialDays}d`,
      maint: settings.maintenanceMode ? "On" : "Off",
    };
  }, [settings]);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!draft || !isOwner) return;
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updatePlatformSettings({
        platformName: draft.platformName.trim(),
        supportEmail: draft.supportEmail.trim(),
        supportPhone: draft.supportPhone.trim(),
        defaultCountry: draft.defaultCountry.trim(),
        defaultTimezone: draft.defaultTimezone,
        allowSelfRegistration: draft.allowSelfRegistration,
        requireAdminApproval: draft.requireAdminApproval,
        defaultTrialDays: Number(draft.defaultTrialDays) || 14,
        welcomeMessage: draft.welcomeMessage.trim(),
        defaultBillingCurrency: draft.defaultBillingCurrency,
        invoicePrefix: draft.invoicePrefix.trim(),
        invoiceGraceDays: Number(draft.invoiceGraceDays) || 14,
        autoSuspendOverdue: draft.autoSuspendOverdue,
        emailFromName: draft.emailFromName.trim(),
        emailReplyTo: draft.emailReplyTo.trim(),
        smsSenderName: draft.smsSenderName.trim(),
        maintenanceMode: draft.maintenanceMode,
        maintenanceMessage: draft.maintenanceMessage.trim(),
        sessionTimeoutMinutes: Number(draft.sessionTimeoutMinutes) || 60,
        landingHeroImageUrl: draft.landingHeroImageUrl.trim(),
        bankName: draft.bankName.trim(),
        bankAccountHolder: draft.bankAccountHolder.trim(),
        bankAccountNumber: draft.bankAccountNumber.trim(),
        telebirrNumber: draft.telebirrNumber.trim(),
        telebirrAccountName: draft.telebirrAccountName.trim(),
        payoutInstructions: draft.payoutInstructions.trim(),
        socialInstagramUrl: draft.socialInstagramUrl.trim(),
        socialFacebookUrl: draft.socialFacebookUrl.trim(),
        socialLinkedinUrl: draft.socialLinkedinUrl.trim(),
        socialYoutubeUrl: draft.socialYoutubeUrl.trim(),
        socialTiktokUrl: draft.socialTiktokUrl.trim(),
        socialGithubUrl: draft.socialGithubUrl.trim(),
      });
      setSettings(updated);
      setDraft(applySettings(updated));
      setToast("Platform settings saved.");
    } catch (err) {
      fail(err, "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function copyApiUrl() {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="plat-subjects-v2 plat-settings-v2">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <div className="plat-subjects-v2__empty" style={{ padding: "2rem 1.25rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>Couldn’t load platform settings</p>
          <p style={{ margin: "0.5rem 0 1rem", color: "#64748b", fontSize: "0.9rem" }}>
            {error || "The settings API failed. Check that the database is up to date, then retry."}
          </p>
          <button
            type="button"
            className="cfg-btn"
            onClick={() => {
              setLoading(true);
              setError("");
              void load()
                .catch((err) => fail(err, "Failed to load settings"))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-settings-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="settings" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Configuration</p>
            <h2 className="plat-subjects-v2__title">Platform settings</h2>
            <p className="plat-subjects-v2__sub">
              Global defaults for onboarding, billing, communications, and operations.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{draft.platformName}</strong>
            <span>Brand</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{heroStats.reg}</strong>
            <span>Registration</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{heroStats.maint}</strong>
            <span>Maintenance</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <div>
            <strong>{heroStats.trial}</strong>
            <span>Default trial</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="fees" className="dash-icon--sm" />
          <div>
            <strong>{draft.invoicePrefix}</strong>
            <span>Invoice prefix</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{draft.defaultBillingCurrency}</strong>
            <span>Default currency</span>
          </div>
        </article>
      </div>

      {!isOwner ? (
        <p className="plat-settings-v2__readonly">
          You can view settings. Only <strong>OWNER</strong> operators can save changes.
        </p>
      ) : null}

      <div className="set-v2__toolbar">
        <nav className="set-v2__tabs" aria-label="Settings sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`set-v2__tab${tab === item.id ? " set-v2__tab--active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <DashIcon name={item.icon} className="dash-icon--sm" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <form className="set-v2" onSubmit={(e) => void onSave(e)}>
        {tab === "general" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon" aria-hidden>
                <DashIcon name="settings" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">General</h2>
                <p className="set-v2__panel-sub">
                  Platform identity and support contact shown across the console and emails.
                </p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-field">
                <label htmlFor="ps-name">Platform name</label>
                <input
                  id="ps-name"
                  value={draft.platformName}
                  onChange={(e) => patch("platformName", e.target.value)}
                  disabled={!isOwner}
                  required
                />
              </div>
              <LandingHeroUpload
                value={draft.landingHeroImageUrl}
                onChange={(url) => patch("landingHeroImageUrl", url)}
                disabled={!isOwner}
              />
              <div className="cfg-field">
                <label>Social media links</label>
                <p className="set-v2__panel-sub" style={{ margin: "0 0 0.75rem" }}>
                  Shown in the public site footer. Leave a field empty to hide that icon.
                </p>
                <div className="plat-settings-social">
                  {SOCIAL_LINK_DEFS.map((item) => (
                    <div key={item.field} className="plat-settings-social__row">
                      <span className="plat-settings-social__label">{item.label}</span>
                      <input
                        id={`ps-${item.field}`}
                        type="url"
                        value={draft[item.field]}
                        onChange={(e) => patch(item.field, e.target.value)}
                        disabled={!isOwner}
                        placeholder={item.placeholder}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-email">Support email</label>
                  <input
                    id="ps-email"
                    type="email"
                    value={draft.supportEmail}
                    onChange={(e) => patch("supportEmail", e.target.value)}
                    disabled={!isOwner}
                    placeholder="support@chora.et"
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-phone">Support phone</label>
                  <input
                    id="ps-phone"
                    value={draft.supportPhone}
                    onChange={(e) => patch("supportPhone", e.target.value)}
                    disabled={!isOwner}
                    placeholder="+251…"
                  />
                </div>
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-country">Default country</label>
                  <input
                    id="ps-country"
                    value={draft.defaultCountry}
                    onChange={(e) => patch("defaultCountry", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-tz">Default timezone</label>
                  <select
                    id="ps-tz"
                    value={draft.defaultTimezone}
                    onChange={(e) => patch("defaultTimezone", e.target.value)}
                    disabled={!isOwner}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "onboarding" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon set-v2__panel-icon--access" aria-hidden>
                <DashIcon name="plus" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">School onboarding</h2>
                <p className="set-v2__panel-sub">
                  Controls self-service registration at <Link href="/register">/register</Link> and
                  default trial length for new tenants.
                </p>
              </div>
            </div>
            <div className="plat-settings-v2__toggles">
              <label className="plat-settings-v2__toggle">
                <input
                  type="checkbox"
                  checked={draft.allowSelfRegistration}
                  onChange={(e) => patch("allowSelfRegistration", e.target.checked)}
                  disabled={!isOwner}
                />
                <span>
                  <strong>Allow self-registration</strong>
                  <small>Schools can sign up without platform operator approval</small>
                </span>
              </label>
              <label className="plat-settings-v2__toggle">
                <input
                  type="checkbox"
                  checked={draft.requireAdminApproval}
                  onChange={(e) => patch("requireAdminApproval", e.target.checked)}
                  disabled={!isOwner}
                />
                <span>
                  <strong>Require admin approval</strong>
                  <small>New tenants stay pending until a platform operator activates them</small>
                </span>
              </label>
            </div>
            <div className="cfg-form" style={{ marginTop: "1rem" }}>
              <div className="cfg-field">
                <label htmlFor="ps-trial">Default trial length (days)</label>
                <input
                  id="ps-trial"
                  type="number"
                  min={1}
                  max={90}
                  value={draft.defaultTrialDays}
                  onChange={(e) => patch("defaultTrialDays", e.target.value)}
                  disabled={!isOwner}
                />
                <p className="cfg-hint">Also updates the Trial plan in the plan catalog.</p>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-welcome">Welcome message</label>
                <textarea
                  id="ps-welcome"
                  rows={4}
                  value={draft.welcomeMessage}
                  onChange={(e) => patch("welcomeMessage", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Shown on the registration page…"
                />
              </div>
            </div>
          </section>
        ) : null}

        {tab === "billing" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon set-v2__panel-icon--plan" aria-hidden>
                <DashIcon name="finance" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">Billing defaults</h2>
                <p className="set-v2__panel-sub">
                  Invoice numbering, currency, and overdue handling for platform billing.
                </p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-currency">Default invoice currency</label>
                  <select
                    id="ps-currency"
                    value={draft.defaultBillingCurrency}
                    onChange={(e) =>
                      patch("defaultBillingCurrency", e.target.value as BillingCurrency)
                    }
                    disabled={!isOwner}
                  >
                    <option value="USD">USD</option>
                    <option value="ETB">ETB</option>
                  </select>
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-prefix">Invoice prefix</label>
                  <input
                    id="ps-prefix"
                    value={draft.invoicePrefix}
                    onChange={(e) => patch("invoicePrefix", e.target.value.toUpperCase())}
                    disabled={!isOwner}
                    maxLength={12}
                    placeholder="INV"
                  />
                  <p className="cfg-hint">e.g. {draft.invoicePrefix}-2026-00001</p>
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-grace">Invoice grace period (days)</label>
                <input
                  id="ps-grace"
                  type="number"
                  min={1}
                  max={60}
                  value={draft.invoiceGraceDays}
                  onChange={(e) => patch("invoiceGraceDays", e.target.value)}
                  disabled={!isOwner}
                />
              </div>
              <label className="plat-settings-v2__toggle">
                <input
                  type="checkbox"
                  checked={draft.autoSuspendOverdue}
                  onChange={(e) => patch("autoSuspendOverdue", e.target.checked)}
                  disabled={!isOwner}
                />
                <span>
                  <strong>Auto-suspend overdue schools</strong>
                  <small>Suspend tenant access when invoices pass due date (coming soon)</small>
                </span>
              </label>
              <h3 className="set-v2__subhead" style={{ marginTop: "1.25rem" }}>
                Where schools pay you
              </h3>
              <p className="set-v2__panel-sub" style={{ marginBottom: "0.85rem" }}>
                Schools send subscription payments here after they request an invoice. This is
                your CampusOne account, not the school’s fee account.
              </p>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-telebirr">Telebirr number</label>
                  <input
                    id="ps-telebirr"
                    value={draft.telebirrNumber}
                    onChange={(e) => patch("telebirrNumber", e.target.value)}
                    disabled={!isOwner}
                    placeholder="0911…"
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-telebirr-name">Telebirr account name</label>
                  <input
                    id="ps-telebirr-name"
                    value={draft.telebirrAccountName}
                    onChange={(e) => patch("telebirrAccountName", e.target.value)}
                    disabled={!isOwner}
                    placeholder="CampusOne / your business name"
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-bank">Bank name</label>
                <input
                  id="ps-bank"
                  value={draft.bankName}
                  onChange={(e) => patch("bankName", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Commercial Bank of Ethiopia"
                />
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-acc-name">Account holder</label>
                  <input
                    id="ps-acc-name"
                    value={draft.bankAccountHolder}
                    onChange={(e) => patch("bankAccountHolder", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-acc-num">Account number</label>
                  <input
                    id="ps-acc-num"
                    value={draft.bankAccountNumber}
                    onChange={(e) => patch("bankAccountNumber", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-payout-note">Payment instructions</label>
                <textarea
                  id="ps-payout-note"
                  rows={3}
                  value={draft.payoutInstructions}
                  onChange={(e) => patch("payoutInstructions", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Include the invoice number in the Telebirr remark or bank reference…"
                />
              </div>
            </div>
            {onNavigate ? (
              <button
                type="button"
                className="plat-btn plat-btn--ghost plat-btn--sm"
                style={{ marginTop: "0.75rem" }}
                onClick={() => onNavigate("plans")}
              >
                Edit plan prices & limits →
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "communications" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon" aria-hidden>
                <DashIcon name="mail" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">Communications</h2>
                <p className="set-v2__panel-sub">
                  Default sender details for platform emails and SMS templates.
                </p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-field">
                <label htmlFor="ps-from">Email from name</label>
                <input
                  id="ps-from"
                  value={draft.emailFromName}
                  onChange={(e) => patch("emailFromName", e.target.value)}
                  disabled={!isOwner}
                  placeholder={BRAND_NAME}
                />
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-reply">Reply-to email</label>
                <input
                  id="ps-reply"
                  type="email"
                  value={draft.emailReplyTo}
                  onChange={(e) => patch("emailReplyTo", e.target.value)}
                  disabled={!isOwner}
                  placeholder="support@chora.et"
                />
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-sms">SMS sender name</label>
                <input
                  id="ps-sms"
                  value={draft.smsSenderName}
                  onChange={(e) => patch("smsSenderName", e.target.value)}
                  disabled={!isOwner}
                  placeholder={BRAND_NAME}
                  maxLength={32}
                />
              </div>
            </div>
            {onNavigate ? (
              <button
                type="button"
                className="plat-btn plat-btn--ghost plat-btn--sm"
                style={{ marginTop: "0.75rem" }}
                onClick={() => onNavigate("messages")}
              >
                Edit message templates →
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "operations" ? (
          <div className="set-v2__stack">
            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--attendance" aria-hidden>
                  <DashIcon name="alert" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">Maintenance mode</h2>
                  <p className="set-v2__panel-sub">
                    Blocks new school registration while keeping existing tenants online.
                  </p>
                </div>
              </div>
              <label className="plat-settings-v2__toggle plat-settings-v2__toggle--warn">
                <input
                  type="checkbox"
                  checked={draft.maintenanceMode}
                  onChange={(e) => patch("maintenanceMode", e.target.checked)}
                  disabled={!isOwner}
                />
                <span>
                  <strong>Maintenance mode enabled</strong>
                  <small>Registration page shows your message below</small>
                </span>
              </label>
              <div className="cfg-field" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="ps-maint-msg">Maintenance message</label>
                <textarea
                  id="ps-maint-msg"
                  rows={3}
                  value={draft.maintenanceMessage}
                  onChange={(e) => patch("maintenanceMessage", e.target.value)}
                  disabled={!isOwner}
                  placeholder="We are performing scheduled maintenance…"
                />
              </div>
            </section>

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon" aria-hidden>
                  <DashIcon name="users" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">Security & session</h2>
                  <p className="set-v2__panel-sub">
                    Platform JWT session length and operator account shortcuts.
                  </p>
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-session">Session timeout (minutes)</label>
                <input
                  id="ps-session"
                  type="number"
                  min={15}
                  max={480}
                  value={draft.sessionTimeoutMinutes}
                  onChange={(e) => patch("sessionTimeoutMinutes", e.target.value)}
                  disabled={!isOwner}
                />
                <p className="cfg-hint">
                  Applies to platform console sessions. School sessions use separate JWT config.
                </p>
              </div>
              <div className="plat-settings-v2__account-row">
                {user ? (
                  <p>
                    Signed in as <strong>{user.firstName} {user.lastName}</strong> ·{" "}
                    <span className="plat-role-badge">{user.role}</span>
                  </p>
                ) : null}
                {onOpenProfile ? (
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--sm"
                    onClick={onOpenProfile}
                  >
                    Open profile
                  </button>
                ) : null}
              </div>
            </section>

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon" aria-hidden>
                  <DashIcon name="settings" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">API environment</h2>
                  <p className="set-v2__panel-sub">Backend URL used by this web console.</p>
                </div>
              </div>
              <div className="set-v2__code-box">
                <code className="set-v2__code">{apiUrl}</code>
                <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => void copyApiUrl()}>
                  {copied ? "Copied!" : "Copy URL"}
                </button>
              </div>
              <p className="cfg-hint" style={{ marginTop: "0.65rem" }}>
                Set via <code>NEXT_PUBLIC_API_URL</code> in <code>apps/web/.env.local</code>
              </p>
            </section>

            <section className="set-v2__panel">
              <h2 className="set-v2__panel-title">Quick links</h2>
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
          </div>
        ) : null}

        {isOwner ? (
          <div className="plat-settings-v2__save-bar">
            <p className="plat-settings-v2__save-hint">
              Last saved{" "}
              {settings
                ? new Date(settings.updatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
            <button type="submit" className="plat-v2__btn plat-v2__btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
