import { apiFetch, apiPatch, apiPost, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type ClassworkType = "WORKSHEET" | "ASSIGNMENT";
export type ClassworkStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type ClassSubjectOption = {
  id: string;
  label: string;
  gradeId: string;
  sectionId: string | null;
  subject: { id: string; name: string; code: string };
};

export type ClassworkAssignment = {
  id: string;
  title: string;
  description: string | null;
  type: ClassworkType;
  dueAt: string | null;
  fileUrl: string | null;
  fileName: string | null;
  maxScore: number;
  status: ClassworkStatus;
  publishedAt: string | null;
  createdAt: string;
  classLabel: string;
  submissionCount: number;
  mySubmission?: {
    status: string;
    submittedAt: string | null;
    fileName: string | null;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
  } | null;
};

export type ClassworkSubmission = {
  id: string;
  studentProfileId: string;
  studentName: string;
  studentId: string | null;
  grade: string;
  section: string | null;
  status: string;
  submittedAt: string | null;
  fileUrl: string | null;
  fileName: string | null;
  note: string | null;
};

export function listClassSubjects() {
  return apiFetch<ClassSubjectOption[]>("/schools/classwork/class-subjects");
}

export function listTeacherAssignments(params?: {
  classSubjectId?: string;
  type?: ClassworkType;
}) {
  const q = new URLSearchParams();
  if (params?.classSubjectId) q.set("classSubjectId", params.classSubjectId);
  if (params?.type) q.set("type", params.type);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<ClassworkAssignment[]>(
    `/schools/classwork/assignments${suffix}`,
  );
}

export function createAssignment(body: {
  classSubjectId: string;
  title: string;
  description?: string;
  type: ClassworkType;
  dueAt?: string;
}) {
  return apiPost<ClassworkAssignment>("/schools/classwork/assignments", body);
}

export function updateAssignment(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    type: ClassworkType;
    dueAt: string | null;
  }>,
) {
  return apiPatch<ClassworkAssignment>(
    `/schools/classwork/assignments/${id}`,
    body,
  );
}

export function publishAssignment(id: string) {
  return apiPost<ClassworkAssignment>(
    `/schools/classwork/assignments/${id}/publish`,
    {},
  );
}

export function closeAssignment(id: string) {
  return apiPost<ClassworkAssignment>(
    `/schools/classwork/assignments/${id}/close`,
    {},
  );
}

export function classworkReviewPath(type: ClassworkType, assignmentId: string) {
  return type === "WORKSHEET"
    ? `/teacher/worksheets/${assignmentId}`
    : `/teacher/classwork/${assignmentId}`;
}

export function classworkListPath(type: ClassworkType) {
  return type === "WORKSHEET" ? "/teacher/worksheets" : "/teacher/classwork";
}

export function getTeacherAssignment(id: string) {
  return apiFetch<ClassworkAssignment & { description: string | null }>(
    `/schools/classwork/assignments/${id}`,
  );
}

export function listSubmissions(assignmentId: string) {
  return apiFetch<ClassworkSubmission[]>(
    `/schools/classwork/assignments/${assignmentId}/submissions`,
  );
}

export function gradeSubmission(
  assignmentId: string,
  submissionId: string,
  body: { score: number; feedback?: string },
) {
  return apiPatch<{
    id: string;
    score: number;
    feedback: string | null;
    gradedAt: string;
    status: string;
    maxScore: number;
  }>(
    `/schools/classwork/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    body,
  );
}

export async function uploadAssignmentFile(assignmentId: string, file: File) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${getApiBaseUrl()}/schools/classwork/assignments/${assignmentId}/attachment`,
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
  return res.json() as Promise<{ fileUrl: string; fileName: string }>;
}

export function listStudentAssignments(type?: ClassworkType) {
  const q = type ? `?type=${type}` : "";
  return apiFetch<ClassworkAssignment[]>(`/schools/classwork/student${q}`);
}

export function getStudentAssignment(id: string) {
  return apiFetch<ClassworkAssignment & { description: string | null }>(
    `/schools/classwork/student/${id}`,
  );
}

export async function submitStudentAssignment(
  id: string,
  note?: string,
  file?: File,
) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const form = new FormData();
  if (note) form.append("note", note);
  if (file) form.append("file", file);
  const res = await fetch(
    `${getApiBaseUrl()}/schools/classwork/student/${id}/submit`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Submit failed",
    );
  }
  return res.json();
}
