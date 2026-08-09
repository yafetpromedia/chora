import { apiFetch, apiPatch, type SchoolType } from "@/lib/api";
import type { AttendanceMode } from "@/lib/attendance";

export type SchoolSettings = {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  logoUrl: string | null;
  schoolType: SchoolType | null;
  address: string | null;
  email: string | null;
  country: string | null;
  phone: string | null;
  setupComplete: boolean;
  gradePreset: string | null;
  attendanceMode: AttendanceMode;
  status: string;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  paymentInstructions: string | null;
  reportCardTitle: string | null;
  reportCardTagline: string | null;
};

export async function getSchoolSettings() {
  const res = await apiFetch<{ school: SchoolSettings | null }>("/schools/me");
  if (!res.school) {
    throw new Error("School not found");
  }
  return res.school;
}

export type UpdateSchoolSettingsPayload = {
  name?: string;
  schoolType?: SchoolType;
  address?: string;
  email?: string;
  phone?: string;
  country?: string;
  logoUrl?: string;
  attendanceMode?: AttendanceMode;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  paymentInstructions?: string;
  reportCardTitle?: string;
  reportCardTagline?: string;
};

export async function updateSchoolSettings(body: UpdateSchoolSettingsPayload) {
  return apiPatch<SchoolSettings>("/schools/settings", body);
}
