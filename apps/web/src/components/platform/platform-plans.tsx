"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanType } from "@/lib/api";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  getPlatformPlans,
  updatePlatformPlan,
  type PlatformPlanCatalog,
} from "@/lib/platform-plans";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";

const ALL_PLANS: PlanType[] = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

type Draft = Record<
  string,
  {
    label: string;
    description: string;
    studentsLimit: string;
    teachersLimit: string;
    adminsLimit: string;
    usdMonthly: string;
    etbMonthly: string;
    featuresText: string;
    trialDays: string;
    isListed: boolean;
  }
>;

function toDraft(plans: PlatformPlanCatalog[]): Draft {
  const d: Draft = {};
  for (const p of plans) {
    d[p.plan] = {
      label: p.label,
      description: p.description,
      studentsLimit: p.students == null ? "" : String(p.students),
      teachersLimit: p.teachers == null ? "" : String(p.teachers),
      adminsLimit: p.admins == null ? "" : String(p.admins),
      usdMonthly: String(p.usdMonthly),
      etbMonthly: String(p.etbMonthly),
      featuresText: p.features.join("\n"),
      trialDays: p.trialDays == null ? "" : String(p.trialDays),
      isListed: p.isListed,
    };
  }
  return d;
}

function parseLimit(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function planIcon(plan: PlanType) {
  if (plan === "TRIAL") return "calendar";
  if (plan === "ENTERPRISE") return "building";
  if (plan === "PROFESSIONAL") return "chart";
  return "finance";
}

export function PlatformPlans() {
  const { t } = useLocale();
  const router = useRouter();
  const [plans, setPlans] = useState<PlatformPlanCatalog[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PlanType | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformPlans();
    setPlans(data);
    setDraft(toDraft(data));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load()
        .catch((e) => fail(e, t("platformUi.errLoadPlans")))
        .finally(() => setLoading(false));
    });
  }, [load, router]);

  const stats = useMemo(() => {
    const listed = plans.filter((p) => p.isListed && p.plan !== "TRIAL").length;
    const avgUsd =
      plans.filter((p) => p.plan !== "ENTERPRISE" && p.plan !== "TRIAL").length > 0
        ? Math.round(
            plans
              .filter((p) => p.plan !== "ENTERPRISE" && p.plan !== "TRIAL")
              .reduce((sum, p) => sum + p.usdMonthly, 0) /
              plans.filter((p) => p.plan !== "ENTERPRISE" && p.plan !== "TRIAL").length,
          )
        : 0;
    return { total: plans.length, listed, avgUsd };
  }, [plans]);

  async function save(plan: PlanType) {
    const d = draft[plan];
    if (!d) return;
    setSaving(plan);
    setError("");
    setMessage("");
    try {
      const updated = await updatePlatformPlan(plan, {
        label: d.label.trim(),
        description: d.description.trim(),
        studentsLimit: parseLimit(d.studentsLimit),
        teachersLimit: parseLimit(d.teachersLimit),
        adminsLimit: parseLimit(d.adminsLimit),
        usdMonthly: Number(d.usdMonthly) || 0,
        etbMonthly: Number(d.etbMonthly) || 0,
        features: d.featuresText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        trialDays: d.trialDays.trim() ? Number(d.trialDays) : null,
        isListed: d.isListed,
      });
      setPlans((prev) => prev.map((p) => (p.plan === plan ? updated : p)));
      setMessage(t("platformUi.plansSavedOk", { label: updated.label }));
    } catch (e) {
      fail(e, t("platformUi.errSaveFailed"));
    } finally {
      setSaving(null);
    }
  }

  function patch(plan: PlanType, key: keyof Draft[string], value: string | boolean) {
    setDraft((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [key]: value },
    }));
  }

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-billing-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={message} tone="success" onDismiss={() => setMessage("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="settings" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.plansEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.plansTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.plansSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>{t("platformUi.plansStatPlans")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.listed}</strong>
            <span>{t("platformUi.plansStatListed")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>${stats.avgUsd}</strong>
            <span>{t("platformUi.plansStatAvgUsd")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{stats.listed}</strong>
            <span>{t("platformUi.plansOnUpgradePage")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <div>
            <strong>
              {plans.find((p) => p.plan === "TRIAL")?.trialDays ?? "—"}
            </strong>
            <span>{t("platformUi.plansTrialDays")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="building" className="dash-icon--sm" />
          <div>
            <strong>1</strong>
            <span>{t("platformUi.plansEnterpriseCustom")}</span>
          </div>
        </article>
      </div>

      <div className="plat-billing-v2__plans-grid">
        {ALL_PLANS.map((planKey) => {
          const d = draft[planKey];
          if (!d) return null;
          const isTrial = planKey === "TRIAL";
          const isEnterprise = planKey === "ENTERPRISE";
          const catalog = plans.find((p) => p.plan === planKey);

          return (
            <article key={planKey} className="plat-billing-v2__plan-card">
              <header className="plat-billing-v2__plan-head">
                <span className="plat-billing-v2__plan-icon" aria-hidden>
                  <DashIcon name={planIcon(planKey)} className="dash-icon--md" />
                </span>
                <div>
                  <span className="plat-plan-editor__code">{planKey}</span>
                  <strong className="plat-billing-v2__plan-title">{d.label}</strong>
                  {catalog ? (
                    <p className="plat-billing-v2__plan-price">
                      {isEnterprise
                        ? t("platformUi.plansCustomPricing")
                        : isTrial
                          ? t("platformUi.plansDayTrial", {
                              days: d.trialDays || catalog.trialDays || "",
                            })
                          : t("platformUi.plansPriceMo", {
                              usd: d.usdMonthly,
                              etb: d.etbMonthly,
                            })}
                    </p>
                  ) : null}
                </div>
                {!isTrial ? (
                  <label className="plat-billing-v2__listed">
                    <input
                      type="checkbox"
                      checked={d.isListed}
                      onChange={(e) => patch(planKey, "isListed", e.target.checked)}
                    />
                    {t("platformUi.plansListed")}
                  </label>
                ) : null}
              </header>

              <label className="plat-field">
                <span>{t("platformUi.plansDisplayName")}</span>
                <input value={d.label} onChange={(e) => patch(planKey, "label", e.target.value)} />
              </label>

              <label className="plat-field">
                <span>{t("platformUi.plansShortDesc")}</span>
                <input
                  value={d.description}
                  onChange={(e) => patch(planKey, "description", e.target.value)}
                />
              </label>

              <div className="plat-plan-editor__row">
                <label className="plat-field">
                  <span>{t("platformUi.plansUsdMonth")}</span>
                  <input
                    type="number"
                    min={0}
                    value={d.usdMonthly}
                    disabled={isEnterprise}
                    onChange={(e) => patch(planKey, "usdMonthly", e.target.value)}
                    placeholder={isEnterprise ? t("platformUi.plansCustom") : "0"}
                  />
                </label>
                <label className="plat-field">
                  <span>{t("platformUi.plansEtbMonth")}</span>
                  <input
                    type="number"
                    min={0}
                    value={d.etbMonthly}
                    disabled={isEnterprise}
                    onChange={(e) => patch(planKey, "etbMonthly", e.target.value)}
                    placeholder={isEnterprise ? t("platformUi.plansCustom") : "0"}
                  />
                </label>
              </div>

              {isTrial ? (
                <label className="plat-field">
                  <span>{t("platformUi.plansTrialLength")}</span>
                  <input
                    type="number"
                    min={1}
                    value={d.trialDays}
                    onChange={(e) => patch(planKey, "trialDays", e.target.value)}
                  />
                </label>
              ) : (
                <div className="plat-plan-editor__row plat-plan-editor__row--3">
                  <label className="plat-field">
                    <span>{t("platformUi.plansMaxStudents")}</span>
                    <input
                      value={d.studentsLimit}
                      onChange={(e) => patch(planKey, "studentsLimit", e.target.value)}
                      placeholder={t("platformUi.plansLimitPh")}
                    />
                  </label>
                  <label className="plat-field">
                    <span>{t("platformUi.plansMaxTeachers")}</span>
                    <input
                      value={d.teachersLimit}
                      onChange={(e) => patch(planKey, "teachersLimit", e.target.value)}
                      placeholder={t("platformUi.plansLimitPh")}
                    />
                  </label>
                  <label className="plat-field">
                    <span>{t("platformUi.plansMaxAdmins")}</span>
                    <input
                      value={d.adminsLimit}
                      onChange={(e) => patch(planKey, "adminsLimit", e.target.value)}
                      placeholder={t("platformUi.plansLimitPh")}
                    />
                  </label>
                </div>
              )}

              <label className="plat-field">
                <span>{t("platformUi.plansFeatures")}</span>
                <textarea
                  rows={4}
                  value={d.featuresText}
                  onChange={(e) => patch(planKey, "featuresText", e.target.value)}
                />
              </label>

              <button
                type="button"
                className="plat-v2__btn plat-v2__btn--primary"
                disabled={saving !== null}
                onClick={() => void save(planKey)}
              >
                {saving === planKey ? t("common.saving") : t("platformUi.plansSavePlan")}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
