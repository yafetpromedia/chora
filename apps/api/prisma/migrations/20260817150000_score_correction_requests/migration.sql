-- CreateEnum
CREATE TYPE "ScoreCorrectionStatus" AS ENUM ('OPEN', 'PROPOSED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ScoreCorrectionRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "teacherId" TEXT,
    "message" TEXT NOT NULL,
    "currentScore" INTEGER,
    "proposedScore" INTEGER,
    "status" "ScoreCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_schoolId_status_createdAt_idx" ON "ScoreCorrectionRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_teacherId_status_idx" ON "ScoreCorrectionRequest"("teacherId", "status");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_studentProfileId_status_idx" ON "ScoreCorrectionRequest"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_assessmentId_studentProfileId_idx" ON "ScoreCorrectionRequest"("assessmentId", "studentProfileId");

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
