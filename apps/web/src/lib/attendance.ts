import { apiFetch, apiPatch, apiPost, getApiBaseUrl, type GradeWithSections } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { listGrades } from "@/lib/school-setup";
import { getMyTeacherClasses } from "@/lib/teachers";

export async function listGradesForAttendance(): Promise<GradeWithSections[]> {
  const role =
    typeof window !== "undefined" ? localStorage.getItem(AUTH_ROLE_KEY) : null;
  if (role === "teacher") {
    return getMyTeacherClasses();
  }
  return listGrades();
}

export type AttendanceMode = "DAILY" | "PERIOD" | "BOTH";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceReason = "sick" | "family_emergency" | "unexcused" | "other";

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

export async function getAttendanceSummary(studentProfileId?: string) {
  const q = studentProfileId
    ? `?studentProfileId=${encodeURIComponent(studentProfileId)}`
    : "";
  return apiFetch<AttendanceSummary>(`/attendance/student/summary${q}`);
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
