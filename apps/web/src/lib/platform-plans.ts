import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type PlatformPlanCatalog = {
  plan: PlanType;
  label: string;
  description: string;
  students: number | null;
  teachers: number | null;
  admins: number | null;
  usdMonthly: number;
  etbMonthly: number;
  features: string[];
  trialDays: number | null;
  sortOrder: number;
  isListed: boolean;
};

export type UpdatePlatformPlanInput = Partial<{
  label: string;
  description: string;
  studentsLimit: number | null;
  teachersLimit: number | null;
  adminsLimit: number | null;
  usdMonthly: number;
  etbMonthly: number;
  features: string[];
  trialDays: number | null;
  isListed: boolean;
}>;

export async function getPlatformPlans() {
  return platformFetch<PlatformPlanCatalog[]>("/platform/plans");
}

export async function updatePlatformPlan(plan: PlanType, body: UpdatePlatformPlanInput) {
  return platformFetch<PlatformPlanCatalog>(`/platform/plans/${plan}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function setSchoolPlan(
  schoolId: string,
  body: { plan: PlanType; isActive?: boolean; trialEndsAt?: string | null },
) {
  return platformFetch<{ schoolId: string; subscription: { plan: string; isActive: boolean } }>(
    `/platform/schools/${schoolId}/plan`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}
