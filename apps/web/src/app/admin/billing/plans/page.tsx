"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AcademicsBadge } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  BillingControlsBar,
  PlanPriceDisplay,
} from "@/components/billing/plan-billing-ui";
import { SchoolBillingShell } from "@/components/school-billing/school-billing-shell";
import { PayoutInstructions } from "@/components/school-billing/payout-instructions";
import {
  getPlanPricing,
  PLAN_CATALOG,
  type BillingInterval,
  type DisplayCurrency,
  type PaidPlan,
  type ResolvedPlanPricing,
} from "@/lib/plan-catalog";
import {
  getBillingPaymentConfig,
  getSchoolSubscription,
  listPlans,
  redeemSchoolCoupon,
  startSubscriptionCheckout,
  upgradeSchoolPlan,
  verifySubscriptionCheckout,
  type BillingPaymentConfig,
  type PlanOption,
  type PlanType,
  type SubscriptionStatus,
} from "@/lib/api";
import { EtbAmount } from "@/components/billing/etb-amount";
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

function checkoutAmountEtb(plan: PlanOption, interval: BillingInterval): number {
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  return (plan.etbMonthly ?? 0) * factor;
}

export default function SchoolPlansPage() {
  return (
    <Suspense
      fallback={
        <DashboardPage role="admin" title="Plans">
          <SchoolBillingShell
            title="Plans & upgrades"
            subtitle="Loading subscription options…"
            loading
            loadingLabel="Loading plans…"
          >
            <span />
          </SchoolBillingShell>
        </DashboardPage>
      }
    >
      <SchoolPlansPageContent />
    </Suspense>
  );
}

