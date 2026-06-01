import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type BillingSummary = {
  mrrUsd: number;
  mrrEtb: number;
  paidSchools: number;
  trialSchools: number;
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    outstandingUsd: number;
    outstandingEtb: number;
  };
};

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
export type BillingCurrency = "USD" | "ETB";

export type PlatformInvoice = {
  id: string;
  schoolId: string;
  schoolName: string;
  joinCode: string;
  invoiceNumber: string;
  plan: PlanType | null;
  periodStart: string;
  periodEnd: string;
  amountUsd: number;
  amountEtb: number;
  currency: BillingCurrency;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  notes: string | null;
};

export type UsageRow = {
  schoolId: string;
  schoolName: string;
  joinCode: string;
  status: string;
  plan: PlanType;
  billingActive: boolean;
  limits: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  usage: {
    students: number;
    teachers: number;
    admins: number;
    parents: number;
  };
  utilization: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  overLimit: {
    students: boolean;
    teachers: boolean;
    admins: boolean;
  };
};

export function getBillingSummary() {
  return platformFetch<BillingSummary>("/platform/billing/summary");
}

export function getPlatformUsage() {
  return platformFetch<UsageRow[]>("/platform/usage");
}

export function getPlatformInvoices(params?: { schoolId?: string; status?: InvoiceStatus }) {
  const q = new URLSearchParams();
  if (params?.schoolId) q.set("schoolId", params.schoolId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return platformFetch<PlatformInvoice[]>(`/platform/invoices${qs ? `?${qs}` : ""}`);
}

export function createPlatformInvoice(body: {
  schoolId: string;
  plan?: PlanType;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  amountUsd?: number;
  amountEtb?: number;
  currency?: BillingCurrency;
  notes?: string;
}) {
  return platformFetch<PlatformInvoice>("/platform/invoices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePlatformInvoice(
  id: string,
  body: { status?: InvoiceStatus; dueAt?: string; paidAt?: string | null; notes?: string },
) {
  return platformFetch<PlatformInvoice>(`/platform/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
