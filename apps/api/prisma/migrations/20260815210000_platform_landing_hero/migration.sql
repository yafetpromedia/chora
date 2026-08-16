-- Public landing / register hero image (URL or data URL).
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "landingHeroImageUrl" TEXT;
