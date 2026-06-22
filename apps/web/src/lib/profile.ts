import { apiFetch, apiPatch } from "@/lib/api";

export type UserProfile = {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    externalRef: string | null;
    roleTemplateSlug: string | null;
    roleTemplateName: string | null;
    permissions: string[];
    createdAt: string;
  };
  school: { id: string; name: string; joinCode: string };
  student: {
    grade: string;
    section: string | null;
    fan: string | null;
    dateOfBirth: Date | string | null;
  } | null;
  teacher: {
    homeroomGrade: string | null;
    homeroomSection: string | null;
  } | null;
  children: { name: string; grade: string; section: string | null }[];
};

export type UpdateProfilePayload = {
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  newPassword?: string;
};

export async function getMyProfile() {
  return apiFetch<UserProfile>("/auth/profile");
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  return apiPatch<UserProfile>("/auth/profile", payload);
}
