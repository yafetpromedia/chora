-- Attendance permission requests (students/parents seek absence, late, etc.)

CREATE TYPE "AttendancePermissionType" AS ENUM ('ABSENCE', 'LATE', 'EARLY_LEAVE', 'OTHER');

CREATE TYPE "AttendancePermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "AttendancePermissionRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "AttendancePermissionType" NOT NULL,
    "date" DATE NOT NULL,
    "reason" "AttendanceReason",
    "note" TEXT,
    "status" "AttendancePermissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePermissionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendancePermissionRequest_schoolId_status_date_idx" ON "AttendancePermissionRequest"("schoolId", "status", "date");
CREATE INDEX "AttendancePermissionRequest_studentProfileId_date_idx" ON "AttendancePermissionRequest"("studentProfileId", "date");

ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
