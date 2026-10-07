-- AlterTable
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "staffCheckInTime" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "staffCheckOutTime" TEXT NOT NULL DEFAULT '17:00';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "staffGraceMinutes" INTEGER NOT NULL DEFAULT 10;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StaffAttendanceStatus" AS ENUM ('present', 'late', 'absent', 'half_day', 'on_leave', 'excused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffAttendanceRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "expectedCheckInAt" TIMESTAMP(3),
    "expectedCheckOutAt" TIMESTAMP(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER,
    "reason" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_schoolId_userId_date_key"
  ON "StaffAttendanceRecord"("schoolId", "userId", "date");
CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_schoolId_date_idx"
  ON "StaffAttendanceRecord"("schoolId", "date");
CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_userId_date_idx"
  ON "StaffAttendanceRecord"("userId", "date");

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceRecord"
    ADD CONSTRAINT "StaffAttendanceRecord_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceRecord"
    ADD CONSTRAINT "StaffAttendanceRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceRecord"
    ADD CONSTRAINT "StaffAttendanceRecord_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceRecord"
    ADD CONSTRAINT "StaffAttendanceRecord_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffAttendanceCorrection" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "previousStatus" "StaffAttendanceStatus" NOT NULL,
    "newStatus" "StaffAttendanceStatus" NOT NULL,
    "previousCheckInAt" TIMESTAMP(3),
    "newCheckInAt" TIMESTAMP(3),
    "previousCheckOutAt" TIMESTAMP(3),
    "newCheckOutAt" TIMESTAMP(3),
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendanceCorrection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffAttendanceCorrection_schoolId_createdAt_idx"
  ON "StaffAttendanceCorrection"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "StaffAttendanceCorrection_recordId_idx"
  ON "StaffAttendanceCorrection"("recordId");

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceCorrection"
    ADD CONSTRAINT "StaffAttendanceCorrection_recordId_fkey"
    FOREIGN KEY ("recordId") REFERENCES "StaffAttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "StaffAttendanceCorrection"
    ADD CONSTRAINT "StaffAttendanceCorrection_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
