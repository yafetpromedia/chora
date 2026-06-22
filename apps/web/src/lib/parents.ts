import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type ParentChildLink = {
  profileId: string;
  name: string;
  gradeId: string;
  gradeName: string;
  sectionId: string | null;
  sectionName: string | null;
  studentId: string | null;
};

export type ParentRecord = {
  userId: string;
  username: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  name: string;
  children: ParentChildLink[];
};

export async function listParents() {
  return apiFetch<ParentRecord[]>("/schools/parents");
}

export async function resetParentPassword(userId: string) {
  return apiPost<{ username: string; email: string; tempPassword: string }>(
    `/schools/parents/${userId}/reset-password`,
    {},
  );
}

export async function updateParentAccount(
  userId: string,
  body: { username?: string; password?: string },
) {
  return apiPatch<{
    userId: string;
    username: string;
    email: string;
    phone: string | null;
    name: string;
    passwordUpdated: boolean;
  }>(`/schools/parents/${userId}`, body);
}

