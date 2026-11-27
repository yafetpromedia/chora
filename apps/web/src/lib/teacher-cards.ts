import { apiFetch, apiPost, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type TeacherIdCard = {
  teacherProfileId: string;
  userId: string;
  cardCode: string;
  scanPayload: string;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  pendingPhotoUrl: string | null;
  photoReviewStatus: "NONE" | "PENDING" | "REJECTED";
  photoSubmittedAt: string | null;
  photoReviewedAt: string | null;
  photoReviewNote: string | null;
  hasPendingPhoto: boolean;
  teacherId: string | null;
  email: string;
  phone: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  age: number | null;
  bloodType: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  roleLabel: string;
  homeroom: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolSignatureUrl: string | null;
  schoolSignatureLabel: string | null;
  schoolStampUrl: string | null;
  schoolMotto: string | null;
  schoolJoinCode: string;
  schoolPhone: string | null;
  schoolAddress: string | null;
  schoolPostalBox: string | null;
  schoolEmail: string | null;
  schoolPrimaryColor?: string | null;
  schoolAccentColor?: string | null;
  schoolAccentDeep?: string | null;
  academicYear: string;
  issuedAt: string;
  validThrough: string;
};

export async function listTeacherIdCards() {
  return apiFetch<TeacherIdCard[]>("/schools/teacher-cards");
}

export async function getMyTeacherIdCard() {
  return apiFetch<TeacherIdCard>("/schools/teacher-cards/me");
}

export async function getTeacherIdCard(userId: string) {
  return apiFetch<TeacherIdCard>(
    `/schools/teacher-cards/${encodeURIComponent(userId)}`,
  );
}

export async function backfillTeacherCards() {
  return apiPost<{ idsUpdated: number; cardsUpdated: number; total: number }>(
    "/schools/teacher-cards/backfill",
    {},
  );
}

export function printTeacherIdCard(opts: {
  me?: boolean;
  userId?: string;
  duplex?: boolean;
}) {
  const q = new URLSearchParams();
  if (opts.me) q.set("me", "1");
  if (opts.userId) q.set("userId", opts.userId);
  if (opts.duplex !== false) q.set("duplex", "1");
  window.open(`/print/teacher-id-card?${q}`, "_blank");
}

export async function openClassworkFile(fileUrl: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const url = fileUrl.startsWith("http")
    ? fileUrl
    : `${getApiBaseUrl()}${fileUrl}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not open file");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}
