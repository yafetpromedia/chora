-- Teacher ID cards + classwork assignments

CREATE TYPE "ClassworkType" AS ENUM ('WORKSHEET', 'ASSIGNMENT');
CREATE TYPE "ClassworkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "ClassworkSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LATE');

ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "cardCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_schoolId_cardCode_key"
  ON "TeacherProfile"("schoolId", "cardCode");

CREATE TABLE "ClassworkAssignment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classSubjectId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "ClassworkType" NOT NULL,
  "dueAt" TIMESTAMP(3),
  "fileUrl" TEXT,
  "fileName" TEXT,
  "status" "ClassworkStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassworkAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassworkSubmission" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "status" "ClassworkSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3),
  "fileUrl" TEXT,
  "fileName" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassworkSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassworkSubmission_assignmentId_studentProfileId_key"
  ON "ClassworkSubmission"("assignmentId", "studentProfileId");
CREATE INDEX "ClassworkSubmission_studentProfileId_idx"
  ON "ClassworkSubmission"("studentProfileId");
CREATE INDEX "ClassworkAssignment_schoolId_classSubjectId_status_idx"
  ON "ClassworkAssignment"("schoolId", "classSubjectId", "status");
CREATE INDEX "ClassworkAssignment_schoolId_createdByUserId_idx"
  ON "ClassworkAssignment"("schoolId", "createdByUserId");

ALTER TABLE "ClassworkAssignment"
  ADD CONSTRAINT "ClassworkAssignment_classSubjectId_fkey"
  FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassworkAssignment"
  ADD CONSTRAINT "ClassworkAssignment_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassworkSubmission"
  ADD CONSTRAINT "ClassworkSubmission_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "ClassworkAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassworkSubmission"
  ADD CONSTRAINT "ClassworkSubmission_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
