import { apiFetch, apiPatch, apiPost, apiPut, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type StaffAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "half_day"
  | "on_leave"
  | "excused";

export const STAFF_ATTENDANCE_STATUS_LABELS: Record<
  StaffAttendanceStatus,
  string
> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half day",
  on_leave: "On leave",
  excused: "Excused",
};

export type StaffAttendanceSettings = {
  checkInTime: string;
  checkOutTime: string;
  graceMinutes: number;
  overtimeEnabled?: boolean;
};

export type StaffAttendanceDayRow = {
  userId: string;
  employeeName: string;
  email: string;
  portalRole: string;
  roleName: string;
  roleTemplateSlug: string | null;
  department: string;
  date: string;
  recordId: string | null;
  status: StaffAttendanceStatus | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLabel: string;
  checkOutLabel: string;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  workedMinutes: number | null;
  reason: string | null;
  notes: string | null;
  recordedBy: string | null;
  updatedBy: string | null;
};

export type StaffAttendanceDayResponse = {
  date: string;
  settings: StaffAttendanceSettings;
  summary: {
    present: number;
    late: number;
    absent: number;
    half_day: number;
    on_leave: number;
    excused: number;
    unmarked: number;
    totalStaff: number;
  };
  rows: StaffAttendanceDayRow[];
};

export type StaffAttendanceCorrection = {
  id: string;
  previousStatus: StaffAttendanceStatus;
  newStatus: StaffAttendanceStatus;
  previousCheckInLabel: string;
  newCheckInLabel: string;
  previousCheckOutLabel: string;
  newCheckOutLabel: string;
  reason: string | null;
  changedBy: string;
  createdAt: string;
};

export type StaffAttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  status: StaffAttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLabel: string;
  checkOutLabel: string;
  expectedCheckInLabel: string;
  expectedCheckOutLabel: string;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  workedMinutes: number | null;
  reason: string | null;
  notes: string | null;
  employeeName?: string;
  portalRole?: string;
  roleName?: string;
  department?: string;
  recordedBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  corrections?: StaffAttendanceCorrection[];
};

export type StaffAttendanceSummary = {
  date: string;
  totalStaff: number;
  marked: number;
  unmarked: number;
  present: number;
  late: number;
  absent: number;
  half_day: number;
  on_leave: number;
  excused: number;
};

export function formatWorkedHours(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatLateLabel(minutes: number): string {
  if (!minutes) return "0";
  return `${minutes} min`;
}

export async function getStaffAttendanceSettings() {
  return apiFetch<StaffAttendanceSettings>("/staff-attendance/settings");
}

export async function updateStaffAttendanceSettings(
  body: Partial<StaffAttendanceSettings>,
) {
  return apiPatch<StaffAttendanceSettings>("/staff-attendance/settings", {
    checkInTime: body.checkInTime,
    checkOutTime: body.checkOutTime,
    graceMinutes: body.graceMinutes,
    overtimeEnabled: body.overtimeEnabled,
  });
}

export type StaffQrCredential = {
  id: string;
  userId: string;
  active: boolean;
  payload: string;
  rotatedAt: string | null;
  createdAt: string;
};

export async function getStaffQr(userId: string) {
  return apiFetch<StaffQrCredential | null>(`/staff-attendance/qr/${userId}`);
}

export async function issueStaffQr(userId: string) {
  return apiPost<StaffQrCredential>(`/staff-attendance/qr/${userId}`, {});
}

export async function rotateStaffQr(userId: string) {
  return apiPost<StaffQrCredential>(`/staff-attendance/qr/${userId}/rotate`, {});
}

export async function setStaffQrActive(userId: string, active: boolean) {
  return apiPatch<StaffQrCredential>(`/staff-attendance/qr/${userId}`, {
    active,
  });
}

export type StaffDepartment =
  | "teachers"
  | "administrative"
  | "support"
  | "other";

export const STAFF_DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  teachers: "Teachers",
  administrative: "Administrative Staff",
  support: "Support Staff",
  other: "Other School Staff",
};

export async function getStaffAttendanceDay(params: {
  date: string;
  group?: string;
  department?: StaffDepartment | "";
  status?: string;
  roleTemplateSlug?: string;
  search?: string;
}) {
  const q = new URLSearchParams();
  q.set("date", params.date);
  if (params.group) q.set("group", params.group);
  if (params.department) q.set("department", params.department);
  if (params.status) q.set("status", params.status);
  if (params.roleTemplateSlug) {
    q.set("roleTemplateSlug", params.roleTemplateSlug);
  }
  if (params.search?.trim()) q.set("search", params.search.trim());
  return apiFetch<StaffAttendanceDayResponse>(
    `/staff-attendance/day?${q.toString()}`,
  );
}

