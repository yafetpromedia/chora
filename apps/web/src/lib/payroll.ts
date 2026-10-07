import { apiFetch, apiPatch, apiPost, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export async function getPayrollDashboard() {
  return apiFetch<{
    current: {
      runId: string;
      status: string;
      label: string;
      startDate: string;
      endDate: string;
    } | null;
    totals: {
      employees: number;
      grossCents: number;
      deductionCents: number;
      netCents: number;
      employerCostCents: number;
      paidCents: number;
      unpaidCents: number;
    };
  }>("/payroll/dashboard");
}

export async function listPayrollPeriods() {
  return apiFetch<
    Array<{
      id: string;
      label: string;
      startDate: string;
      endDate: string;
      payDate: string;
      runs: Array<{ id: string; status: string }>;
    }>
  >("/payroll/periods");
}

export async function createPayrollPeriod(body: {
  label: string;
  startDate: string;
  endDate: string;
  payDate: string;
}) {
  return apiPost("/payroll/periods", body);
}

export async function createPayrollRun(periodId: string) {
  return apiPost<{ id: string }>(`/payroll/periods/${periodId}/runs`, {});
}

export async function getPayrollRun(runId: string) {
  return apiFetch<{
    id: string;
    status: string;
    period: { label: string; startDate: string; endDate: string; payDate: string };
    snapshots: Array<{
      id: string;
      userId: string;
      employeeName: string;
      employeeCode: string;
      departmentName: string | null;
      positionName: string | null;
      grossCents: number;
      deductionCents: number;
      netCents: number;
      payment: { status: string } | null;
      payslip: { id: string } | null;
    }>;
  }>(`/payroll/runs/${runId}`);
}

export async function calculatePayrollRun(runId: string) {
  return apiPost(`/payroll/runs/${runId}/calculate`, {});
}

export async function approvePayrollRun(runId: string) {
  return apiPost(`/payroll/runs/${runId}/approve`, {});
}

export async function closePayrollRun(
  runId: string,
  body?: { force?: boolean; reason?: string },
) {
  return apiPost(`/payroll/runs/${runId}/close`, body ?? {});
}

export async function recordPayrollPayment(
  snapshotId: string,
  body: {
    method: string;
    reference?: string;
    notes?: string;
    status?: string;
  },
) {
  return apiPost(`/payroll/payments/${snapshotId}`, body);
}

export async function addPayrollAdjustment(
  runId: string,
  body: {
    userId: string;
    type: string;
    amountCents: number;
    reason: string;
  },
) {
  return apiPost(`/payroll/runs/${runId}/adjustments`, body);
}

export async function listMyPayslips() {
  return apiFetch<
    Array<{
      id: string;
      periodLabel: string;
      payDate: string;
      snapshot: { netCents: number; grossCents: number; deductionCents: number };
    }>
  >("/payroll/me/payslips");
}

export async function getPayslip(id: string) {
  return apiFetch<{
    id: string;
    periodLabel: string;
    payDate: string;
    payload: {
      schoolName?: string | null;
      schoolLogoUrl?: string | null;
      schoolAddress?: string | null;
      schoolPhone?: string | null;
      schoolEmail?: string | null;
      employeeName: string;
      employeeCode: string;
      position: string | null;
      department: string | null;
      period: string;
      payDate: string;
      earnings: Array<{ code: string; label: string; amountCents: number }>;
      deductions: Array<{ code: string; label: string; amountCents: number }>;
      grossCents: number;
      deductionCents: number;
      netCents: number;
      employerCostCents?: number;
    };
  }>(`/payroll/payslips/${id}`);
}

export async function listEmployeeCompensation(userId: string) {
  return apiFetch<
    Array<{
      id: string;
      payFrequency: string;
      basicAmountCents: number;
      hourlyRateCents: number | null;
      dailyRateCents: number | null;
      effectiveFrom: string;
      effectiveTo: string | null;
      reason: string;
      lines: Array<{
        amountCents: number | null;
        percentBp: number | null;
        component: { code: string; name: string };
      }>;
    }>
  >(`/payroll/employees/${userId}/compensation`);
}

export async function createEmployeeCompensation(
  userId: string,
  body: {
    payFrequency: string;
    basicAmountCents: number;
    hourlyRateCents?: number;
    dailyRateCents?: number;
    effectiveFrom: string;
    reason: string;
    lines?: Array<{
      componentId: string;
      amountCents?: number;
      percentBp?: number;
    }>;
  },
) {
  return apiPost(`/payroll/employees/${userId}/compensation`, body);
}

export async function listCompensationComponents() {
  return apiFetch<
    Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      method: string;
      active: boolean;
    }>
  >("/payroll/components");
}

export async function createCompensationComponent(body: {
  code: string;
  name: string;
  type: string;
  method?: string;
}) {
  return apiPost("/payroll/components", body);
}

export async function getPayrollSettings() {
  return apiFetch<{
    currency: string;
    workingDaysPerMonth: number;
    overtimeEnabled: boolean;
    overtimeMultiplierBp: number;
    overtimeApprovalRequired: boolean;
    absenceDeductionMethod: string;
    absenceFixedDays: number;
    statutoryActive: boolean;
  }>("/payroll/settings");
}

export async function updatePayrollSettings(body: Record<string, unknown>) {
  return apiPatch("/payroll/settings", body);
}

export async function listPayrollRuleSets() {
  return apiFetch<
    Array<{
      id: string;
      code: string;
      name: string;
      active: boolean;
      effectiveFrom: string;
      taxBrackets: Array<{ minCents: number; maxCents: number | null; rateBp: number }>;
      contributions: Array<{
        code: string;
        name: string;
        employeeRateBp: number;
        employerRateBp: number;
        active: boolean;
      }>;
    }>
  >("/payroll/rule-sets");
}

export async function getPayrollRunReport(runId: string) {
  return apiFetch<{
    totals: {
      employees: number;
      grossCents: number;
      deductionCents: number;
      netCents: number;
    };
    byDepartment: Array<{
      department: string;
      count: number;
      gross: number;
      deductions: number;
      net: number;
    }>;
  }>(`/payroll/runs/${runId}/report`);
}

export async function listOvertimeApprovals(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<
    Array<{
      id: string;
      userId: string;
      overtimeMinutes: number;
      status: string;
      periodStart: string;
      periodEnd: string;
    }>
  >(`/payroll/overtime-approvals${q}`);
}

export async function reviewOvertimeApproval(
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  return apiPatch(`/payroll/overtime-approvals/${id}`, { status });
}

export async function downloadPayrollExport(runId: string) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null;
  const res = await fetch(
    `${getApiBaseUrl()}/payroll/runs/${runId}/export`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payroll-${runId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
