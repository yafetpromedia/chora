ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialInstagramUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialFacebookUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialLinkedinUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialYoutubeUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialTiktokUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "socialGithubUrl" TEXT;

UPDATE "PlatformSettings"
SET
  "socialInstagramUrl" = COALESCE("socialInstagramUrl", 'https://www.instagram.com/yafetpromedia/'),
  "socialFacebookUrl" = COALESCE("socialFacebookUrl", 'https://www.facebook.com/yafetpromedia'),
  "socialLinkedinUrl" = COALESCE("socialLinkedinUrl", 'https://www.linkedin.com/company/yafet-promedia'),
  "socialYoutubeUrl" = COALESCE("socialYoutubeUrl", 'https://www.youtube.com/@yafetpromedia'),
  "socialTiktokUrl" = COALESCE("socialTiktokUrl", 'https://www.tiktok.com/@yafetpromedia'),
  "socialGithubUrl" = COALESCE("socialGithubUrl", 'https://github.com/yafetpromedia/chora')
WHERE id = 'default';