export async function bulkMarkUnmarkedStaff(body: {
  date: string;
  status?: "present" | "absent" | "on_leave" | "excused";
  department?: StaffDepartment;
  group?: string;
  search?: string;
  reason?: string;
}) {
  return apiPost<{
    marked: number;
    status: string;
    date: string;
    employeeNames?: string[];
  }>("/staff-attendance/bulk-mark-unmarked", body);
}

export async function getStaffAttendanceSummary(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<StaffAttendanceSummary>(`/staff-attendance/summary${q}`);
}

export async function getStaffAttendanceHistory(
  userId: string,
  from?: string,
  to?: string,
) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<StaffAttendanceRecord[]>(
    `/staff-attendance/history/${userId}${suffix}`,
  );
}

export type StaffScanResult = {
  action:
    | "check_in"
    | "check_out"
    | "already_checked_in"
    | "already_checked_out"
    | "already_complete";
  userId: string;
  name: string;
  department: string;
  roleName: string;
  record: StaffAttendanceRecord;
  alreadyMarked: boolean;
  scannedAt: string;
  message: string;
};

export async function scanStaffAttendance(body: {
  code: string;
  date: string;
  mode?: "auto" | "check_in" | "check_out";
}) {
  return apiPost<StaffScanResult>("/staff-attendance/scan", body);
}

export async function staffCheckIn(body: {
  userId: string;
  date: string;
  checkInAt?: string;
}) {
  return apiPost<StaffAttendanceRecord>("/staff-attendance/check-in", body);
}

export async function staffCheckOut(body: {
  userId: string;
  date: string;
  checkOutAt?: string;
}) {
  return apiPost<StaffAttendanceRecord>("/staff-attendance/check-out", body);
}

export async function upsertManualStaffAttendance(body: {
  userId: string;
  date: string;
  status: StaffAttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  reason?: string;
  notes?: string;
}) {
  return apiPut<StaffAttendanceRecord>("/staff-attendance/manual", body);
}

export async function correctStaffAttendance(
  recordId: string,
  body: {
    status: StaffAttendanceStatus;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    reason?: string;
    notes?: string;
  },
) {
  return apiPatch<StaffAttendanceRecord>(
    `/staff-attendance/records/${recordId}`,
    body,
  );
}

export type StaffAttendanceAnalytics = {
  from: string;
  to: string;
  totalStaff: number;
  markedRecords: number;
  rate: number | null;
  counts: {
    present: number;
    late: number;
    absent: number;
    half_day: number;
    on_leave: number;
    excused: number;
  };
  lateMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  leaveDays: number;
  trend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    on_leave: number;
  }>;
  mostLate: Array<{ name: string; lateMinutes: number }>;
  mostAbsent: Array<{ name: string; absent: number }>;
};

export async function getStaffAttendanceAnalytics(params: {
  from: string;
  to: string;
  department?: string;
}) {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.department) q.set("department", params.department);
  return apiFetch<StaffAttendanceAnalytics>(
    `/staff-attendance/analytics?${q.toString()}`,
  );
}

export async function getMyStaffAttendanceSummary(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<{
    rate: number | null;
    counts: Record<string, number>;
    totalRecords: number;
    lateMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    recent: StaffAttendanceRecord[];
  }>(`/staff-attendance/me/summary${suffix}`);
}

export async function getMyStaffQr() {
  return apiFetch<{
    id: string;
    payload: string;
    active: boolean;
  } | null>("/staff-attendance/me/qr");
}

export async function issueMyStaffQr() {
  return apiPost<{
    id: string;
    payload: string;
    active: boolean;
  }>("/staff-attendance/me/qr", {});
}

export async function downloadStaffPayrollCsv(params: {
  from: string;
  to: string;
  department?: string;
}) {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.department) q.set("department", params.department);
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null;
  const res = await fetch(
    `${getApiBaseUrl()}/staff-attendance/export-payroll?${q.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error((await res.text()) || "Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staff-payroll-hours-${params.from}-${params.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadStaffAttendanceCsv(params: {
  from: string;
  to: string;
  group?: string;
}) {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.group) q.set("group", params.group);
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null;
  const res = await fetch(
    `${getApiBaseUrl()}/staff-attendance/export?${q.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staff-attendance-${params.from}-${params.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
