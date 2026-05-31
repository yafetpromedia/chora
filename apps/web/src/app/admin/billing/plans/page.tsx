"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  BillingControlsBar,
  PlanPriceDisplay,
} from "@/components/billing/plan-billing-ui";
import { SchoolBillingNav } from "@/components/school-billing/school-billing-nav";
import {
  getPlanPricing,
  PLAN_CATALOG,
  type BillingInterval,
  type DisplayCurrency,
  type PaidPlan,
  type ResolvedPlanPricing,
} from "@/lib/plan-catalog";
import {
  getSchoolSubscription,
  listPlans,
  type PlanOption,
  type PlanType,
  type SubscriptionStatus,
  upgradeSchoolPlan,
} from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

const YEARLY_MULTIPLIER = 10;

function pricingFromPlan(
  plan: PlanOption,
  interval: BillingInterval,
): ResolvedPlanPricing {
  const isEnterprise = plan.plan === "ENTERPRISE";
  if (isEnterprise || (!plan.usdMonthly && plan.plan === "ENTERPRISE")) {
    return {
      custom: true,
      etb: 0,
      usd: 0,
      perLabel: interval === "year" ? "annual contract" : "per month",
      interval,
    };
  }
  const usdM = plan.usdMonthly ?? 0;
  const etbM = plan.etbMonthly ?? 0;
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  return {
    custom: false,
    etb: etbM * factor,
    usd: usdM * factor,
    perLabel: interval === "year" ? "per year" : "per month",
    interval,
    yearlySavings: interval === "year" ? "Save 2 months vs monthly billing" : undefined,
  };
}

export default function SchoolPlansPage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanType | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("usd");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    void Promise.all([getSchoolSubscription(), listPlans()])
      .then(([sub, planList]) => {
        setSubscription(sub);
        setPlans(planList);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load plans");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onUpgrade(plan: Exclude<PlanType, "TRIAL">) {
    setUpgrading(plan);
    setError("");
    setSuccess("");
    try {
      const updated = await upgradeSchoolPlan(plan);
      setSubscription(updated);
      setSuccess(`You're on ${updated.planLabel} now.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <DashboardPage role="admin" title="Plans">
        <SchoolBillingNav />
        <div className="upg-loading">
          <span className="upg-loading__spinner" aria-hidden />
          <p>Loading…</p>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage role="admin" title="Plans" subtitle="Choose billing for your school">
      <SchoolBillingNav />

      <div className="upg" data-upgrade-page>
        <header className="upg-hero">
          <h1 className="upg-hero__title">Pick a plan</h1>
          <BillingControlsBar
            interval={billingInterval}
            onIntervalChange={setBillingInterval}
            currency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
          />
        </header>

        {error ? (
          <p className="auth-alert auth-alert--error upg-alert" role="alert">
            {error}
          </p>
        ) : null}
        {success ? <p className="upg-success">{success}</p> : null}

        <div className="upg-grid">
          {plans.map((plan) => {
            const key = plan.plan as PaidPlan;
            const features =
              plan.features?.length ? plan.features : [];
            const meta = PLAN_CATALOG[key];
            const pricing =
              plan.usdMonthly != null
                ? pricingFromPlan(plan, billingInterval)
                : getPlanPricing(key, billingInterval);
            const isCurrent = subscription?.plan === plan.plan;
            const isFeatured = meta?.featured ?? false;

            return (
              <article
                key={plan.plan}
                className={`upg-card${isFeatured ? " upg-card--featured" : ""}${isCurrent ? " upg-card--current" : ""}`}
              >
                {isFeatured ? <span className="upg-card__badge">Popular</span> : null}

                <h2 className="upg-card__name">{plan.label}</h2>
                <p className="sbill-muted" style={{ margin: "-0.5rem 0 0.75rem" }}>
                  {plan.description}
                </p>

                <PlanPriceDisplay pricing={pricing} currency={displayCurrency} />

                <ul className="upg-card__features">
                  {features.slice(0, 5).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`upg-card__btn${isCurrent ? " upg-card__btn--current" : ""}`}
                  disabled={isCurrent || upgrading !== null || plan.plan === "ENTERPRISE"}
                  onClick={() => void onUpgrade(key)}
                >
                  {plan.plan === "ENTERPRISE"
                    ? "Contact sales"
                    : isCurrent
                      ? "Current"
                      : upgrading === plan.plan
                        ? "…"
                        : "Select"}
                </button>
              </article>
            );
          })}
        </div>

        <p className="upg-footnote">
          No card required during trial · Plans activate instantly
        </p>
      </div>
    </DashboardPage>
  );
}
