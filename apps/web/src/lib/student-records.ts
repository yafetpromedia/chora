import { apiFetch, apiPatch, apiPost, getApiBaseUrl, getUploadApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type StudentRecordSummary = {
  student: {
    profileId: string;
    name: string;
    studentId: string | null;
    email: string;
    grade: string;
    section: string | null;
    status: string;
    graduatedAt: string | null;
    photoUrl: string | null;
  };
  counts: {
    enrollments: number;
    documents: number;
    behaviorRecords: number;
    certificates: number;
  };
  attendance: { total: number; present: number; rate: number | null };
  finance: {
    outstandingCents: number;
    totalPaidCents: number;
    totalDueCents: number;
  } | null;
  health: Record<string, string | null> | null;
};

export type EnrollmentRow = {
  id: string;
  promotionOutcome: string;
  promotionNote: string | null;
  isCurrent: boolean;
  enrolledAt: string;
  academicYear: { id: string; name: string };
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
};

export type Transcript = {
  student: { profileId: string; name: string; studentId: string | null };
  years: Array<{
    academicYear: string;
    grade: string;
    section: string | null;
    promotionOutcome: string;
    yearAverage: number | null;
    terms: Array<{
      termId: string;
      termName: string;
      average: number | null;
      subjects: { subject: string; average: number; letter: string }[];
    }>;
  }>;
  overallAverage: number | null;
  overallGpa: number | null;
};

export function getStudentRecordsSummary(profileId: string) {
  return apiFetch<StudentRecordSummary>(
    `/schools/students/${profileId}/records/summary`,
  );
}

export function getEnrollmentHistory(profileId: string) {
  return apiFetch<EnrollmentRow[]>(
    `/schools/students/${profileId}/records/enrollments`,
  );
}

export function getTranscript(profileId: string) {
  return apiFetch<Transcript>(`/schools/students/${profileId}/records/transcript`);
}

export function openTranscriptPrint(profileId: string) {
  window.open(`/admin/students/${profileId}/history/print`, "_blank");
}

export function openCertificatePrint(profileId: string, certificateId: string) {
  window.open(
    `/admin/students/${profileId}/history/certificate/${certificateId}`,
    "_blank",
  );
}

export function listDocuments(profileId: string) {
  return apiFetch<
    Array<{
      id: string;
      type: string;
      title: string | null;
      fileUrl: string;
      uploadedAt: string;
    }>
  >(`/schools/students/${profileId}/records/documents`);
}

export function listBehavior(profileId: string) {
  return apiFetch<
    Array<{
      id: string;
      date: string;
      type: string;
      note: string | null;
      recordedBy: { firstName: string; lastName: string };
    }>
  >(`/schools/students/${profileId}/records/behavior`);
}

export function createBehavior(
  profileId: string,
  body: { date: string; type: string; note?: string },
) {
  return apiPost(`/schools/students/${profileId}/records/behavior`, body);
}

export function getHealth(profileId: string) {
  return apiFetch<Record<string, string | null> | null>(
    `/schools/students/${profileId}/records/health`,
  );
}

export function updateHealth(profileId: string, body: Record<string, string>) {
  return apiPatch(`/schools/students/${profileId}/records/health`, body);
}

export function listCertificates(profileId: string) {
  return apiFetch<
    Array<{
      id: string;
      type: string;
      certificateNumber: string;
      issuedAt: string;
    }>
  >(`/schools/students/${profileId}/records/certificates`);
}

export function issueCertificate(profileId: string, type: string, note?: string) {
  return apiPost(`/schools/students/${profileId}/records/certificates`, {
    type,
    note,
  });
}

export function previewGraduation(profileId: string) {
  return apiFetch<{
    ready: boolean;
    requirements: { key: string; label: string; met: boolean }[];
  }>(`/schools/students/${profileId}/records/graduation/preview`);
}

export function executeGraduation(profileId: string) {
  return apiPost(`/schools/students/${profileId}/records/graduation`, {});
}

export async function openStudentDocument(fileUrl: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");
  const url = fileUrl.startsWith("http")
    ? fileUrl
    : `${getApiBaseUrl()}${fileUrl}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not open document");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}

export async function uploadDocument(
  profileId: string,
  type: string,
  file: File,
  title?: string,
) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  if (title) form.append("title", title);
  const res = await fetch(
    `${getUploadApiBaseUrl()}/schools/students/${profileId}/records/documents`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Upload failed",
    );
  }
  return res.json();
}
