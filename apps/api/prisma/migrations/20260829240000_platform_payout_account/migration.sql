ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "telebirrNumber" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "telebirrAccountName" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "payoutInstructions" TEXT;
