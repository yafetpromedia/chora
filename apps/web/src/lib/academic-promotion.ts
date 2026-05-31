import { apiFetch, apiPost } from "@/lib/api";

export type PromotionPreview = {
  fromYear: {
    id: string;
    name: string;
    isCurrent: boolean;
    enrollmentRecords: number;
  };
  suggestedToYear: { id: string; name: string } | null;
  availableTargetYears: { id: string; name: string; isCurrent: boolean }[];
  mappings: {
    fromGradeId: string;
    fromGradeName: string;
    studentCount: number;
    suggestedToGradeId: string | null;
    suggestedToGradeName: string;
  }[];
  totalStudents: number;
};

export type PromotionResult = {
  promoted: number;
  graduated: number;
  skipped: number;
  fromYearId: string;
  toYearId: string;
  message: string;
};

export async function getPromotionPreview(fromYearId: string) {
  return apiFetch<PromotionPreview>(
    `/results/promotion/preview?fromYearId=${fromYearId}`,
  );
}

export async function executePromotion(body: {
  fromYearId: string;
  toYearId: string;
  mappings: { fromGradeId: string; toGradeId?: string | null }[];
  setToYearCurrent?: boolean;
}) {
  return apiPost<PromotionResult>("/results/promotion/execute", body);
}

export async function syncEnrollments() {
  return apiPost<{ synced: number; academicYearName?: string }>(
    "/results/enrollments/sync",
    {},
  );
}
