"use client";

import Link from "next/link";
import { useState } from "react";
import { BirrSymbol } from "@/components/billing/birr-symbol";
import {
  PLAN_FEATURES,
  PLAN_PRICES,
  TRIAL_PLAN_DISPLAY,
  type BillingInterval,
  type DisplayCurrency,
  type PaidPlan,
} from "@/lib/plan-catalog";

const PAID_PLANS: PaidPlan[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

const PLAN_LABELS: Record<PaidPlan, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const PLAN_BLURBS: Record<PaidPlan, string> = {
  STARTER: "Single campus · up to 500 students",
  PROFESSIONAL: "Growing schools · analytics & finance",
  ENTERPRISE: "Groups & chains · custom contract",
};

const YEARLY_MULTIPLIER = 10;

function formatPrice(
  plan: PaidPlan,
  interval: BillingInterval,
  currency: DisplayCurrency,
): { main: string; sub?: string } {
  const raw = PLAN_PRICES[plan];
  if (raw.custom) {
    return { main: "Custom", sub: "Talk to our team" };
  }
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  if (currency === "usd") {
    const usd = raw.usdMonthly * factor;
    return {
      main: `$${usd.toLocaleString()}`,
      sub: interval === "year" ? "per year · save 2 months" : "per month",
    };
  }
  const etb = raw.etbMonthly * factor;
  return {
    main: etb.toLocaleString(),
    sub: interval === "year" ? "per year · save 2 months" : "per month",
  };
}

export function LandingPricing() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [currency, setCurrency] = useState<DisplayCurrency>("usd");

  return (
    <div className="lp-pricing">
      <div className="lp-pricing__controls">
        <div className="lp-toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`lp-toggle__btn${interval === "month" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`lp-toggle__btn${interval === "year" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setInterval("year")}
          >
            Yearly
            <span className="lp-toggle__save">−2 mo</span>
          </button>
        </div>
        <div className="lp-toggle" role="group" aria-label="Currency">
          <button
            type="button"
            className={`lp-toggle__btn${currency === "usd" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setCurrency("usd")}
          >
            USD ($)
          </button>
          <button
            type="button"
            className={`lp-toggle__btn lp-toggle__btn--birr${currency === "etb" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setCurrency("etb")}
          >
            <BirrSymbol size={16} />
            ETB
          </button>
        </div>
      </div>

      <div className="lp-pricing__grid">
        <article className="lp-price-card">
          <p className="lp-price-card__tier">Trial</p>
          <p className="lp-price-card__amount">Free</p>
          <p className="lp-price-card__sub">14 days · up to 50 students</p>
          <ul className="lp-price-card__list">
            {TRIAL_PLAN_DISPLAY.features.slice(0, 4).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link href="/register" className="btn-ghost lp-price-card__cta">
            Start free trial
          </Link>
        </article>

        {PAID_PLANS.map((plan) => {
          const price = formatPrice(plan, interval, currency);
          const featured = plan === "PROFESSIONAL";
          return (
            <article
              key={plan}
              className={`lp-price-card${featured ? " lp-price-card--featured" : ""}`}
            >
              {featured ? <span className="lp-price-card__badge">Most schools</span> : null}
              <p className="lp-price-card__tier">{PLAN_LABELS[plan]}</p>
              <div className="lp-price-card__amount-row">
                {currency === "etb" && !PLAN_PRICES[plan].custom ? (
                  <BirrSymbol size={28} className="lp-price-card__birr" />
                ) : null}
                <p className="lp-price-card__amount">{price.main}</p>
              </div>
              <p className="lp-price-card__sub">{price.sub ?? PLAN_BLURBS[plan]}</p>
              <ul className="lp-price-card__list">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan === "ENTERPRISE" ? (
                <a
                  href="mailto:hello@campusone.local?subject=Enterprise%20plan"
                  className={featured ? "btn-brand lp-price-card__cta" : "btn-ghost lp-price-card__cta"}
                >
                  Contact sales
                </a>
              ) : (
                <Link
                  href="/register"
                  className={featured ? "btn-brand lp-price-card__cta" : "btn-ghost lp-price-card__cta"}
                >
                  Get started
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <p className="lp-pricing__note">
        All paid plans include admin, teacher, student, and parent portals. Prices in ETB are
        indicative; final billing follows your school&apos;s invoice currency.
      </p>
    </div>
  );
}
