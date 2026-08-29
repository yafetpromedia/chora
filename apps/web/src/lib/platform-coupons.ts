import type { PlanType } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type CouponKind = "PERCENT_OFF" | "EXTRA_TRIAL_DAYS" | "COMPLIMENTARY";

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
  _count?: { redemptions: number };
};

export function listPlatformCoupons() {
  return platformFetch<PlatformCoupon[]>("/platform/coupons");
}

export function createPlatformCoupon(body: {
  code: string;
  kind: CouponKind;
  percentOff?: number;
  extraDays?: number;
  complimentaryMonths?: number;
  plan?: PlanType;
  maxRedemptions?: number;
  notes?: string;
}) {
  return platformFetch<PlatformCoupon>("/platform/coupons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePlatformCoupon(
  id: string,
  body: { isActive?: boolean; notes?: string },
) {
  return platformFetch<PlatformCoupon>(`/platform/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
