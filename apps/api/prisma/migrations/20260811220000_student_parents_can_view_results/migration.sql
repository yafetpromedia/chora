-- Student privacy: allow hiding results from linked parents (default still visible).
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "parentsCanViewResults" BOOLEAN NOT NULL DEFAULT true;
