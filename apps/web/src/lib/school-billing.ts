import type { PlanType, PlatformPayoutInstructions, SubscriptionStatus } from "@/lib/api";
import { apiFetch, apiPost } from "@/lib/api";

export type PlatformPayMethod = "TELEBIRR" | "BANK_TRANSFER";
export type PlatformPaymentProofStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type SchoolOpenInvoice = {
  id: string;
  invoiceNumber: string;
  amountUsd: number;
  amountEtb: number;
  dueAt: string;
};

export type PlatformPaymentProof = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  method: PlatformPayMethod;
  transactionId: string;
  status: PlatformPaymentProofStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

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
  openInvoices: SchoolOpenInvoice[];
  paymentProofs: PlatformPaymentProof[];
  payout?: PlatformPayoutInstructions;
};

export function getSchoolBillingOverview() {
  return apiFetch<SchoolBillingOverview>("/schools/billing");
}

export function getSchoolInvoices() {
  return apiFetch<SchoolInvoice[]>("/schools/billing/invoices");
}

export function submitPlatformPaymentProof(
  invoiceId: string,
  body: {
    method: PlatformPayMethod;
    transactionId: string;
    proofUrl: string;
  },
) {
  return apiPost<{ id: string; status: string; message: string }>(
    `/schools/billing/invoices/${invoiceId}/payment-proof`,
    body,
  );
}

export function getPlatformPaymentProofs() {
  return apiFetch<PlatformPaymentProof[]>("/schools/billing/payment-proofs");
}

export function requestRenewalInvoice() {
  return apiPost<{
    invoice: SchoolOpenInvoice;
    message: string;
    created: boolean;
  }>("/schools/billing/request-invoice", {});
}
