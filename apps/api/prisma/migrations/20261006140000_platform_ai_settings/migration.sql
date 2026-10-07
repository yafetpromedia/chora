-- Platform-admin AI provider settings (Gemini / OpenAI / FreeModel)
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "aiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "aiProvider" TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "aiApiKey" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "aiModel" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "aiBaseUrl" TEXT;
