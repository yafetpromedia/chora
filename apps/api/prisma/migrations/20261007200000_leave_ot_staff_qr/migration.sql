-- AlterTable School
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "staffOvertimeEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable StaffAttendanceRecord
ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "overtimeMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LeaveRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- LeaveType
CREATE TABLE IF NOT EXISTS "LeaveType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "countsTowardBalance" BOOLEAN NOT NULL DEFAULT true,
    "annualAllocationDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveType_schoolId_slug_key" ON "LeaveType"("schoolId", "slug");
CREATE INDEX IF NOT EXISTS "LeaveType_schoolId_active_idx" ON "LeaveType"("schoolId", "active");
DO $$ BEGIN
  ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- LeaveRequest
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_status_startDate_idx" ON "LeaveRequest"("schoolId", "status", "startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_startDate_idx" ON "LeaveRequest"("userId", "startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_leaveTypeId_idx" ON "LeaveRequest"("schoolId", "leaveTypeId");
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey"
    FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- LeaveBalance
CREATE TABLE IF NOT EXISTS "LeaveBalance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveBalance_schoolId_userId_leaveTypeId_year_key"
  ON "LeaveBalance"("schoolId", "userId", "leaveTypeId", "year");
CREATE INDEX IF NOT EXISTS "LeaveBalance_schoolId_year_idx" ON "LeaveBalance"("schoolId", "year");
DO $$ BEGIN
  ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey"
    FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- StaffQrCredential
CREATE TABLE IF NOT EXISTS "StaffQrCredential" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffQrCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StaffQrCredential_userId_key" ON "StaffQrCredential"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffQrCredential_schoolId_token_key" ON "StaffQrCredential"("schoolId", "token");
CREATE INDEX IF NOT EXISTS "StaffQrCredential_schoolId_active_idx" ON "StaffQrCredential"("schoolId", "active");
DO $$ BEGIN
  ALTER TABLE "StaffQrCredential" ADD CONSTRAINT "StaffQrCredential_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "StaffQrCredential" ADD CONSTRAINT "StaffQrCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
