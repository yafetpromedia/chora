import type { DashIconName } from "@/components/dashboard/dash-icons";
import type { PlanType } from "@/lib/api";

export type PaidPlan = Exclude<PlanType, "TRIAL">;
export type BillingInterval = "month" | "year";
export type DisplayCurrency = "usd" | "etb";

export type PlanCatalogEntry = {
  icon: DashIconName;
  featured?: boolean;
  customPricing?: boolean;
};

export type PlanPriceAmounts = {
  etbMonthly: number;
  usdMonthly: number;
};

/** USD list price; ETB derived at market rate (~158 ETB/USD, rounded to nearest 50) */
export const USD_ETB_RATE = 158;

function etbFromUsd(usd: number): number {
  return Math.round((usd * USD_ETB_RATE) / 50) * 50;
}

/** List prices — USD is source of truth for international billing */
export const PLAN_PRICES: Record<PaidPlan, PlanPriceAmounts & { custom?: boolean }> = {
  STARTER: { usdMonthly: 99, etbMonthly: etbFromUsd(99) },
  PROFESSIONAL: { usdMonthly: 259, etbMonthly: etbFromUsd(259) },
  ENTERPRISE: { etbMonthly: 0, usdMonthly: 0, custom: true },
};

export const PLAN_CATALOG: Record<PaidPlan, PlanCatalogEntry> = {
  STARTER: { icon: "overview" },
  PROFESSIONAL: { icon: "chart", featured: true },
  ENTERPRISE: { icon: "users", customPricing: true },
};

export const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  STARTER: [
    "Up to 500 students",
    "Up to 50 teachers",
    "Parent portal",
    "Attendance, results & announcements",
  ],
  PROFESSIONAL: [
    "Up to 2,000 students",
    "Unlimited teachers",
    "Analytics & notifications",
    "Mobile app access",
  ],
  ENTERPRISE: [
    "Unlimited students",
    "Multi-campus support",
    "Advanced analytics & API",
    "Dedicated support",
  ],
};

/** Yearly = 10× monthly (2 months free) */
const YEARLY_MULTIPLIER = 10;

export type ResolvedPlanPricing = {
  custom: boolean;
  etb: number;
  usd: number;
  perLabel: string;
  interval: BillingInterval;
  yearlySavings?: string;
};

export function getPlanPricing(
  plan: PaidPlan,
  interval: BillingInterval,
): ResolvedPlanPricing {
  const raw = PLAN_PRICES[plan];
  const perLabel = interval === "year" ? "per year" : "per month";

  if (raw.custom) {
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
    etb: raw.etbMonthly * factor,
    usd: raw.usdMonthly * factor,
    perLabel,
    interval,
    yearlySavings:
      interval === "year" ? "Save 2 months vs monthly billing" : undefined,
  };
}

export function formatEtbAmount(amount: number): string {
  return amount.toLocaleString("en-ET");
}

export function formatUsdAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

/** Trial plan row for platform catalog */
export const TRIAL_PLAN_DISPLAY = {
  id: "TRIAL" as const,
  name: "Trial",
  desc: "Full evaluation for new tenants. Auto-assigned when a school is created.",
  features: ["All core modules", "Up to 50 students", "Email support"],
  tone: "trial",
};
