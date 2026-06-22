-- Classwork instant grading
ALTER TYPE "ClassworkSubmissionStatus" ADD VALUE IF NOT EXISTS 'GRADED';

ALTER TABLE "ClassworkAssignment" ADD COLUMN IF NOT EXISTS "maxScore" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "ClassworkSubmission" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "ClassworkSubmission" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "ClassworkSubmission" ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3);
ALTER TABLE "ClassworkSubmission" ADD COLUMN IF NOT EXISTS "gradedByUserId" TEXT;

DO $$ BEGIN
  ALTER TABLE "ClassworkSubmission"
    ADD CONSTRAINT "ClassworkSubmission_gradedByUserId_fkey"
    FOREIGN KEY ("gradedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
