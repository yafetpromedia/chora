"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  handlePlatformAuthFailure,
  type PlatformUser,
} from "@/lib/platform-auth";
import {
  getPlatformSettings,
  testPlatformAiConnection,
  updatePlatformSettings,
  type AiProviderId,
  type PlatformSettings as SettingsRow,
} from "@/lib/platform-settings";
import type { BillingCurrency } from "@/lib/platform-billing";
import type { PlatformSection } from "./platform-types";
import { AppToast } from "@/components/ui/app-toast";
import { DemoVideoSettings } from "@/components/platform/demo-video-settings";
import { LandingHeroUpload } from "@/components/platform/landing-hero-upload";
import { ProductDocsSettings } from "@/components/platform/product-docs-settings";
import { BRAND_NAME } from "@/lib/brand";
import { SOCIAL_LINK_DEFS } from "@/lib/social-links";

type Props = {
  user: PlatformUser | null;
  onOpenProfile?: () => void;
  onNavigate?: (section: PlatformSection) => void;
};

type Tab =
  | "general"
  | "onboarding"
  | "billing"
  | "communications"
  | "ai"
  | "operations";

function settingsTabs(t: (key: string) => string): { id: Tab; label: string; icon: DashIconName }[] {
  return [
    { id: "general", label: t("platformUi.settingsTabGeneral"), icon: "settings" },
    { id: "onboarding", label: t("platformUi.settingsTabOnboarding"), icon: "plus" },
    { id: "billing", label: t("platformUi.settingsTabBilling"), icon: "finance" },
    { id: "communications", label: t("platformUi.settingsTabComms"), icon: "mail" },
    { id: "ai", label: t("platformUi.settingsTabAi"), icon: "flask" },
    { id: "operations", label: t("platformUi.settingsTabOps"), icon: "alert" },
  ];
}

const AI_MODELS: Record<
  AiProviderId,
  { id: string; label: string; note?: string }[]
> = {
  gemini: [
    { id: "gemini-3.8-flash", label: "3.8 Flash", note: "Recommended · Google default" },
    { id: "gemini-3.1-flash-lite", label: "3.1 Flash-Lite", note: "Lighter / cheaper" },
    { id: "gemini-2.5-flash", label: "2.5 Flash", note: "Legacy · may 404" },
    { id: "gemini-2.5-pro", label: "2.5 Pro", note: "Legacy · often 404" },
    { id: "gemini-2.0-flash", label: "2.0 Flash", note: "Retired for new keys" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o mini", note: "Cheap & fast" },
    { id: "gpt-4o", label: "GPT-4o", note: "Higher quality" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  ],
  freemodel: [
    { id: "claude-t0", label: "claude-t0" },
    { id: "gpt-4o-mini", label: "gpt-4o-mini" },
  ],
};

const AI_PROVIDERS: { id: AiProviderId; label: string; hint: string; defaultModel: string }[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    hint: "Uses Google’s native Gemini API. Get a key from Google AI Studio. Leave Base URL blank.",
    defaultModel: "gemini-3.8-flash",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "Official OpenAI Chat Completions API.",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "freemodel",
    label: "FreeModel",
    hint: "OpenAI-compatible gateway (freemodel.dev).",
    defaultModel: "claude-t0",
  },
];

const TIMEZONES = [
  "Africa/Addis_Ababa",
  "Africa/Nairobi",
  "UTC",
  "Europe/London",
  "America/New_York",
];

function settingsShortcuts(t: (key: string) => string) {
  return [
    {
      href: "/",
      label: t("platformUi.settingsShortcutPublic"),
      desc: t("platformUi.settingsShortcutPublicDesc"),
      icon: "overview" as const,
    },
    {
      href: "/login",
      label: t("platformUi.settingsShortcutLogin"),
      desc: t("platformUi.settingsShortcutLoginDesc"),
      icon: "students" as const,
    },
    {
      href: "/register",
      label: t("platformUi.settingsShortcutRegister"),
      desc: t("platformUi.settingsShortcutRegisterDesc"),
      icon: "plus" as const,
    },
  ];
}

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
    demoVideoUrl: s.demoVideoUrl ?? "",
    demoVideoThumbnailUrl: s.demoVideoThumbnailUrl ?? "",
    productDocsUrl: s.productDocsUrl ?? "",
    productDocsThumbnailUrl: s.productDocsThumbnailUrl ?? "",
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
    aiEnabled: Boolean(s.aiEnabled),
    aiProvider: (s.aiProvider as AiProviderId) || "gemini",
    aiApiKey: "",
    aiModel: s.aiModel ?? "",
    aiBaseUrl: s.aiBaseUrl ?? "",
    aiConfigured: Boolean(s.aiConfigured),
    aiApiKeyMasked: s.aiApiKeyMasked ?? "",
  };
}

