"use client";

import { BirrSymbol } from "@/components/billing/birr-symbol";
import type { BillingInterval, DisplayCurrency, ResolvedPlanPricing } from "@/lib/plan-catalog";
import { formatEtbAmount, formatUsdAmount } from "@/lib/plan-catalog";

type IntervalToggleProps = {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
};

export function BillingIntervalToggle({ interval, onChange }: IntervalToggleProps) {
  return (
    <div className="bill-toggle" role="group" aria-label="Billing period">
      <button
        type="button"
        className={`bill-toggle__btn${interval === "month" ? " bill-toggle__btn--active" : ""}`}
        onClick={() => onChange("month")}
        aria-pressed={interval === "month"}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`bill-toggle__btn${interval === "year" ? " bill-toggle__btn--active" : ""}`}
        onClick={() => onChange("year")}
        aria-pressed={interval === "year"}
      >
        Yearly
        <span className="bill-toggle__save">−17%</span>
      </button>
    </div>
  );
}

type CurrencyToggleProps = {
  currency: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
};

export function CurrencyToggle({ currency, onChange }: CurrencyToggleProps) {
  return (
    <div className="bill-currency-toggle" role="group" aria-label="Currency">
      <button
        type="button"
        className={`bill-currency-toggle__btn${currency === "usd" ? " bill-currency-toggle__btn--active" : ""}`}
        onClick={() => onChange("usd")}
        aria-pressed={currency === "usd"}
      >
        <span className="bill-currency-toggle__sym" aria-hidden>
          $
        </span>
        USD
      </button>
      <button
        type="button"
        className={`bill-currency-toggle__btn${currency === "etb" ? " bill-currency-toggle__btn--active" : ""}`}
        onClick={() => onChange("etb")}
        aria-pressed={currency === "etb"}
      >
        <BirrSymbol size={16} className="bill-currency-toggle__birr" />
        ETB
      </button>
    </div>
  );
}

type BillingBarProps = {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  currency: DisplayCurrency;
  onCurrencyChange: (currency: DisplayCurrency) => void;
};

export function BillingControlsBar({
  interval,
  onIntervalChange,
  currency,
  onCurrencyChange,
}: BillingBarProps) {
  return (
    <div className="bill-controls">
      <BillingIntervalToggle interval={interval} onChange={onIntervalChange} />
      <CurrencyToggle currency={currency} onChange={onCurrencyChange} />
    </div>
  );
}

type PriceProps = {
  pricing: ResolvedPlanPricing;
  currency: DisplayCurrency;
  compact?: boolean;
};

export function PlanPriceDisplay({ pricing, currency, compact }: PriceProps) {
  const per = pricing.interval === "year" ? "/yr" : "/mo";

  if (pricing.custom) {
    return (
      <div className={`bill-price bill-price--custom${compact ? " bill-price--compact" : ""}`}>
        <p className="bill-price__custom-label">Custom</p>
        <p className="bill-price__period-note">Contact sales</p>
      </div>
    );
  }

  const isUsd = currency === "usd";

  return (
    <div className={`bill-price bill-price--minimal${compact ? " bill-price--compact" : ""}`}>
      <div className="bill-price__amount-row">
        {isUsd ? (
          <span className="bill-price__sign" aria-hidden>
            $
          </span>
        ) : (
          <BirrSymbol size={compact ? 26 : 32} className="bill-price__birr" />
        )}
        <span className="bill-price__value">
          {isUsd ? formatUsdAmount(pricing.usd) : formatEtbAmount(pricing.etb)}
        </span>
        <span className="bill-price__per">{per}</span>
      </div>
    </div>
  );
}
