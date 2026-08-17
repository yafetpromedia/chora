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
  teacherId: string | null;
  email: string;
  phone: string | null;
  roleLabel: string;
  homeroom: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolSignatureUrl: string | null;
  schoolSignatureLabel: string | null;
  schoolJoinCode: string;
  schoolPhone: string | null;
  schoolAddress: string | null;
  schoolEmail: string | null;
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

export async function backfillTeacherCards() {
  return apiPost<{ idsUpdated: number; cardsUpdated: number; total: number }>(
    "/schools/teacher-cards/backfill",
    {},
  );
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
