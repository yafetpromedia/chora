import { apiFetch, apiPost } from "@/lib/api";

export type AttendanceConcernType =
  | "STUDENT_APPEARS_ABSENT"
  | "STUDENT_APPEARS_PRESENT"
  | "COUNT_MISMATCH"
  | "STUDENT_LEFT_CLASS"
  | "OTHER";

export type AttendanceConcernStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED";

export type ObservedAttendanceStatus =
  | "PRESENT"
  | "MISSING"
  | "LEFT_CLASS"
  | "OTHER";

export type AttendanceConcernResolution =
  | "OFFICIAL_CORRECT"
  | "CORRECTED_OFFICIAL"
  | "AUTHORIZED_ABSENCE"
  | "LEFT_CAMPUS"
  | "TEMPORARILY_OUTSIDE"
  | "DUPLICATE_OR_INCORRECT"
  | "OTHER";

export type OfficialAttendanceSummary = {
  totalStudents: number;
  submitted: boolean;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  unmarkedCount: number;
};

export type TodayClassSlot = {
  timetableEntryId: string;
  period: {
    id: string;
    number: number;
    label: string;
    startTime: string | null;
    endTime: string | null;
  };
  subject: { id: string; name: string; code: string };
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  officialAttendance: OfficialAttendanceSummary;
};

export type ClassAttendanceContext = {
  date: string;
  timetableEntryId: string;
  period: TodayClassSlot["period"];
  subject: TodayClassSlot["subject"];
  grade: TodayClassSlot["grade"];
  section: TodayClassSlot["section"];
  room: TodayClassSlot["room"];
  teacher: TodayClassSlot["teacher"];
  officialAttendance: OfficialAttendanceSummary;
  roster: Array<{
    studentProfileId: string;
    name: string;
    officialStatus: string | null;
    approvedLeave?: string[];
    hints?: string[];
  }>;
  message: string | null;
};

export type AttendanceConcern = {
  id: string;
  date: string;
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
  subject: { id: string | null; name: string; code: string | null } | null;
  periodNumber: number | null;
  periodLabel: string | null;
  reportedBy: { id: string; name: string };
  officialPresentCount: number | null;
  officialAbsentCount: number | null;
  officialSubmitted: boolean;
  totalStudents: number | null;
  observedPresentCount: number | null;
  observedAbsentCount: number | null;
  difference: number | null;
  concernType: AttendanceConcernType;
  student: { id: string; name: string } | null;
  officialStudentStatus: string | null;
  observedStudentStatus: ObservedAttendanceStatus | null;
  description: string | null;
  status: AttendanceConcernStatus;
  resolution: AttendanceConcernResolution | null;
  resolutionNote: string | null;
  resolvedBy: { id: string; name: string } | null;
  createdAt: string;
  leaveContext?: Array<{ type: string; status: string; note: string | null }>;
  indicators?: string[];
};

export async function getMyClassesToday() {
  return apiFetch<{
    date: string;
    slots: TodayClassSlot[];
  }>("/attendance/my-classes/today");
}

export async function getClassAttendanceContext(
  timetableEntryId: string,
  date?: string,
) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<ClassAttendanceContext>(
    `/attendance/classes/${timetableEntryId}/context${q}`,
  );
}

export async function createAttendanceConcern(body: {
  timetableEntryId: string;
  date?: string;
  concernType: AttendanceConcernType;
  observedPresentCount?: number;
  observedAbsentCount?: number;
  studentProfileId?: string;
  observedStudentStatus?: ObservedAttendanceStatus;
  description?: string;
  acknowledgeDuplicate?: boolean;
}) {
  return apiPost<AttendanceConcern>("/attendance/concerns", body);
}

export async function listAttendanceConcerns(params?: {
  date?: string;
  gradeId?: string;
  sectionId?: string;
  status?: AttendanceConcernStatus;
  concernType?: AttendanceConcernType;
  reportedByUserId?: string;
  subjectId?: string;
  mine?: boolean;
  page?: number;
}) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.gradeId) q.set("gradeId", params.gradeId);
  if (params?.sectionId) q.set("sectionId", params.sectionId);
  if (params?.status) q.set("status", params.status);
  if (params?.concernType) q.set("concernType", params.concernType);
  if (params?.reportedByUserId) q.set("reportedByUserId", params.reportedByUserId);
  if (params?.subjectId) q.set("subjectId", params.subjectId);
  if (params?.mine) q.set("mine", "1");
  if (params?.page) q.set("page", String(params.page));
  const qs = q.toString();
  return apiFetch<{
    total: number;
    page: number;
    pageSize: number;
    items: AttendanceConcern[];
  }>(`/attendance/concerns${qs ? `?${qs}` : ""}`);
}

export async function getAttendanceConcernsSummary() {
  return apiFetch<{
    open: number;
    resolved: number;
    today: number;
    items: AttendanceConcern[];
  }>("/attendance/concerns/summary");
}

export async function getAttendanceConcern(id: string) {
  return apiFetch<AttendanceConcern>(`/attendance/concerns/${id}`);
}

export async function reviewAttendanceConcern(id: string) {
  return apiPost<AttendanceConcern>(`/attendance/concerns/${id}/review`, {});
}

export async function resolveAttendanceConcern(
  id: string,
  body: { resolution: AttendanceConcernResolution; resolutionNote?: string },
) {
  return apiPost<AttendanceConcern>(`/attendance/concerns/${id}/resolve`, body);
}

export async function dismissAttendanceConcern(
  id: string,
  body: { resolution: AttendanceConcernResolution; resolutionNote?: string },
) {
  return apiPost<AttendanceConcern>(`/attendance/concerns/${id}/dismiss`, body);
}

export const CONCERN_TYPE_LABELS: Record<AttendanceConcernType, string> = {
  STUDENT_APPEARS_ABSENT: "Student appears absent",
  STUDENT_APPEARS_PRESENT: "Student appears present but marked absent",
  COUNT_MISMATCH: "Attendance count does not match",
  STUDENT_LEFT_CLASS: "Student left the class",
  OTHER: "Other attendance concern",
};

export const RESOLUTION_LABELS: Record<AttendanceConcernResolution, string> = {
  OFFICIAL_CORRECT: "Confirm official attendance was correct",
  CORRECTED_OFFICIAL: "Correct official attendance",
  AUTHORIZED_ABSENCE: "Student had authorized absence",
  LEFT_CAMPUS: "Student had left campus",
  TEMPORARILY_OUTSIDE: "Student was temporarily outside class",
  DUPLICATE_OR_INCORRECT: "Duplicate/incorrect concern",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<AttendanceConcernStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};
