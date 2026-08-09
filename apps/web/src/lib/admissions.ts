import { apiDelete, apiFetch, apiPatch, apiPost } from "@/lib/api";

export type AdmissionStatus =
  | "APPLIED"
  | "SCORED"
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "ENROLLED"
  | "WITHDRAWN";

export type AdmissionCycle = {
  id: string;
  name: string;
  isOpen: boolean;
  autoPlaceOnScore: boolean;
  autoAcceptOnPlace: boolean;
  autoEnrollOnPlace: boolean;
  createdAt: string;
  academicYear: { id: string; name: string; isCurrent: boolean };
  _count: { applications: number; placementRules: number };
};

export type AdmissionApplication = {
  id: string;
  cycleId: string;
  status: AdmissionStatus;
  firstName: string;
  lastName: string;
  middleName: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  idNumber: string | null;
  phone: string | null;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  email: string | null;
  targetGradeId: string | null;
  targetGrade: { id: string; name: string } | null;
  entranceScore: number | null;
  interviewScore: number | null;
  totalScore: number | null;
  placedGradeId: string | null;
  placedGrade: { id: string; name: string } | null;
  placedSectionId: string | null;
  placedSection: { id: string; name: string } | null;
  placementRule: { id: string; label: string } | null;
  placementNote: string | null;
  enrolledProfileId: string | null;
  enrolledProfile: {
    id: string;
    user: { firstName: string; lastName: string; externalRef: string | null };
  } | null;
  appliedAt: string;
  placedAt: string | null;
  enrolledAt: string | null;
  notes: string | null;
};

export type PlacementRule = {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  targetGradeId: string;
  targetSectionId: string | null;
  streamMatch: string | null;
  sortOrder: number;
  isActive: boolean;
  targetGrade: { id: string; name: string };
  targetSection: { id: string; name: string } | null;
};

export type CreateApplicationPayload = {
  cycleId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  idNumber?: string;
  phone?: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  email?: string;
  targetGradeId?: string;
  entranceScore?: number;
  interviewScore?: number;
  notes?: string;
};

export async function listAdmissionCycles() {
  return apiFetch<AdmissionCycle[]>("/schools/admissions/cycles");
}

export async function ensureDefaultAdmissionCycle() {
  return apiPost<AdmissionCycle>("/schools/admissions/cycles/ensure-default", {});
}

export async function createAdmissionCycle(body: {
  name: string;
  academicYearId: string;
  isOpen?: boolean;
  autoPlaceOnScore?: boolean;
  autoAcceptOnPlace?: boolean;
  autoEnrollOnPlace?: boolean;
}) {
  return apiPost<AdmissionCycle>("/schools/admissions/cycles", body);
}

export async function updateAdmissionCycle(
  cycleId: string,
  body: {
    isOpen?: boolean;
    autoPlaceOnScore?: boolean;
    autoAcceptOnPlace?: boolean;
    autoEnrollOnPlace?: boolean;
  },
) {
  return apiPatch<AdmissionCycle>(`/schools/admissions/cycles/${cycleId}`, body);
}

export async function listAdmissionApplications(params?: {
  cycleId?: string;
  status?: AdmissionStatus;
}) {
  const q = new URLSearchParams();
  if (params?.cycleId) q.set("cycleId", params.cycleId);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<AdmissionApplication[]>(`/schools/admissions/applications${suffix}`);
}

export async function createAdmissionApplication(body: CreateApplicationPayload) {
  return apiPost<AdmissionApplication>("/schools/admissions/applications", body);
}

export async function updateAdmissionApplication(
  id: string,
  body: Partial<CreateApplicationPayload> & {
    status?: AdmissionStatus;
    placedGradeId?: string;
    placedSectionId?: string;
  },
) {
  return apiPatch<AdmissionApplication>(`/schools/admissions/applications/${id}`, body);
}

export async function deleteAdmissionApplication(id: string) {
  return apiDelete<{ removed: boolean; id: string }>(
    `/schools/admissions/applications/${id}`,
  );
}

export async function enrollAdmissionApplication(id: string) {
  return apiPost<{
    applicationId: string;
    student: {
      student: { id: string; studentId: string; name: string };
      credentials: { studentTempPassword: string; portalUsername: string };
    };
  }>(`/schools/admissions/applications/${id}/enroll`, {});
}

export async function listPlacementRules(cycleId: string) {
  return apiFetch<PlacementRule[]>(
    `/schools/admissions/cycles/${cycleId}/placement-rules`,
  );
}

export async function createPlacementRule(
  cycleId: string,
  body: {
    label: string;
    minScore: number;
    maxScore: number;
    targetGradeId: string;
    targetSectionId?: string;
    streamMatch?: string;
    sortOrder?: number;
  },
) {
  return apiPost<PlacementRule>(
    `/schools/admissions/cycles/${cycleId}/placement-rules`,
    body,
  );
}

export async function updatePlacementRule(
  cycleId: string,
  ruleId: string,
  body: {
    label?: string;
    minScore?: number;
    maxScore?: number;
    targetGradeId?: string;
    targetSectionId?: string | null;
    streamMatch?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return apiPatch<PlacementRule>(
    `/schools/admissions/cycles/${cycleId}/placement-rules/${ruleId}`,
    body,
  );
}

export async function deletePlacementRule(cycleId: string, ruleId: string) {
  return apiDelete<{ removed: boolean; id: string }>(
    `/schools/admissions/cycles/${cycleId}/placement-rules/${ruleId}`,
  );
}

export async function seedStreamPlacementRules(cycleId: string, gradeId: string) {
  return apiPost<PlacementRule[]>(
    `/schools/admissions/cycles/${cycleId}/placement-rules/seed-streams`,
    { gradeId },
  );
}

export async function seedGradePlacementRules(cycleId: string, gradeId: string) {
  return apiPost<PlacementRule[]>(
    `/schools/admissions/cycles/${cycleId}/placement-rules/seed-grade`,
    { gradeId },
  );
}

export async function runAdmissionPlacement(
  cycleId: string,
  body?: { includePlaced?: boolean },
) {
  return apiPost<{
    placed: number;
    unmatched: number;
    total: number;
    results: { id: string; ok: boolean; note?: string }[];
  }>(`/schools/admissions/cycles/${cycleId}/run-placement`, body ?? {});
}

export async function bulkEnrollAdmissionCycle(cycleId: string) {
  return apiPost<{
    enrolled: number;
    failed: number;
    results: { id: string; ok: boolean; error?: string; studentId?: string }[];
  }>(`/schools/admissions/cycles/${cycleId}/bulk-enroll`, {});
}
