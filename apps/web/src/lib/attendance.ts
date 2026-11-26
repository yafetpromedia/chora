import { apiFetch, apiPatch, apiPost, getApiBaseUrl, type GradeWithSections } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { listGrades } from "@/lib/school-setup";
import { getMyTeacherHomeroomClasses } from "@/lib/teachers";

export async function listGradesForAttendance(): Promise<GradeWithSections[]> {
  const role =
    typeof window !== "undefined" ? localStorage.getItem(AUTH_ROLE_KEY) : null;
  if (role === "teacher") {
    return getMyTeacherHomeroomClasses();
  }
  return listGrades();
}

export type AttendanceMode = "DAILY" | "PERIOD" | "BOTH";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceReason = "sick" | "family_emergency" | "unexcused" | "other";

export type AttendancePermissionType = "ABSENCE" | "LATE" | "EARLY_LEAVE" | "OTHER";

export type AttendancePermissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AttendancePermissionRequest = {
  id: string;
  type: AttendancePermissionType;
  date: string;
  reason: AttendanceReason | null;
  note: string | null;
  status: AttendancePermissionStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  studentProfileId: string;
  studentName: string;
  gradeName: string;
  sectionName: string | null;
  requestedBy: string;
  requestedByRole: string;
};

export type RosterStudent = {
  studentProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  gradeName: string;
  sectionName: string | null;
  status: AttendanceStatus;
  reason: AttendanceReason | null;
  recordId: string | null;
};

export type AttendanceSummary = {
  student: {
    profileId: string;
    name: string;
    grade: string;
    section: string | null;
  };
  rate: number;
  counts: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  total: number;
  recent: Array<{
    id: string;
    date: string;
    status: AttendanceStatus;
    reason: AttendanceReason | null;
  }>;
};

export type AttendanceAnalytics = {
  date: string;
  totalStudents: number;
  markedToday: number;
  todayRate: number | null;
  presentToday: number;
  absentToday: number;
  mostAbsentGrade: { label: string; rate: number; marked: number } | null;
  mostPunctualGrade: { label: string; rate: number; marked: number } | null;
};

export type ParentNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  studentProfile: {
    user: { firstName: string; lastName: string };
    grade: { name: string };
    section: { name: string } | null;
  };
};

export async function getAttendanceSettings() {
  return apiFetch<{ mode: AttendanceMode }>("/attendance/settings");
}

export async function updateAttendanceSettings(mode: AttendanceMode) {
  return apiPatch<{ mode: AttendanceMode }>("/attendance/settings", { mode });
}

export async function getAttendanceRoster(params: {
  gradeId: string;
  sectionId?: string;
  date: string;
  periodNumber?: number;
}) {
  const q = new URLSearchParams({
    gradeId: params.gradeId,
    date: params.date,
    periodNumber: String(params.periodNumber ?? 0),
  });
  if (params.sectionId) q.set("sectionId", params.sectionId);
  return apiFetch<RosterStudent[]>(`/attendance/roster?${q}`);
}

export async function saveBulkAttendance(body: {
  gradeId: string;
  sectionId?: string;
  date: string;
  periodNumber?: number;
  subject?: string;
  records: Array<{
    studentProfileId: string;
    status: AttendanceStatus;
    reason?: AttendanceReason;
  }>;
}) {
  return apiPost("/attendance/bulk", body);
}

export async function getAttendanceSummary(
  studentProfileId?: string,
  range?: { from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (studentProfileId) q.set("studentProfileId", studentProfileId);
  if (range?.from) q.set("from", range.from);
  if (range?.to) q.set("to", range.to);
  const qs = q.toString();
  return apiFetch<AttendanceSummary>(
    `/attendance/student/summary${qs ? `?${qs}` : ""}`,
  );
}

export async function getAttendanceAnalytics(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<AttendanceAnalytics>(`/attendance/analytics${q}`);
}

export async function listParentNotifications() {
  return apiFetch<ParentNotification[]>("/notifications");
}

export function attendanceExportUrl(from: string, to: string) {
  const q = new URLSearchParams({ from, to });
  return `${getApiBaseUrl()}/attendance/export?${q}`;
}

export function createAttendancePermissionRequest(body: {
  type: AttendancePermissionType;
  date: string;
  reason?: AttendanceReason;
  note?: string;
  studentProfileId?: string;
}) {
  return apiPost<AttendancePermissionRequest>("/attendance/permission-requests", body);
}

export function listMyAttendancePermissionRequests(studentProfileId?: string) {
  const q = studentProfileId
    ? `?studentProfileId=${encodeURIComponent(studentProfileId)}`
    : "";
  return apiFetch<AttendancePermissionRequest[]>(
    `/attendance/permission-requests/mine${q}`,
  );
}

export function listAttendancePermissionRequests(params: {
  gradeId: string;
  sectionId?: string;
  status?: AttendancePermissionStatus;
  date?: string;
}) {
  const q = new URLSearchParams({ gradeId: params.gradeId });
  if (params.sectionId) q.set("sectionId", params.sectionId);
  if (params.status) q.set("status", params.status);
  if (params.date) q.set("date", params.date);
  return apiFetch<AttendancePermissionRequest[]>(
    `/attendance/permission-requests?${q}`,
  );
}

export function reviewAttendancePermissionRequest(
  id: string,
  body: { status: "APPROVED" | "REJECTED"; reviewNote?: string },
) {
  return apiPatch<AttendancePermissionRequest>(
    `/attendance/permission-requests/${id}/review`,
    body,
  );
}

export function downloadAttendanceExport(from: string, to: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");
  const url = attendanceExportUrl(from, to);
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(
    async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  );
}