type Draft = ReturnType<typeof applySettings>;

export function PlatformSettings({ user, onOpenProfile, onNavigate }: Props) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const TABS = settingsTabs(t);
  const SHORTCUTS = settingsShortcuts(t);
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
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
    queueMicrotask(() => {
      void load()
        .catch((err) => fail(err, t("platformUi.errLoadSettings")))
        .finally(() => setLoading(false));
    });
  }, [load, router]);

  const heroStats = useMemo(() => {
    if (!settings) return { reg: "—", trial: "—", maint: "—" };
    return {
      reg: settings.allowSelfRegistration ? t("platformUi.settingsRegOpen") : t("platformUi.settingsRegClosed"),
      trial: `${settings.defaultTrialDays}d`,
      maint: settings.maintenanceMode ? t("platformUi.settingsMaintOn") : t("platformUi.settingsMaintOff"),
    };
  }, [settings, t]);

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
        demoVideoUrl: draft.demoVideoUrl.trim(),
        demoVideoThumbnailUrl: draft.demoVideoThumbnailUrl.trim(),
        productDocsUrl: draft.productDocsUrl.trim(),
        productDocsThumbnailUrl: draft.productDocsThumbnailUrl.trim(),
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
        aiEnabled: draft.aiEnabled,
        aiProvider: draft.aiProvider,
        aiModel: draft.aiModel.trim(),
        aiBaseUrl: draft.aiBaseUrl.trim(),
        ...(draft.aiApiKey.trim()
          ? { aiApiKey: draft.aiApiKey.trim() }
          : {}),
      });
      setSettings(updated);
      setDraft(applySettings(updated));
      setToast(t("platformUi.settingsSaved"));
    } catch (err) {
      fail(err, t("platformUi.settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onClearAiKey() {
    if (!isOwner) return;
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updatePlatformSettings({ aiApiKey: null });
      setSettings(updated);
      setDraft(applySettings(updated));
      setToast(t("platformUi.settingsAiKeyRemoved"));
    } catch (err) {
      fail(err, t("platformUi.settingsAiKeyCleared"));
    } finally {
      setSaving(false);
    }
  }

  async function onTestAi() {
    if (!isOwner || !draft) return;
    const key = draft.aiApiKey.trim();
    if (!key && !draft.aiConfigured) {
      setError(t("platformUi.settingsAiPasteTest"));
      return;
    }
    setTestingAi(true);
    setError("");
    setToast(null);
    try {
      // Send current chip/dropdown selection even when key field is blank.
      const result = await testPlatformAiConnection({
        aiProvider: draft.aiProvider,
        aiModel: draft.aiModel.trim() || undefined,
        aiBaseUrl: draft.aiBaseUrl.trim(),
        ...(key ? { aiApiKey: key } : {}),
      });
      setToast(
        t("platformUi.settingsAiTestOk", {
          provider: result.provider,
          model: result.model,
          reply: result.reply ? ` · “${result.reply.slice(0, 80)}”` : "",
        }),
      );
    } catch (err) {
      fail(err, t("platformUi.settingsAiTestFail"));
    } finally {
      setTestingAi(false);
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
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
            {t("platformUi.settingsLoadFailTitle")}
          </p>
          <p style={{ margin: "0.5rem 0 1rem", color: "#64748b", fontSize: "0.9rem" }}>
            {error || t("platformUi.settingsLoadFailSub")}
          </p>
          <button
            type="button"
            className="cfg-btn"
            onClick={() => {
              setLoading(true);
              setError("");
              void load()
                .catch((err) => fail(err, t("platformUi.errLoadSettings")))
                .finally(() => setLoading(false));
            }}
          >
            {t("common.retry")}
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
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.settingsEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.settingsTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.settingsSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{draft.platformName}</strong>
            <span>{t("platformUi.settingsStatBrand")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{heroStats.reg}</strong>
            <span>{t("platformUi.settingsStatRegistration")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{heroStats.maint}</strong>
            <span>{t("platformUi.settingsStatMaintenance")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <div>
            <strong>{heroStats.trial}</strong>
            <span>{t("platformUi.settingsKpiTrial")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="fees" className="dash-icon--sm" />
          <div>
            <strong>{draft.invoicePrefix}</strong>
            <span>{t("platformUi.settingsKpiPrefix")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{draft.defaultBillingCurrency}</strong>
            <span>{t("platformUi.settingsKpiCurrency")}</span>
          </div>
        </article>
      </div>

      {!isOwner ? (
        <p className="plat-settings-v2__readonly">{t("platformUi.settingsReadonly")}</p>
      ) : null}

      <div className="set-v2__toolbar">
        <nav className="set-v2__tabs" aria-label={t("platformUi.settingsSectionsAria")}>
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
                <h2 className="set-v2__panel-title">{t("platformUi.settingsGeneralTitle")}</h2>
                <p className="set-v2__panel-sub">{t("platformUi.settingsGeneralSub")}</p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-field">
                <label htmlFor="ps-name">{t("platformUi.settingsPlatformName")}</label>
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
              <DemoVideoSettings
                videoUrl={draft.demoVideoUrl}
                thumbnailUrl={draft.demoVideoThumbnailUrl}
                onVideoUrlChange={(url) => patch("demoVideoUrl", url)}
                onThumbnailUrlChange={(url) => patch("demoVideoThumbnailUrl", url)}
                onUploaded={(updated) => {
                  setSettings(updated);
                  setDraft(applySettings(updated));
                  setToast(t("platformUi.settingsDemoVideoSaved"));
                }}
                disabled={!isOwner}
              />
              <ProductDocsSettings
                docsUrl={draft.productDocsUrl}
                thumbnailUrl={draft.productDocsThumbnailUrl}
                onDocsUrlChange={(url) => patch("productDocsUrl", url)}
                onThumbnailUrlChange={(url) =>
                  patch("productDocsThumbnailUrl", url)
                }
                onUploaded={(updated) => {
                  setSettings(updated);
                  setDraft(applySettings(updated));
                  setToast(t("platformUi.settingsDocsSaved"));
                }}
                disabled={!isOwner}
              />
              <div className="cfg-field">
                <label>{t("platformUi.settingsSocialLinks")}</label>
                <p className="set-v2__panel-sub" style={{ margin: "0 0 0.75rem" }}>
                  {t("platformUi.settingsSocialSub")}
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
                  <label htmlFor="ps-email">{t("platformUi.settingsSupportEmail")}</label>
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
                  <label htmlFor="ps-phone">{t("platformUi.settingsSupportPhone")}</label>
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
                  <label htmlFor="ps-country">{t("platformUi.settingsDefaultCountry")}</label>
                  <input
                    id="ps-country"
                    value={draft.defaultCountry}
                    onChange={(e) => patch("defaultCountry", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-tz">{t("platformUi.settingsDefaultTz")}</label>
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
                <h2 className="set-v2__panel-title">{t("platformUi.settingsOnboardTitle")}</h2>
                <p className="set-v2__panel-sub">{t("platformUi.settingsOnboardSub")}</p>
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
                  <strong>{t("platformUi.settingsAllowSelfReg")}</strong>
                  <small>{t("platformUi.settingsAllowSelfRegHint")}</small>
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
                  <strong>{t("platformUi.settingsRequireApproval")}</strong>
                  <small>{t("platformUi.settingsRequireApprovalHint")}</small>
                </span>
              </label>
            </div>
            <div className="cfg-form" style={{ marginTop: "1rem" }}>
              <div className="cfg-field">
                <label htmlFor="ps-trial">{t("platformUi.settingsTrialDays")}</label>
                <input
                  id="ps-trial"
                  type="number"
                  min={1}
                  max={90}
                  value={draft.defaultTrialDays}
                  onChange={(e) => patch("defaultTrialDays", e.target.value)}
                  disabled={!isOwner}
                />
                <p className="cfg-hint">{t("platformUi.settingsTrialHint")}</p>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-welcome">{t("platformUi.settingsWelcome")}</label>
                <textarea
                  id="ps-welcome"
                  rows={4}
                  value={draft.welcomeMessage}
                  onChange={(e) => patch("welcomeMessage", e.target.value)}
                  disabled={!isOwner}
                  placeholder={t("platformUi.settingsWelcomePh")}
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
                <h2 className="set-v2__panel-title">{t("platformUi.settingsBillingTitle")}</h2>
                <p className="set-v2__panel-sub">{t("platformUi.settingsBillingSub")}</p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-currency">{t("platformUi.settingsDefaultCurrency")}</label>
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
                  <label htmlFor="ps-prefix">{t("platformUi.settingsInvoicePrefix")}</label>
                  <input
                    id="ps-prefix"
                    value={draft.invoicePrefix}
                    onChange={(e) => patch("invoicePrefix", e.target.value.toUpperCase())}
                    disabled={!isOwner}
                    maxLength={12}
                    placeholder="INV"
                  />
                  <p className="cfg-hint">
                    {t("platformUi.settingsInvoicePrefixHint", { prefix: draft.invoicePrefix })}
                  </p>
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-grace">{t("platformUi.settingsGraceDays")}</label>
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
                  <strong>{t("platformUi.settingsAutoSuspend")}</strong>
                  <small>{t("platformUi.settingsAutoSuspendHint")}</small>
                </span>
              </label>
              <h3 className="set-v2__subhead" style={{ marginTop: "1.25rem" }}>
                {t("platformUi.settingsPayoutTitle")}
              </h3>
              <p className="set-v2__panel-sub" style={{ marginBottom: "0.85rem" }}>
                {t("platformUi.settingsPayoutSub")}
              </p>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-telebirr">{t("platformUi.settingsTelebirr")}</label>
                  <input
                    id="ps-telebirr"
                    value={draft.telebirrNumber}
                    onChange={(e) => patch("telebirrNumber", e.target.value)}
                    disabled={!isOwner}
                    placeholder="0911…"
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-telebirr-name">{t("platformUi.settingsTelebirrName")}</label>
                  <input
                    id="ps-telebirr-name"
                    value={draft.telebirrAccountName}
                    onChange={(e) => patch("telebirrAccountName", e.target.value)}
                    disabled={!isOwner}
                    placeholder={t("platformUi.settingsTelebirrNamePh")}
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-bank">{t("platformUi.settingsBankName")}</label>
                <input
                  id="ps-bank"
                  value={draft.bankName}
                  onChange={(e) => patch("bankName", e.target.value)}
                  disabled={!isOwner}
                  placeholder={t("platformUi.settingsBankNamePh")}
                />
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="ps-acc-name">{t("platformUi.settingsAccHolder")}</label>
                  <input
                    id="ps-acc-name"
                    value={draft.bankAccountHolder}
                    onChange={(e) => patch("bankAccountHolder", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="ps-acc-num">{t("platformUi.settingsAccNumber")}</label>
                  <input
                    id="ps-acc-num"
                    value={draft.bankAccountNumber}
                    onChange={(e) => patch("bankAccountNumber", e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-payout-note">{t("platformUi.settingsPayoutNote")}</label>
                <textarea
                  id="ps-payout-note"
                  rows={3}
                  value={draft.payoutInstructions}
                  onChange={(e) => patch("payoutInstructions", e.target.value)}
                  disabled={!isOwner}
                  placeholder={t("platformUi.settingsPayoutNotePh")}
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
                {t("platformUi.settingsEditPlans")}
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
                <h2 className="set-v2__panel-title">{t("platformUi.settingsCommsTitle")}</h2>
                <p className="set-v2__panel-sub">{t("platformUi.settingsCommsSub")}</p>
              </div>
            </div>
            <div className="cfg-form">
              <div className="cfg-field">
                <label htmlFor="ps-from">{t("platformUi.settingsEmailFrom")}</label>
                <input
                  id="ps-from"
                  value={draft.emailFromName}
                  onChange={(e) => patch("emailFromName", e.target.value)}
                  disabled={!isOwner}
                  placeholder={BRAND_NAME}
                />
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-reply">{t("platformUi.settingsReplyTo")}</label>
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
                <label htmlFor="ps-sms">{t("platformUi.settingsSmsSender")}</label>
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
                {t("platformUi.settingsEditTemplates")}
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "ai" ? (
          <div className="set-v2__stack">
            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon" aria-hidden>
                  <DashIcon name="flask" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">{t("platformUi.settingsAiTitle")}</h2>
                  <p className="set-v2__panel-sub">{t("platformUi.settingsAiSub")}</p>
                </div>
              </div>

              <div
                className="plat-settings-v2__status"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "0.75rem",
                  background: draft.aiEnabled && draft.aiConfigured ? "#ecfdf5" : "#f8fafc",
                  border: `1px solid ${
                    draft.aiEnabled && draft.aiConfigured ? "#6ee7b7" : "#e2e8f0"
                  }`,
                }}
              >
                <strong style={{ display: "block", fontSize: "0.85rem", color: "#0f172a" }}>
                  {draft.aiEnabled && draft.aiConfigured
                    ? t("platformUi.settingsAiReady")
                    : draft.aiConfigured
                      ? t("platformUi.settingsAiKeySavedEnable")
                      : draft.aiApiKey.trim()
                        ? t("platformUi.settingsAiKeyEnterSave")
                        : t("platformUi.settingsAiNotConfigured")}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {draft.aiApiKeyMasked
                    ? t("platformUi.settingsAiSavedKey", { mask: draft.aiApiKeyMasked })
                    : draft.aiApiKey.trim()
                      ? t("platformUi.settingsAiSaveThenTest")
                      : t("platformUi.settingsAiPasteSave")}
                  {draft.aiModel
                    ? t("platformUi.settingsAiModelSuffix", { model: draft.aiModel })
                    : ""}
                </span>
              </div>

              <label className="plat-settings-v2__toggle">
                <input
                  type="checkbox"
                  checked={draft.aiEnabled}
                  onChange={(e) => patch("aiEnabled", e.target.checked)}
                  disabled={!isOwner}
                />
                <span>
                  <strong>{t("platformUi.settingsAiEnable")}</strong>
                  <small>{t("platformUi.settingsAiEnableHint")}</small>
                </span>
              </label>

              <div className="cfg-field" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="ps-ai-provider">{t("platformUi.settingsProvider")}</label>
                <select
                  id="ps-ai-provider"
                  value={draft.aiProvider}
                  onChange={(e) => {
                    const next = e.target.value as AiProviderId;
                    const preset = AI_PROVIDERS.find((p) => p.id === next);
                    patch("aiProvider", next);
                    if (!draft.aiModel.trim() && preset) {
                      patch("aiModel", preset.defaultModel);
                    }
                  }}
                  disabled={!isOwner}
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id === "gemini"
                        ? t("platformUi.settingsAiProviderGemini")
                        : p.id === "openai"
                          ? t("platformUi.settingsAiProviderOpenai")
                          : t("platformUi.settingsAiProviderFreemodel")}
                    </option>
                  ))}
                </select>
                <p className="cfg-hint">
                  {draft.aiProvider === "gemini"
                    ? t("platformUi.settingsAiHintGemini")
                    : draft.aiProvider === "openai"
                      ? t("platformUi.settingsAiHintOpenai")
                      : t("platformUi.settingsAiHintFreemodel")}
                </p>
              </div>

              <div className="cfg-field">
                <label htmlFor="ps-ai-key">{t("platformUi.settingsApiKey")}</label>
                <input
                  id="ps-ai-key"
                  type="password"
                  autoComplete="off"
                  value={draft.aiApiKey}
                  onChange={(e) => patch("aiApiKey", e.target.value)}
                  disabled={!isOwner}
                  placeholder={
                    draft.aiConfigured
                      ? t("platformUi.settingsApiKeyKeep")
                      : draft.aiProvider === "gemini"
                        ? t("platformUi.settingsApiKeyGeminiPh")
                        : t("platformUi.settingsApiKeyOpenaiPh")
                  }
                />
                <p className="cfg-hint">
                  {draft.aiProvider === "gemini" ? (
                    <>
                      {t("platformUi.settingsAiStudioLead")}{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("platformUi.settingsAiStudio")}
                      </a>
                      . {t("platformUi.settingsAiKeyNeverShown")}
                    </>
                  ) : (
                    t("platformUi.settingsAiKeyNeverShown")
                  )}
                </p>
              </div>

              <div className="cfg-field">
                <label htmlFor="ps-ai-model">{t("platformUi.settingsModel")}</label>
                <div
                  className="plat-ai-models"
                  role="group"
                  aria-label={t("platformUi.settingsModelGroupAria")}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.45rem",
                    marginBottom: "0.65rem",
                  }}
                >
                  {(AI_MODELS[draft.aiProvider] ?? []).map((m) => {
                    const active = draft.aiModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => patch("aiModel", m.id)}
                        className="plat-btn plat-btn--ghost plat-btn--sm"
                        style={{
                          borderColor: active ? "#147d76" : undefined,
                          background: active ? "#ecfdf5" : undefined,
                          color: active ? "#0f5f5a" : undefined,
                          fontWeight: active ? 800 : 600,
                        }}
                        title={m.note ? `${m.id} — ${m.note}` : m.id}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <select
                  id="ps-ai-model"
                  value={
                    (AI_MODELS[draft.aiProvider] ?? []).some((m) => m.id === draft.aiModel)
                      ? draft.aiModel
                      : "__custom__"
                  }
                  onChange={(e) => {
                    if (e.target.value === "__custom__") return;
                    patch("aiModel", e.target.value);
                  }}
                  disabled={!isOwner}
                >
                  {(AI_MODELS[draft.aiProvider] ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                      {m.note ? ` — ${m.note}` : ""}
                    </option>
                  ))}
                  <option value="__custom__">{t("platformUi.settingsCustomModel")}</option>
                </select>
                {!(AI_MODELS[draft.aiProvider] ?? []).some((m) => m.id === draft.aiModel) ? (
                  <input
                    style={{ marginTop: "0.5rem" }}
                    type="text"
                    value={draft.aiModel}
                    onChange={(e) => patch("aiModel", e.target.value)}
                    disabled={!isOwner}
                    placeholder="custom-model-id"
                    aria-label={t("platformUi.settingsCustomModelAria")}
                  />
                ) : null}
                <p className="cfg-hint">{t("platformUi.settingsModelHint")}</p>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-ai-base">{t("platformUi.settingsBaseUrl")}</label>
                <input
                  id="ps-ai-base"
                  type="url"
                  value={draft.aiBaseUrl}
                  onChange={(e) => patch("aiBaseUrl", e.target.value)}
                  disabled={!isOwner}
                  placeholder={
                    draft.aiProvider === "gemini"
                      ? t("platformUi.settingsBaseUrlGeminiPh")
                      : t("platformUi.settingsBaseUrlDefaultPh")
                  }
                />
                <p className="cfg-hint">
                  {draft.aiProvider === "gemini"
                    ? t("platformUi.settingsBaseUrlGeminiHint")
                    : t("platformUi.settingsBaseUrlHint")}
                </p>
              </div>

              {isOwner ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.6rem",
                    marginTop: "0.85rem",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="plat-v2__btn plat-v2__btn--primary"
                    disabled={testingAi || saving || (!draft.aiConfigured && !draft.aiApiKey.trim())}
                    onClick={() => void onTestAi()}
                  >
                    {testingAi ? t("platformUi.settingsTesting") : t("platformUi.settingsTestConnection")}
                  </button>
                  <button
                    type="submit"
                    className="plat-btn plat-btn--ghost plat-btn--sm"
                    disabled={saving}
                  >
                    {saving ? t("common.saving") : t("platformUi.settingsSaveModel")}
                  </button>
                  {draft.aiConfigured ? (
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--sm"
                      disabled={saving}
                      onClick={() => void onClearAiKey()}
                    >
                      {t("platformUi.settingsRemoveKey")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {tab === "operations" ? (
          <div className="set-v2__stack">
            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--attendance" aria-hidden>
                  <DashIcon name="alert" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">{t("platformUi.settingsMaintTitle")}</h2>
                  <p className="set-v2__panel-sub">{t("platformUi.settingsMaintSub")}</p>
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
                  <strong>{t("platformUi.settingsMaintEnable")}</strong>
                  <small>{t("platformUi.settingsMaintEnableHint")}</small>
                </span>
              </label>
              <div className="cfg-field" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="ps-maint-msg">{t("platformUi.settingsMaintMsg")}</label>
                <textarea
                  id="ps-maint-msg"
                  rows={3}
                  value={draft.maintenanceMessage}
                  onChange={(e) => patch("maintenanceMessage", e.target.value)}
                  disabled={!isOwner}
                  placeholder={t("platformUi.settingsMaintMsgPh")}
                />
              </div>
            </section>

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon" aria-hidden>
                  <DashIcon name="users" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">{t("platformUi.settingsSecurityTitle")}</h2>
                  <p className="set-v2__panel-sub">{t("platformUi.settingsSecuritySub")}</p>
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="ps-session">{t("platformUi.settingsSessionTimeout")}</label>
                <input
                  id="ps-session"
                  type="number"
                  min={15}
                  max={480}
                  value={draft.sessionTimeoutMinutes}
                  onChange={(e) => patch("sessionTimeoutMinutes", e.target.value)}
                  disabled={!isOwner}
                />
                <p className="cfg-hint">{t("platformUi.settingsSessionHint")}</p>
              </div>
              <div className="plat-settings-v2__account-row">
                {user ? (
                  <p>
                    {t("platformUi.settingsSignedInAs", {
                      name: `${user.firstName} ${user.lastName}`,
                    })}{" "}
                    <span className="plat-role-badge">{user.role}</span>
                  </p>
                ) : null}
                {onOpenProfile ? (
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--sm"
                    onClick={onOpenProfile}
                  >
                    {t("platformUi.settingsOpenProfile")}
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
                  <h2 className="set-v2__panel-title">{t("platformUi.settingsApiEnvTitle")}</h2>
                  <p className="set-v2__panel-sub">{t("platformUi.settingsApiEnvSub")}</p>
                </div>
              </div>
              <div className="set-v2__code-box">
                <code className="set-v2__code">{apiUrl}</code>
                <button type="button" className="cfg-btn cfg-btn--ghost" onClick={() => void copyApiUrl()}>
                  {copied ? t("common.copied") : t("platformUi.settingsCopyUrl")}
                </button>
              </div>
              <p className="cfg-hint" style={{ marginTop: "0.65rem" }}>
                {t("platformUi.settingsApiEnvHint")}
              </p>
            </section>

            <section className="set-v2__panel">
              <h2 className="set-v2__panel-title">{t("platformUi.settingsQuickLinks")}</h2>
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
              {t("platformUi.settingsLastSaved")}{" "}
              {settings
                ? new Date(settings.updatedAt).toLocaleString(locale === "am" ? "am-ET" : undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
            <button type="submit" className="plat-v2__btn plat-v2__btn--primary" disabled={saving}>
              {saving ? t("common.saving") : t("platformUi.settingsSaveSettings")}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
