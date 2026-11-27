"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { BirrSymbol } from "@/components/billing/birr-symbol";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICES,
  TRIAL_PLAN_DISPLAY,
  type BillingInterval,
  type DisplayCurrency,
  type PaidPlan,
} from "@/lib/plan-catalog";
import {
  BILLING_BUNDLES,
  SCHOOL_MODULE_CATALOG,
  exampleBundleTotalEtb,
  type BillingBundleId,
  type SchoolModuleKey,
} from "@/lib/module-catalog";

const PAID_PLANS: PaidPlan[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

const PLAN_BLURB_KEYS: Record<PaidPlan, string> = {
  STARTER: "landing.planBlurbStarter",
  PROFESSIONAL: "landing.planBlurbProfessional",
  ENTERPRISE: "landing.planBlurbEnterprise",
};

const MODULE_ICONS: Record<SchoolModuleKey, DashIconName> = {
  attendance: "attendance",
  results: "results",
  parent: "profile",
  timetable: "calendar",
  finance: "finance",
  classroom: "subjects",
  worksheets: "templates",
  library: "library",
  payroll: "finance",
};

const YEARLY_MULTIPLIER = 10;

function formatBasePrice(
  plan: PaidPlan,
  interval: BillingInterval,
  currency: DisplayCurrency,
  translate: (key: string) => string,
): { main: string; sub?: string } {
  const raw = PLAN_PRICES[plan];
  if (raw.custom) {
    return {
      main: translate("landing.priceCustom"),
      sub: translate("landing.priceTalkToTeam"),
    };
  }
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  if (currency === "usd") {
    const usd = raw.usdMonthly * factor;
    return {
      main: `From $${usd.toLocaleString()}`,
      sub: interval === "year" ? "base / year · + modules" : "base / month · + modules",
    };
  }
  const etb = raw.etbMonthly * factor;
  return {
    main: `From ${etb.toLocaleString()}`,
    sub: interval === "year" ? "base / year · + modules" : "base / month · + modules",
  };
}

function formatMoney(
  etb: number,
  usd: number,
  currency: DisplayCurrency,
  interval: BillingInterval,
) {
  const factor = interval === "year" ? YEARLY_MULTIPLIER : 1;
  if (currency === "usd") {
    return {
      amount: `$${(usd * factor).toLocaleString()}`,
      unit: interval === "year" ? "/yr" : "/mo",
    };
  }
  return {
    amount: (etb * factor).toLocaleString(),
    unit: interval === "year" ? "/yr" : "/mo",
    showBirr: true as const,
  };
}

export function LandingPricing() {
  const { t } = useLocale();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [currency, setCurrency] = useState<DisplayCurrency>("etb");
  const [bundleId, setBundleId] = useState<BillingBundleId>("ops");

  const starterBase = PLAN_PRICES.STARTER.etbMonthly;
  const starterBaseUsd = PLAN_PRICES.STARTER.usdMonthly;
  const activeBundle = BILLING_BUNDLES.find((b) => b.id === bundleId)!;
  const exampleTotalEtb = exampleBundleTotalEtb(starterBase, bundleId);
  const exampleTotalUsd = useMemo(() => {
    const mods = SCHOOL_MODULE_CATALOG.filter((m) =>
      activeBundle.modules.includes(m.key),
    ).reduce((sum, m) => sum + m.usdMonthly, 0);
    const discount = Math.round((mods * activeBundle.percentOffModules) / 100);
    return starterBaseUsd + mods - discount;
  }, [activeBundle, starterBaseUsd]);

  const totalDisplay = formatMoney(exampleTotalEtb, exampleTotalUsd, currency, interval);

  return (
    <div className="lp-pricing">
      <div className="lp-pricing__controls">
        <div className="lp-toggle" role="group" aria-label={t("landing.billingPeriodAria")}>
          <button
            type="button"
            className={`lp-toggle__btn${interval === "month" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setInterval("month")}
          >
            {t("landing.monthly")}
          </button>
          <button
            type="button"
            className={`lp-toggle__btn${interval === "year" ? " lp-toggle__btn--on" : ""}`}
            onClick={() => setInterval("year")}
          >
            {t("landing.yearly")}
            <span className="lp-toggle__save">{t("landing.yearlySave")}</span>
          </button>
        </div>
        <div className="lp-toggle" role="group" aria-label={t("landing.currencyAria")}>
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
            <BirrSymbol size={14} className="lp-toggle__birr-mark" />
            ETB
          </button>
        </div>
      </div>

      <div className="lp-pricing__grid">
        <article className="lp-price-card">
          <p className="lp-price-card__tier">Trial</p>
          <p className="lp-price-card__amount">Free</p>
          <p className="lp-price-card__sub">14 days · all modules · up to 50 students</p>
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
          const price = formatBasePrice(plan, interval, currency, t);
          const featured = plan === "STARTER";
          return (
            <article
              key={plan}
              className={`lp-price-card${featured ? " lp-price-card--featured" : ""}`}
            >
              {featured ? <span className="lp-price-card__badge">Build your stack</span> : null}
              <p className="lp-price-card__tier">{PLAN_LABELS[plan]}</p>
              <div className="lp-price-card__amount-row">
                <p className="lp-price-card__amount">{price.main}</p>
                {currency === "etb" && !PLAN_PRICES[plan].custom ? (
                  <BirrSymbol size={20} className="lp-price-card__birr" />
                ) : null}
              </div>
              <p className="lp-price-card__sub">{price.sub ?? t(PLAN_BLURB_KEYS[plan])}</p>
              <ul className="lp-price-card__list">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan === "ENTERPRISE" ? (
                <a
                  href="mailto:hello@chora.local?subject=Enterprise%20plan"
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

      <section className="lp-mod" aria-labelledby="lp-mod-title">
        <div className="lp-mod__glow" aria-hidden />
        <header className="lp-mod__header">
          <p className="lp-mod__eyebrow">{t("landing.modularAddons")}</p>
          <h3 id="lp-mod-title" className="lp-mod__title">
            {t("landing.addWhatYouUse")}
          </h3>
          <p className="lp-mod__lede">{t("landing.modularLede")}</p>
        </header>

        <div className="lp-mod__bundles" role="tablist" aria-label={t("landing.exampleBundlesAria")}>
          {BILLING_BUNDLES.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={bundleId === b.id}
              className={`lp-mod__bundle${bundleId === b.id ? " is-active" : ""}`}
              onClick={() => setBundleId(b.id)}
            >
              <span className="lp-mod__bundle-name">{b.label}</span>
              <span className="lp-mod__bundle-save">−{b.percentOffModules}%</span>
              <span className="lp-mod__bundle-desc">{b.description}</span>
            </button>
          ))}
        </div>

        <div className="lp-mod__total" aria-live="polite">
          <div>
            <p className="lp-mod__total-label">
              Small school + <strong>{activeBundle.label}</strong> example
            </p>
            <p className="lp-mod__total-hint">
              Base 2,000 ETB + modules with {activeBundle.percentOffModules}% bundle savings
            </p>
          </div>
          <p className="lp-mod__total-amount">
            {totalDisplay.amount}
            {"showBirr" in totalDisplay && totalDisplay.showBirr ? (
              <BirrSymbol size={22} className="lp-mod__total-birr" />
            ) : null}
            <span>{totalDisplay.unit}</span>
          </p>
        </div>

        <ul className="lp-mod__grid">
          {SCHOOL_MODULE_CATALOG.map((m) => {
            const included = activeBundle.modules.includes(m.key);
            const price = formatMoney(m.etbMonthly, m.usdMonthly, currency, "month");
            return (
              <li
                key={m.key}
                className={`lp-mod__card${included ? " is-on" : " is-off"}`}
              >
                <span className="lp-mod__icon" aria-hidden>
                  <DashIcon name={MODULE_ICONS[m.key]} />
                </span>
                <div className="lp-mod__card-main">
                  <strong>{m.label}</strong>
                  <em>{m.description}</em>
                </div>
                <div className="lp-mod__card-meta">
                  <span className="lp-mod__price">
                    {price.amount}
                    {"showBirr" in price && price.showBirr ? (
                      <BirrSymbol size={12} className="lp-mod__price-birr" />
                    ) : null}
                    <small>/mo</small>
                  </span>
                  <span className={`lp-mod__tag${included ? " is-on" : ""}`}>
                    {included ? t("landing.inBundle") : t("landing.optional")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="lp-mod__cta-row">
          <Link href="/register" className="btn-brand lp-mod__cta">
            Start free trial — pick modules later
          </Link>
        </div>
      </section>

      <p className="lp-pricing__note">
        Pay for a size band base, then unlock attendance, results, Chapa-ready finance, library, and
        more — only if you need them. School plans can invoice in USD or ETB; final invoices follow
        your selected modules.
      </p>
    </div>
  );
}
