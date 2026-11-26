"use client";

import { BirrSymbol } from "@/components/billing/birr-symbol";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BillingInterval, DisplayCurrency, ResolvedPlanPricing } from "@/lib/plan-catalog";
import { formatEtbAmount, formatUsdAmount } from "@/lib/plan-catalog";

type IntervalToggleProps = {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
};

export function BillingIntervalToggle({ interval, onChange }: IntervalToggleProps) {
  const { t } = useLocale();
  return (
    <div className="bill-toggle" role="group" aria-label={t("planBillingControlsUi.billingPeriodAria")}>
      <button
        type="button"
        className={`bill-toggle__btn${interval === "month" ? " bill-toggle__btn--active" : ""}`}
        onClick={() => onChange("month")}
        aria-pressed={interval === "month"}
      >
        {t("planBillingControlsUi.monthly")}
      </button>
      <button
        type="button"
        className={`bill-toggle__btn${interval === "year" ? " bill-toggle__btn--active" : ""}`}
        onClick={() => onChange("year")}
        aria-pressed={interval === "year"}
      >
        {t("planBillingControlsUi.yearly")}
        <span className="bill-toggle__save">{t("planBillingControlsUi.yearlySave")}</span>
      </button>
    </div>
  );
}

type CurrencyToggleProps = {
  currency: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
};

export function CurrencyToggle({ currency, onChange }: CurrencyToggleProps) {
  const { t } = useLocale();
  return (
    <div className="bill-currency-toggle" role="group" aria-label={t("planBillingControlsUi.currencyAria")}>
      <button
        type="button"
        className={`bill-currency-toggle__btn${currency === "usd" ? " bill-currency-toggle__btn--active" : ""}`}
        onClick={() => onChange("usd")}
        aria-pressed={currency === "usd"}
      >
        <span className="bill-currency-toggle__sym" aria-hidden>
          $
        </span>
        {t("planBillingControlsUi.usd")}
      </button>
      <button
        type="button"
        className={`bill-currency-toggle__btn${currency === "etb" ? " bill-currency-toggle__btn--active" : ""}`}
        onClick={() => onChange("etb")}
        aria-pressed={currency === "etb"}
      >
        <BirrSymbol size={16} className="bill-currency-toggle__birr" />
        {t("planBillingControlsUi.etb")}
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
  const { t } = useLocale();
  const per = pricing.interval === "year" ? t("planBillingControlsUi.perYear") : t("planBillingControlsUi.perMonth");

  if (pricing.custom) {
    return (
      <div className={`bill-price bill-price--custom${compact ? " bill-price--compact" : ""}`}>
        <p className="bill-price__custom-label">{t("planBillingControlsUi.custom")}</p>
        <p className="bill-price__period-note">{t("planBillingControlsUi.contactSales")}</p>
      </div>
    );
  }

  const isUsd = currency === "usd";

  return (
    <div className={`bill-price bill-price--minimal${compact ? " bill-price--compact" : ""}`}>
      <div className="bill-price__amount-row">
        <span className="bill-price__value">
          {isUsd ? formatUsdAmount(pricing.usd) : formatEtbAmount(pricing.etb)}
        </span>
        {isUsd ? (
          <span className="bill-price__sign" aria-hidden>
            $
          </span>
        ) : (
          <BirrSymbol size={compact ? 26 : 32} className="bill-price__birr" />
        )}
        <span className="bill-price__per">{per}</span>
      </div>
    </div>
  );
}