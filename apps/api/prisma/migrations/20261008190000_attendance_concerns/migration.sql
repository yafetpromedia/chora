-- CreateEnum
CREATE TYPE "ConcernCategory" AS ENUM ('ATTENDANCE');

-- CreateEnum
CREATE TYPE "AttendanceConcernType" AS ENUM ('STUDENT_APPEARS_ABSENT', 'STUDENT_APPEARS_PRESENT', 'COUNT_MISMATCH', 'STUDENT_LEFT_CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceConcernStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ObservedAttendanceStatus" AS ENUM ('PRESENT', 'MISSING', 'LEFT_CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceConcernResolution" AS ENUM ('OFFICIAL_CORRECT', 'CORRECTED_OFFICIAL', 'AUTHORIZED_ABSENCE', 'LEFT_CAMPUS', 'TEMPORARILY_OUTSIDE', 'DUPLICATE_OR_INCORRECT', 'OTHER');

-- CreateTable
CREATE TABLE "AttendanceConcern" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" "ConcernCategory" NOT NULL DEFAULT 'ATTENDANCE',
    "date" DATE NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT,
    "timetableEntryId" TEXT,
    "periodNumber" INTEGER,
    "periodLabel" TEXT,
    "subjectNameSnapshot" TEXT,
    "reportedByUserId" TEXT NOT NULL,
    "officialPresentCount" INTEGER,
    "officialAbsentCount" INTEGER,
    "officialLateCount" INTEGER,
    "officialExcusedCount" INTEGER,
    "officialSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "totalStudents" INTEGER,
    "observedPresentCount" INTEGER,
    "observedAbsentCount" INTEGER,
    "difference" INTEGER,
    "concernType" "AttendanceConcernType" NOT NULL,
    "studentProfileId" TEXT,
    "officialStudentStatus" "AttendanceStatus",
    "observedStudentStatus" "ObservedAttendanceStatus",
    "description" TEXT,
    "status" "AttendanceConcernStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "AttendanceConcernResolution",
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceConcern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceConcernAuditEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "concernId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceConcernAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "kind" TEXT NOT NULL,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceConcern_schoolId_date_status_idx" ON "AttendanceConcern"("schoolId", "date", "status");

-- CreateIndex
CREATE INDEX "AttendanceConcern_schoolId_gradeId_sectionId_date_idx" ON "AttendanceConcern"("schoolId", "gradeId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "AttendanceConcern_reportedByUserId_createdAt_idx" ON "AttendanceConcern"("reportedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceConcern_studentProfileId_date_idx" ON "AttendanceConcern"("studentProfileId", "date");

-- CreateIndex
CREATE INDEX "AttendanceConcern_timetableEntryId_idx" ON "AttendanceConcern"("timetableEntryId");

-- CreateIndex
CREATE INDEX "AttendanceConcernAuditEvent_schoolId_createdAt_idx" ON "AttendanceConcernAuditEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceConcernAuditEvent_concernId_createdAt_idx" ON "AttendanceConcernAuditEvent"("concernId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_userId_readAt_idx" ON "StaffNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "StaffNotification_schoolId_createdAt_idx" ON "StaffNotification"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "AttendanceConcern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
