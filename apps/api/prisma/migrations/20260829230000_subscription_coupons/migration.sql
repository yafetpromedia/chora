-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CouponKind" AS ENUM ('PERCENT_OFF', 'EXTRA_TRIAL_DAYS', 'COMPLIMENTARY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "kind" "CouponKind" NOT NULL,
  "percentOff" INTEGER NOT NULL DEFAULT 0,
  "extraDays" INTEGER NOT NULL DEFAULT 0,
  "complimentaryMonths" INTEGER NOT NULL DEFAULT 1,
  "plan" "Plan",
  "maxRedemptions" INTEGER,
  "redeemedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "appliedBy" TEXT,
  "result" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_schoolId_key" ON "CouponRedemption"("couponId", "schoolId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_schoolId_idx" ON "CouponRedemption"("schoolId");

ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_couponId_fkey";
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_schoolId_fkey";
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
