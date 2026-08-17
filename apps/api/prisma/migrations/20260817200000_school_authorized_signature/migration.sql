-- AlterTable
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "authorizedSignatureUrl" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "authorizedSignatureLabel" TEXT;
