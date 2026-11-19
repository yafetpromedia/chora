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
  PLAN_LABELS,
  type BillingInterval,
  type DisplayCurrency,
  type PaidPlan,
  type ResolvedPlanPricing,
  YEARLY_MULTIPLIER,
} from "@/lib/plan-catalog";
import {
  BILLING_BUNDLES,
  SCHOOL_MODULE_CATALOG,
  computeModularMonthlyTotal,
  type BillingBundleId,
  type SchoolModuleKey,
} from "@/lib/module-catalog";
import {
  getBillingPaymentConfig,
  getSchoolSubscription,
  listPlans,
  redeemSchoolCoupon,
  startSubscriptionCheckout,
  updateSchoolModules,
  upgradeSchoolPlan,
  verifySubscriptionCheckout,
  type BillingPaymentConfig,
  type PlanOption,
  type PlanType,
  type SubscriptionStatus,
} from "@/lib/api";
import { EtbAmount } from "@/components/billing/etb-amount";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

function pricingFromTotal(
  totalEtb: number,
  totalUsd: number,
  interval: BillingInterval,
  custom: boolean,
): ResolvedPlanPricing {
  if (custom) {
    return {
      custom: true,
      etb: 0,
      usd: 0,
      perLabel: interval === "year" ? "annual contract" : "per month",
      interval,
    };
  }
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  return {
    custom: false,
    etb: totalEtb * factor,
    usd: totalUsd * factor,
    perLabel: interval === "year" ? "per year" : "per month",
    interval,
    yearlySavings: interval === "year" ? "Save 2 months vs monthly billing" : undefined,
  };
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
  const [savingModules, setSavingModules] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("etb");
  const [selectedBand, setSelectedBand] = useState<Exclude<PlanType, "TRIAL">>("STARTER");
  const [selectedModules, setSelectedModules] = useState<SchoolModuleKey[]>([]);
  const [bundleId, setBundleId] = useState<BillingBundleId | "base" | null>("ops");
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
        if (sub.plan !== "TRIAL") {
          setSelectedBand(sub.plan);
        }
        if (sub.billingBundle === "base") {
          setBundleId("base");
          setSelectedModules([]);
        } else if (
          sub.billingBundle === "ops" ||
          sub.billingBundle === "school" ||
          sub.billingBundle === "full"
        ) {
          setBundleId(sub.billingBundle);
          setSelectedModules((sub.enabledModules ?? []) as SchoolModuleKey[]);
        } else {
          setBundleId(null);
          setSelectedModules((sub.enabledModules ?? []) as SchoolModuleKey[]);
        }
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

    void (async () => {
      setCheckingOut("STARTER");
      setError("");
      try {
        const res = await verifySubscriptionCheckout(txRef);
        setSuccess(res.message);
        const sub = await getSchoolSubscription();
        setSubscription(sub);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Payment not confirmed yet. Wait a moment and refresh.",
        );
      } finally {
        setCheckingOut(null);
        router.replace("/admin/billing/plans");
      }
    })();
  }, [searchParams, router]);

  const chapaEnabled = paymentConfig?.chapaEnabled ?? false;

  const currentPlanLabel = useMemo(
    () => subscription?.planLabel ?? "—",
    [subscription?.planLabel],
  );

  const bandPlan = plans.find((p) => p.plan === selectedBand);
  const breakdown = useMemo(() => {
    const baseEtb = bandPlan?.etbMonthly ?? 0;
    const baseUsd = bandPlan?.usdMonthly ?? 0;
    return computeModularMonthlyTotal({
      plan: selectedBand,
      baseEtb,
      baseUsd,
      modules: selectedModules,
      bundleId: bundleId === "base" ? null : bundleId,
    });
  }, [bandPlan, selectedBand, selectedModules, bundleId]);

  const livePricing = pricingFromTotal(
    bundleId === "base" ? (bandPlan?.etbMonthly ?? 0) : breakdown.totalEtb,
    bundleId === "base" ? (bandPlan?.usdMonthly ?? 0) : breakdown.totalUsd,
    billingInterval,
    selectedBand === "ENTERPRISE",
  );

  function applyBundle(id: BillingBundleId | "base" | null) {
    setBundleId(id);
    if (id === "base") {
      setSelectedModules([]);
      return;
    }
    if (id) {
      const bundle = BILLING_BUNDLES.find((b) => b.id === id);
      if (bundle) setSelectedModules([...bundle.modules]);
    }
  }

  function toggleModule(key: SchoolModuleKey) {
    setBundleId(null);
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function onSaveModulesOnly() {
    setSavingModules(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateSchoolModules({
        modules: selectedModules,
        bundleId: bundleId === "base" ? "base" : bundleId,
      });
      setSubscription(updated);
      setSuccess("Module selection saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save modules");
    } finally {
      setSavingModules(false);
    }
  }

  async function onSelectPlan(plan: Exclude<PlanType, "TRIAL" | "ENTERPRISE">) {
    setCheckingOut(plan);
    setError("");
    setSuccess("");
    const moduleOpts = {
      modules: selectedModules,
      bundleId: bundleId === "base" ? "base" : bundleId,
    };
    try {
      if (chapaEnabled) {
        const res = await startSubscriptionCheckout({
          plan,
          interval: billingInterval,
          ...moduleOpts,
        });
        window.location.href = res.checkoutUrl;
        return;
      }
      const updated = await upgradeSchoolPlan(plan, moduleOpts);
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

  const factor = billingInterval === "year" ? YEARLY_MULTIPLIER : 1;
  const payAmount =
    (bundleId === "base" ? (bandPlan?.etbMonthly ?? 0) : breakdown.totalEtb) * factor;

  return (
    <DashboardPage role="admin" title="Plans">
      <SchoolBillingShell
        title="Plans & modules"
        subtitle={
          subscription?.expired
            ? `Your trial has ended. Pick a size band and modules, then pay or enter a coupon.`
            : `Base workspace by school size, then add only the modules you need.`
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
                  label: "Estimate",
                  value:
                    selectedBand === "ENTERPRISE"
                      ? "Custom"
                      : `${payAmount.toLocaleString()} ETB`,
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
        </form>

        <section className="sb-mod">
          <header className="sb-mod__head">
            <div>
              <h2>1. School size (base)</h2>
              <p>Base includes users, classes, and announcements.</p>
            </div>
            <PlanPriceDisplay pricing={livePricing} currency={displayCurrency} />
          </header>
          <div className="sb-mod__bands">
            {plans.map((plan) => {
              const key = plan.plan as PaidPlan;
              const active = selectedBand === plan.plan;
              return (
                <button
                  key={plan.plan}
                  type="button"
                  className={`sb-mod__band${active ? " is-active" : ""}`}
                  onClick={() => {
                    if (plan.plan === "TRIAL") return;
                    setSelectedBand(plan.plan);
                  }}
                >
                  <strong>{plan.label || PLAN_LABELS[key]}</strong>
                  <span>{plan.description}</span>
                  {plan.plan !== "ENTERPRISE" ? (
                    <em>
                      <EtbAmount amount={plan.etbMonthly ?? 0} maximumFractionDigits={0} />
                      /mo base
                    </em>
                  ) : (
                    <em>Custom</em>
                  )}
                </button>
              );
            })}
          </div>

          <header className="sb-mod__head">
            <div>
              <h2>2. Modules</h2>
              <p>Bundles discount the module total (not the base).</p>
            </div>
          </header>
          <div className="sb-mod__bundles">
            <button
              type="button"
              className={`sb-mod__chip${bundleId === "base" ? " is-active" : ""}`}
              onClick={() => applyBundle("base")}
            >
              Base only
            </button>
            {BILLING_BUNDLES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`sb-mod__chip${bundleId === b.id ? " is-active" : ""}`}
                onClick={() => applyBundle(b.id)}
              >
                {b.label} (−{b.percentOffModules}%)
              </button>
            ))}
            <button
              type="button"
              className={`sb-mod__chip${bundleId === null ? " is-active" : ""}`}
              onClick={() => applyBundle(null)}
            >
              Custom mix
            </button>
          </div>
          <div className="sb-mod__grid">
            {SCHOOL_MODULE_CATALOG.map((m) => {
              const on = selectedModules.includes(m.key);
              return (
                <label key={m.key} className={`sb-mod__item${on ? " is-on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={bundleId === "base"}
                    onChange={() => toggleModule(m.key)}
                  />
                  <span>
                    <strong>{m.label}</strong>
                    <em>{m.description}</em>
                  </span>
                  <b>
                    <EtbAmount amount={m.etbMonthly} maximumFractionDigits={0} />
                    /mo
                  </b>
                </label>
              );
            })}
          </div>

          {selectedBand !== "ENTERPRISE" ? (
            <div className="sb-mod__total">
              <div>
                <p>
                  Base <EtbAmount amount={breakdown.baseEtb} maximumFractionDigits={0} />
                  {" + "}
                  modules <EtbAmount amount={breakdown.modulesEtb} maximumFractionDigits={0} />
                  {breakdown.discountEtb > 0 ? (
                    <>
                      {" − "}
                      discount{" "}
                      <EtbAmount amount={breakdown.discountEtb} maximumFractionDigits={0} />
                    </>
                  ) : null}
                </p>
                <strong>
                  Total{" "}
                  <EtbAmount amount={payAmount} maximumFractionDigits={0} />
                  {billingInterval === "year" ? " / year" : " / month"}
                </strong>
              </div>
              <div className="sb-mod__actions">
                <button
                  type="button"
                  className="sb-v2__plan-card__btn"
                  disabled={savingModules}
                  onClick={() => void onSaveModulesOnly()}
                >
                  {savingModules ? "Saving…" : "Save modules"}
                </button>
                <button
                  type="button"
                  className="sb-v2__plan-card__btn sb-v2__plan-card__btn--primary"
                  disabled={checkingOut != null}
                  onClick={() =>
                    void onSelectPlan(selectedBand as Exclude<PlanType, "TRIAL" | "ENTERPRISE">)
                  }
                >
                  {checkingOut
                    ? "Working…"
                    : chapaEnabled
                      ? "Pay & activate"
                      : "Request invoice"}
                </button>
              </div>
            </div>
          ) : (
            <p className="sb-v2__footnote">Enterprise is custom — contact sales.</p>
          )}
        </section>

        <div className="sb-v2__plans">
          {plans.map((plan) => {
            const key = plan.plan as PaidPlan;
            const features = plan.features?.length ? plan.features : [];
            const meta = PLAN_CATALOG[key];
            const pricing =
              plan.usdMonthly != null
                ? pricingFromTotal(
                    plan.etbMonthly ?? 0,
                    plan.usdMonthly ?? 0,
                    billingInterval,
                    plan.plan === "ENTERPRISE",
                  )
                : getPlanPricing(key, billingInterval);
            const isCurrent = subscription?.plan === plan.plan;
            const isFeatured = meta?.featured ?? false;

            return (
              <article
                key={plan.plan}
                className={`sb-v2__plan-card${isFeatured ? " sb-v2__plan-card--featured" : ""}${isCurrent ? " sb-v2__plan-card--current" : ""}`}
              >
                {isCurrent ? (
                  <span className="sb-v2__plan-card__badge sb-v2__plan-card__badge--current">
                    Current band
                  </span>
                ) : null}
                <h2 className="sb-v2__plan-card__name">{plan.label}</h2>
                <p className="sb-v2__plan-card__desc">{plan.description}</p>
                <PlanPriceDisplay pricing={pricing} currency={displayCurrency} />
                <p className="sb-v2__plan-card__hint">Base fee only — modules add on top</p>
                <ul className="sb-v2__plan-card__features">
                  {features.slice(0, 5).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {!chapaEnabled ? <PayoutInstructions payout={paymentConfig?.payout} /> : null}

        <p className="sb-v2__footnote">
          Trial includes all modules. After checkout, only selected modules stay unlocked in the
          console.
        </p>
      </SchoolBillingShell>
    </DashboardPage>
  );
}