function SchoolPlansPageContent() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<BillingPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<PlanType | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("usd");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    void Promise.all([getSchoolSubscription(), listPlans(), getBillingPaymentConfig()])
      .then(([sub, planList, config]) => {
        setSubscription(sub);
        setPlans(planList);
        setPaymentConfig(config);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load plans");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const chapaReturn = searchParams.get("chapa_return");
    const txRef = searchParams.get("tx_ref")?.trim();
    if (chapaReturn !== "1" || !txRef) return;

    setCheckingOut("STARTER");
    setError("");
    void verifySubscriptionCheckout(txRef)
      .then(async (res) => {
        setSuccess(res.message);
        const sub = await getSchoolSubscription();
        setSubscription(sub);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Payment not confirmed yet. Wait a moment and refresh.",
        ),
      )
      .finally(() => {
        setCheckingOut(null);
        router.replace("/admin/billing/plans");
      });
  }, [searchParams, router]);

  const chapaEnabled = paymentConfig?.chapaEnabled ?? false;

  const currentPlanLabel = useMemo(
    () => subscription?.planLabel ?? "—",
    [subscription?.planLabel],
  );

  async function onSelectPlan(plan: Exclude<PlanType, "TRIAL" | "ENTERPRISE">) {
    setCheckingOut(plan);
    setError("");
    setSuccess("");
    try {
      if (chapaEnabled) {
        const res = await startSubscriptionCheckout({
          plan,
          interval: billingInterval,
        });
        window.location.href = res.checkoutUrl;
        return;
      }
      const updated = await upgradeSchoolPlan(plan);
      setSubscription(updated);
      setSuccess(updated.message ?? `${updated.planLabel} update submitted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change plan");
    } finally {
      setCheckingOut(null);
    }
  }

  async function onApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setError("");
    setSuccess("");
    try {
      const next = await redeemSchoolCoupon(couponCode.trim());
      setSubscription(next);
      setSuccess(next.coupon?.result ?? next.message ?? "Coupon applied.");
      setCouponCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  }

  const heroExtra = (
    <>
      <BillingControlsBar
        interval={billingInterval}
        onIntervalChange={setBillingInterval}
        currency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
      />
      {chapaEnabled ? (
        <div className="sb-v2__pay-badge" aria-label="Payment via Chapa">
          <span className="sb-v2__pay-badge__dot" />
          Secure checkout · Chapa · ETB
        </div>
      ) : null}
    </>
  );

  return (
    <DashboardPage role="admin" title="Plans">
      <SchoolBillingShell
        title="Plans & upgrades"
        subtitle={
          subscription?.expired
            ? `Your trial has ended. Pay for a plan or enter a coupon code to continue.`
            : chapaEnabled
              ? `You are on ${currentPlanLabel}. Pay securely with Chapa to activate or change your plan.`
              : `You are on ${currentPlanLabel}. Activate a paid plan by invoice, or apply a coupon.`
        }
        stats={
          subscription
            ? [
                { label: "Current plan", value: currentPlanLabel },
                {
                  label: "Students",
                  value: `${subscription.usage.students}${subscription.limits.students != null ? ` / ${subscription.limits.students}` : ""}`,
                },
                {
                  label: "Teachers",
                  value: `${subscription.usage.teachers}${subscription.limits.teachers != null ? ` / ${subscription.limits.teachers}` : ""}`,
                },
                {
                  label: "Status",
                  value: subscription.isActive && !subscription.expired ? "Active" : "Inactive",
                },
              ]
            : undefined
        }
        badges={
          subscription ? (
            <AcademicsBadge variant="live">{currentPlanLabel}</AcademicsBadge>
          ) : undefined
        }
        heroExtra={heroExtra}
        error={error}
        success={success}
        onDismissError={() => setError("")}
        onDismissSuccess={() => setSuccess("")}
        loading={loading}
        loadingLabel="Loading plans…"
      >
        <form
          className="sb-v2__coupon"
          onSubmit={(e) => {
            e.preventDefault();
            void onApplyCoupon();
          }}
        >
          <label>
            <span>Have a coupon code?</span>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="PILOT14 / PARTNER / SAVE50"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="sb-v2__plan-card__btn" disabled={applyingCoupon || !couponCode.trim()}>
            {applyingCoupon ? "Applying…" : "Apply coupon"}
          </button>
          {subscription?.couponCode ? (
            <p className="sb-v2__footnote" style={{ margin: 0 }}>
              Active coupon: {subscription.couponCode}
            </p>
          ) : null}
        </form>
        <div className="sb-v2__plans">
          {plans.map((plan) => {
            const key = plan.plan as PaidPlan;
            const features = plan.features?.length ? plan.features : [];
            const meta = PLAN_CATALOG[key];
            const pricing =
              plan.usdMonthly != null
                ? pricingFromPlan(plan, billingInterval)
                : getPlanPricing(key, billingInterval);
            const isCurrent = subscription?.plan === plan.plan;
            const isFeatured = meta?.featured ?? false;
            const isEnterprise = plan.plan === "ENTERPRISE";
            const payAmount = checkoutAmountEtb(plan, billingInterval);
            const isCheckingOut = checkingOut === plan.plan;

            return (
              <article
                key={plan.plan}
                className={`sb-v2__plan-card${isFeatured ? " sb-v2__plan-card--featured" : ""}${isCurrent ? " sb-v2__plan-card--current" : ""}`}
              >
                {isCurrent ? (
                  <span className="sb-v2__plan-card__badge sb-v2__plan-card__badge--current">
                    Current plan
                  </span>
                ) : isFeatured ? (
                  <span className="sb-v2__plan-card__badge">Popular</span>
                ) : null}

                <h2 className="sb-v2__plan-card__name">{plan.label}</h2>
                <p className="sb-v2__plan-card__desc">{plan.description}</p>

                <PlanPriceDisplay pricing={pricing} currency={displayCurrency} />

                {!isEnterprise && chapaEnabled && !isCurrent ? (
                  <p className="sb-v2__plan-card__hint">
                    Charged <EtbAmount amount={payAmount} maximumFractionDigits={0} />
                    {billingInterval === "year" ? " / year" : " / month"}
                  </p>
                ) : null}

                <ul className="sb-v2__plan-card__features">
                  {features.slice(0, 5).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`sb-v2__plan-card__btn${isCurrent ? " sb-v2__plan-card__btn--current" : ""}${isFeatured && !isCurrent ? " sb-v2__plan-card__btn--primary" : ""}`}
                  disabled={isCurrent || isCheckingOut || isEnterprise}
                  onClick={() => {
                    if (isEnterprise || isCurrent) return;
                    void onSelectPlan(key as Exclude<PlanType, "TRIAL" | "ENTERPRISE">);
                  }}
                >
                  {isEnterprise
                    ? "Contact sales"
                    : isCurrent
                      ? "Current plan"
                      : isCheckingOut
                        ? "Opening Chapa…"
                        : chapaEnabled
                          ? "Pay & activate"
                          : "Request invoice"}
                </button>
              </article>
            );
          })}
        </div>

        {!chapaEnabled ? <PayoutInstructions payout={paymentConfig?.payout} /> : null}

        <p className="sb-v2__footnote">
          {chapaEnabled
            ? "Payments are processed by Chapa. Your plan activates immediately after successful payment."
            : `When the trial ends, access stops until you pay or apply a coupon. Coupons can extend the trial, discount the invoice, or grant complimentary access.`}
        </p>
      </SchoolBillingShell>
    </DashboardPage>
  );
}
