import { apiFetch, apiPost } from "@/lib/api";
import type { AttendanceStatus } from "@/lib/attendance";

export type StudentIdCard = {
  studentProfileId: string;
  cardCode: string;
  scanPayload: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  photoUrl: string | null;
  grade: string;
  section: string | null;
  studentId: string | null;
  /** Fayeda FAN (16 digits) or FCN (12 digits) — single national identifier */
  fan: string | null;
  address: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolJoinCode: string;
  schoolPhone: string | null;
  schoolAddress: string | null;
  schoolEmail: string | null;
  validThrough: string;
  academicYear: string;
  issuedAt: string;
  fatherName: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export type ScanAttendanceResult = {
  studentProfileId: string;
  name: string;
  grade: string;
  section: string | null;
  cardCode: string | null;
  status: AttendanceStatus;
  scannedAt: string;
};

export async function countStudentIdCards(params?: {
  gradeId?: string;
  sectionId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.gradeId) q.set("gradeId", params.gradeId);
  if (params?.sectionId) q.set("sectionId", params.sectionId);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<{ count: number }>(`/schools/student-cards/count${suffix}`);
}

export async function listStudentIdCards(params?: {
  gradeId?: string;
  sectionId?: string;
  skip?: number;
  take?: number;
}) {
  const q = new URLSearchParams();
  if (params?.gradeId) q.set("gradeId", params.gradeId);
  if (params?.sectionId) q.set("sectionId", params.sectionId);
  if (params?.skip !== undefined) q.set("skip", String(params.skip));
  if (params?.take !== undefined) q.set("take", String(params.take));
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<StudentIdCard[]>(`/schools/student-cards${suffix}`);
}

export async function getStudentIdCard(studentProfileId: string) {
  return apiFetch<StudentIdCard>(`/schools/students/${studentProfileId}/card`);
}

export async function getMyStudentIdCard() {
  return apiFetch<StudentIdCard>("/schools/me/student-id-card");
}

export async function getChildStudentIdCard(studentProfileId: string) {
  return apiFetch<StudentIdCard>(`/schools/me/children/${studentProfileId}/id-card`);
}

export async function backfillStudentCardCodes() {
  return apiPost<{ updated: number; total: number }>("/schools/student-cards/backfill", {});
}

export async function scanStudentAttendance(body: {
  code: string;
  date: string;
  gradeId: string;
  sectionId?: string;
  periodNumber?: number;
}) {
  return apiPost<ScanAttendanceResult>("/attendance/scan", body);
}
