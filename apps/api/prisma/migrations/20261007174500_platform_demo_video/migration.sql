-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "demoVideoUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "demoVideoThumbnailUrl" TEXT;
