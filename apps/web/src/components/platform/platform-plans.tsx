"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanType } from "@/lib/api";
import {
  getPlatformPlans,
  updatePlatformPlan,
  type PlatformPlanCatalog,
} from "@/lib/platform-plans";

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

export function PlatformPlans() {
  const [plans, setPlans] = useState<PlatformPlanCatalog[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PlanType | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformPlans();
    setPlans(data);
    setDraft(toDraft(data));
  }, []);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load plans"))
      .finally(() => setLoading(false));
  }, [load]);

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
      setMessage(`${updated.label} saved. Schools see new prices on upgrade.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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
    return <p className="plat-loading">Loading plans…</p>;
  }

  return (
    <div className="plat-plans">
      <header className="plat-section-hero plat-section-hero--billing">
        <div>
          <h2 className="plat-section-hero__title">Plan catalog</h2>
          <p className="plat-section-hero__sub">
            Set prices in USD and ETB, limits, and what schools see on the upgrade page.
          </p>
        </div>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {message ? <p className="plat-plans__ok">{message}</p> : null}

      <div className="plat-plans__grid">
        {ALL_PLANS.map((planKey) => {
          const d = draft[planKey];
          if (!d) return null;
          const isTrial = planKey === "TRIAL";
          const isEnterprise = planKey === "ENTERPRISE";

          return (
            <article key={planKey} className="plat-plan-editor">
              <header className="plat-plan-editor__head">
                <span className="plat-plan-editor__code">{planKey}</span>
                {!isTrial ? (
                  <label className="plat-plan-editor__listed">
                    <input
                      type="checkbox"
                      checked={d.isListed}
                      onChange={(e) => patch(planKey, "isListed", e.target.checked)}
                    />
                    Listed on upgrade page
                  </label>
                ) : null}
              </header>

              <label className="plat-field">
                <span>Display name</span>
                <input
                  value={d.label}
                  onChange={(e) => patch(planKey, "label", e.target.value)}
                />
              </label>

              <label className="plat-field">
                <span>Short description</span>
                <input
                  value={d.description}
                  onChange={(e) => patch(planKey, "description", e.target.value)}
                />
              </label>

              <div className="plat-plan-editor__row">
                <label className="plat-field">
                  <span>USD / month</span>
                  <input
                    type="number"
                    min={0}
                    value={d.usdMonthly}
                    disabled={isEnterprise}
                    onChange={(e) => patch(planKey, "usdMonthly", e.target.value)}
                    placeholder={isEnterprise ? "Custom" : "0"}
                  />
                </label>
                <label className="plat-field">
                  <span>ETB / month</span>
                  <input
                    type="number"
                    min={0}
                    value={d.etbMonthly}
                    disabled={isEnterprise}
                    onChange={(e) => patch(planKey, "etbMonthly", e.target.value)}
                    placeholder={isEnterprise ? "Custom" : "0"}
                  />
                </label>
              </div>

              {isTrial ? (
                <label className="plat-field">
                  <span>Trial length (days)</span>
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
                    <span>Max students</span>
                    <input
                      value={d.studentsLimit}
                      onChange={(e) => patch(planKey, "studentsLimit", e.target.value)}
                      placeholder="∞ empty"
                    />
                  </label>
                  <label className="plat-field">
                    <span>Max teachers</span>
                    <input
                      value={d.teachersLimit}
                      onChange={(e) => patch(planKey, "teachersLimit", e.target.value)}
                      placeholder="∞ empty"
                    />
                  </label>
                  <label className="plat-field">
                    <span>Max admins</span>
                    <input
                      value={d.adminsLimit}
                      onChange={(e) => patch(planKey, "adminsLimit", e.target.value)}
                      placeholder="∞ empty"
                    />
                  </label>
                </div>
              )}

              <label className="plat-field">
                <span>Features (one per line)</span>
                <textarea
                  rows={4}
                  value={d.featuresText}
                  onChange={(e) => patch(planKey, "featuresText", e.target.value)}
                />
              </label>

              <button
                type="button"
                className="plat-btn plat-btn--primary plat-btn--block"
                disabled={saving !== null}
                onClick={() => void save(planKey)}
              >
                {saving === planKey ? "Saving…" : "Save plan"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
