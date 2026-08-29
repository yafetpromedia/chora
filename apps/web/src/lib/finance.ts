import { apiFetch, apiPost, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export function formatEtb(cents: number): string {
  return `${(cents / 100).toLocaleString("en-ET", { maximumFractionDigits: 2 })} ETB`;
}

export type FeeType = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type FeeSchedule = {
  id: string;
  amountCents: number;
  frequency: string;
  installmentCount: number;
  description: string | null;
  feeType: { id: string; name: string; code: string };
  academicYear: { id: string; name: string };
  grade: { id: string; name: string } | null;
};

export type FinanceAnalytics = {
  month: string;
  expectedRevenueCents: number;
  collectedCents: number;
  outstandingCents: number;
  collectedThisMonthCents: number;
  paidStudents: number;
  unpaidStudents: number;
  overdueFeesCount: number;
};

export type StudentFinanceSummary = {
  student: { profileId: string; name: string; grade: string; section: string | null };
  totalDueCents: number;
  totalPaidCents: number;
  outstandingCents: number;
  fees: Array<{
    id: string;
    label: string;
    feeType: string;
    amountDueCents: number;
    paidAmountCents: number;
    balanceCents: number;
    dueDate: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    receiptNumber: string;
    amountCents: number;
    method: string;
    paidAt: string;
  }>;
};

export type ParentFinanceOverview = {
  totalDueCents: number;
  children: Array<{
    profileId: string;
    name: string;
    grade: string;
    outstandingCents: number;
    totalPaidCents: number;
  }>;
};

export type ParentPayMethod = "TELEBIRR" | "BANK_TRANSFER" | "CHAPA";

export type PendingPaymentSubmission = {
  id: string;
  receiptNumber: string;
  amountCents: number;
  method?: string;
  reference: string | null;
  createdAt: string;
};

export type ParentFeesDue = {
  student: { profileId: string; name: string; grade: string; section: string | null };
  items: Array<{ id: string; label: string; amountCents: number; dueDate: string; status: string }>;
  totalDueCents: number;
  pendingSubmissions: PendingPaymentSubmission[];
  paymentInstructions: {
    methods: ParentPayMethod[];
    note: string;
    steps?: string[];
    bank: {
      bankName: string;
      accountHolder: string;
      accountNumber: string;
    } | null;
    telebirr?: {
      number: string;
      accountName: string;
    } | null;
  };
};

export type PendingPaymentReview = {
  id: string;
  receiptNumber: string;
  amountCents: number;
  method: string;
  reference: string | null;
  proofUrl: string | null;
  notes: string | null;
  submittedAt: string;
  student: {
    profileId: string;
    name: string;
    grade: string;
    section: string | null;
  };
};

export async function seedFinanceDefaults() {
  return apiPost<FeeType[]>("/finance/seed-defaults", {});
}

export async function listAcademicYears() {
  return apiFetch<AcademicYear[]>("/finance/years");
}

export async function listFeeTypes() {
  return apiFetch<FeeType[]>("/finance/fee-types");
}

export async function listFeeSchedules(academicYearId?: string) {
  const q = academicYearId ? `?academicYearId=${academicYearId}` : "";
  return apiFetch<FeeSchedule[]>(`/finance/schedules${q}`);
}

export async function createFeeSchedule(body: {
  feeTypeId: string;
  academicYearId: string;
  gradeId?: string;
  amountCents: number;
  frequency?: string;
  installmentCount?: number;
  description?: string;
}) {
  return apiPost<FeeSchedule>("/finance/schedules", body);
}

export async function assignGradeFees(body: {
  feeScheduleId: string;
  gradeId: string;
  sectionId?: string;
  dueDate: string;
}) {
  return apiPost<{ assigned: number; students: number }>("/finance/assign-grade", body);
}

export async function getFinanceAnalytics(month?: string) {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return apiFetch<FinanceAnalytics>(`/finance/analytics${q}`);
}

export async function getStudentFinanceSummary(profileId: string) {
  return apiFetch<StudentFinanceSummary>(`/finance/students/${profileId}/summary`);
}

export async function recordPayment(body: {
  studentProfileId: string;
  amountCents: number;
  method: string;
  reference?: string;
  notes?: string;
  allocations: Array<{ studentFeeId: string; amountCents: number }>;
}) {
  return apiPost("/finance/payments", body);
}

export async function sendFeeReminders(daysBeforeDue = 3) {
  return apiPost<{ remindersSent: number; feesDue: number }>("/finance/reminders", {
    daysBeforeDue,
  });
}

export async function getParentFinanceOverview() {
  return apiFetch<ParentFinanceOverview>("/finance/parent/overview");
}

export async function getParentFeesDue(profileId: string) {
  return apiFetch<ParentFeesDue>(`/finance/parent/students/${profileId}/due`);
}

export async function initializeChapaPayment(
  profileId: string,
  amountCents: number,
) {
  return apiPost<{
    checkoutUrl: string;
    txRef: string;
    receiptNumber: string;
    message: string;
  }>(`/finance/parent/students/${profileId}/chapa/initialize`, { amountCents });
}

export async function verifyChapaPayment(txRef: string) {
  return apiPost<{
    status: string;
    receiptNumber: string;
    message: string;
  }>("/finance/parent/chapa/verify", { txRef });
}

export async function submitParentPayment(
  profileId: string,
  body: {
    amountCents: number;
    reference: string;
    method?: "BANK_TRANSFER" | "TELEBIRR";
    proofUrl?: string;
    notes?: string;
  },
) {
  return apiPost<{
    receiptNumber: string;
    message: string;
    status: string;
  }>(`/finance/parent/students/${profileId}/pay-request`, body);
}

/** @deprecated */
export async function requestParentPayment(profileId: string, amountCents: number) {
  return submitParentPayment(profileId, {
    amountCents,
    reference: `REF-${Date.now()}`,
  });
}

export async function listPendingPayments() {
  return apiFetch<PendingPaymentReview[]>("/finance/payments/pending");
}

export async function approvePendingPayment(paymentId: string) {
  return apiPost(`/finance/payments/${paymentId}/approve`, {});
}

export async function rejectPendingPayment(paymentId: string, reason?: string) {
  return apiPost(`/finance/payments/${paymentId}/reject`, { reason });
}

export function financeExportUrl(from: string, to: string) {
  return `${getApiBaseUrl()}/finance/export?from=${from}&to=${to}`;
}

export async function downloadFinanceExport(from: string, to: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(financeExportUrl(from, to), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `finance-${from}-${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
