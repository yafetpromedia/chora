import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type LeaveType = {
  id: string;
  name: string;
  slug: string;
  isPaid: boolean;
  countsTowardBalance: boolean;
  annualAllocationDays: number | null;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  employeeName: string;
  roleName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeSlug: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

export async function listLeaveTypes() {
  return apiFetch<LeaveType[]>("/leave/types");
}

export async function listLeaveRequests(params?: {
  status?: string;
  userId?: string;
  leaveTypeId?: string;
  from?: string;
  to?: string;
  mine?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.userId) q.set("userId", params.userId);
  if (params?.leaveTypeId) q.set("leaveTypeId", params.leaveTypeId);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.mine) q.set("mine", "1");
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<LeaveRequest[]>(`/leave/requests${suffix}`);
}

export async function createLeaveRequest(body: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  userId?: string;
}) {
  return apiPost<LeaveRequest>("/leave/requests", body);
}

export async function reviewLeaveRequest(
  id: string,
  body: { status: "approved" | "rejected"; reviewNote?: string },
) {
  return apiPatch<LeaveRequest>(`/leave/requests/${id}/review`, body);
}

export async function cancelLeaveRequest(id: string) {
  return apiPost<LeaveRequest>(`/leave/requests/${id}/cancel`, {});
}

export async function listLeaveBalances(userId?: string, year?: number) {
  const q = new URLSearchParams();
  if (userId) q.set("userId", userId);
  if (year) q.set("year", String(year));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<{
    year: number;
    balances: Array<{
      id: string;
      userId: string;
      employeeName: string;
      leaveTypeName: string;
      allocated: number;
      used: number;
      remaining: number;
    }>;
  }>(`/leave/balances${suffix}`);
}
