import type { PlanType, SubscriptionStatus } from "@/lib/api";
import { apiFetch } from "@/lib/api";

export type SchoolInvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
export type SchoolBillingCurrency = "USD" | "ETB";

export type SchoolInvoice = {
  id: string;
  invoiceNumber: string;
  plan: PlanType | null;
  periodStart: string;
  periodEnd: string;
  amountUsd: number;
  amountEtb: number;
  currency: SchoolBillingCurrency;
  status: SchoolInvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  notes: string | null;
};

export type SchoolBillingOverview = {
  subscription: SubscriptionStatus;
  planPrice: { usdMonthly: number; etbMonthly: number } | null;
  invoices: {
    total: number;
    openCount: number;
    outstandingUsd: number;
    outstandingEtb: number;
    nextDueAt: string | null;
  };
};

export function getSchoolBillingOverview() {
  return apiFetch<SchoolBillingOverview>("/schools/billing");
}

export function getSchoolInvoices() {
  return apiFetch<SchoolInvoice[]>("/schools/billing/invoices");
}
