import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type CouponKind = "PERCENT_OFF" | "EXTRA_TRIAL_DAYS" | "COMPLIMENTARY";

export type CouponRedemption = {
  id: string;
  schoolId: string;
  result: string | null;
  createdAt: string;
  school: { id: string; name: string; joinCode: string };
};

export type PlatformCoupon = {
  id: string;
  code: string;
  kind: CouponKind;
  percentOff: number;
  extraDays: number;
  complimentaryMonths: number;
  plan: PlanType | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { redemptions: number };
  redemptions?: CouponRedemption[];
};

export type CreateCouponInput = {
  code: string;
  kind: CouponKind;
  percentOff?: number;
  extraDays?: number;
  complimentaryMonths?: number;
  plan?: PlanType;
  maxRedemptions?: number;
  expiresAt?: string;
  notes?: string;
};

export type UpdateCouponInput = {
  isActive?: boolean;
  notes?: string | null;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  percentOff?: number;
  extraDays?: number;
  complimentaryMonths?: number;
  plan?: PlanType | null;
};

export function listPlatformCoupons() {
  return platformFetch<PlatformCoupon[]>("/platform/coupons");
}

export function createPlatformCoupon(body: CreateCouponInput) {
  return platformFetch<PlatformCoupon>("/platform/coupons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePlatformCoupon(id: string, body: UpdateCouponInput) {
  return platformFetch<PlatformCoupon>(`/platform/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
