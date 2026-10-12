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

export type PlatformPayMethod = "TELEBIRR" | "BANK_TRANSFER";
export type PlatformPaymentProofStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type PlatformPaymentProofReview = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amountEtb: number;
  amountUsd: number;
  schoolId: string;
  schoolName: string;
  joinCode: string;
  method: PlatformPayMethod;
  transactionId: string;
  proofUrl: string;
  status: PlatformPaymentProofStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export function listPlatformPaymentProofs(status?: PlatformPaymentProofStatus) {
  const q = status ? `?status=${status}` : "";
  return platformFetch<PlatformPaymentProofReview[]>(
    `/platform/payment-proofs${q}`,
  );
}

export function reviewPlatformPaymentProof(
  id: string,
  body: { status: "CONFIRMED" | "REJECTED"; reviewNote?: string },
) {
  return platformFetch<{ id: string; status: string; message: string }>(
    `/platform/payment-proofs/${id}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export type PlatformAttendanceConcernSummary = {
  totalOpen: number;
  bySchool: {
    schoolId: string;
    schoolName: string;
    joinCode: string;
    openCount: number;
    latestAt: string | null;
  }[];
  recent: {
    id: string;
    schoolId: string;
    schoolName: string;
    joinCode: string;
    status: string;
    concernType: string;
    description: string | null;
    subjectName: string | null;
    periodLabel: string | null;
    classLabel: string;
    date: string;
    createdAt: string;
  }[];
};

export function getPlatformAttendanceConcernSummary() {
  return platformFetch<PlatformAttendanceConcernSummary>(
    "/platform/attendance-concerns/summary",
  );
}
