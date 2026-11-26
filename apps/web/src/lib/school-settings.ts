import { apiFetch, apiPatch, type SchoolType } from "@/lib/api";
import type { AttendanceMode } from "@/lib/attendance";

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export const WEEKDAY_OPTIONS: { value: Weekday; label: string; short: string }[] =
  [
    { value: "MONDAY", label: "Monday", short: "Mon" },
    { value: "TUESDAY", label: "Tuesday", short: "Tue" },
    { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
    { value: "THURSDAY", label: "Thursday", short: "Thu" },
    { value: "FRIDAY", label: "Friday", short: "Fri" },
    { value: "SATURDAY", label: "Saturday", short: "Sat" },
    { value: "SUNDAY", label: "Sunday", short: "Sun" },
  ];

export const DEFAULT_WEEKEND_DAYS: Weekday[] = ["SATURDAY", "SUNDAY"];

export type SchoolSettings = {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  logoUrl: string | null;
  authorizedSignatureUrl: string | null;
  authorizedSignatureLabel: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  accentDeep: string | null;
  schoolType: SchoolType | null;
  address: string | null;
  postalBox: string | null;
  email: string | null;
  country: string | null;
  phone: string | null;
  setupComplete: boolean;
  gradePreset: string | null;
  attendanceMode: AttendanceMode;
  /** Days with no school — attendance is not expected / not marked. */
  weekendDays: Weekday[];
  status: string;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  telebirrNumber: string | null;
  telebirrAccountName: string | null;
  paymentInstructions: string | null;
  reportCardTitle: string | null;
  reportCardTagline: string | null;
  nameAm: string | null;
  stampUrl: string | null;
  idCardShowStamp: boolean;
  reportCoverImageUrl: string | null;
  reportShowRank: boolean;
  reportShowAttendance: boolean;
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
  postalBox?: string;
  email?: string;
  phone?: string;
  country?: string;
  logoUrl?: string;
  authorizedSignatureUrl?: string;
  authorizedSignatureLabel?: string;
  primaryColor?: string | null;
  accentColor?: string | null;
  accentDeep?: string | null;
  attendanceMode?: AttendanceMode;
  weekendDays?: Weekday[];
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  telebirrNumber?: string;
  telebirrAccountName?: string;
  paymentInstructions?: string;
  reportCardTitle?: string;
  reportCardTagline?: string;
  nameAm?: string;
  stampUrl?: string;
  reportCoverImageUrl?: string;
  idCardShowStamp?: boolean;
  reportShowRank?: boolean;
  reportShowAttendance?: boolean;
};

export async function updateSchoolSettings(body: UpdateSchoolSettingsPayload) {
  return apiPatch<SchoolSettings>("/schools/settings", body);
}
