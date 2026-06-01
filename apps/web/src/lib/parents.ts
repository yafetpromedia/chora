import { apiFetch } from "@/lib/api";

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
