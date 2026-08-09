-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('APPLIED', 'SCORED', 'PLACED', 'ACCEPTED', 'REJECTED', 'ENROLLED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "AdmissionCycle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'APPLIED',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "idNumber" TEXT,
    "phone" TEXT,
    "fatherName" TEXT NOT NULL,
    "fatherPhone" TEXT NOT NULL,
    "motherName" TEXT NOT NULL,
    "motherPhone" TEXT NOT NULL,
    "email" TEXT,
    "targetGradeId" TEXT,
    "entranceScore" INTEGER,
    "interviewScore" INTEGER,
    "totalScore" INTEGER,
    "placedGradeId" TEXT,
    "placedSectionId" TEXT,
    "placementRuleId" TEXT,
    "placementNote" TEXT,
    "enrolledProfileId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionPlacementRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "targetGradeId" TEXT NOT NULL,
    "targetSectionId" TEXT,
    "streamMatch" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdmissionPlacementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmissionCycle_schoolId_isOpen_idx" ON "AdmissionCycle"("schoolId", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionCycle_schoolId_academicYearId_name_key" ON "AdmissionCycle"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_cycleId_status_idx" ON "AdmissionApplication"("schoolId", "cycleId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_totalScore_idx" ON "AdmissionApplication"("schoolId", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_enrolledProfileId_key" ON "AdmissionApplication"("enrolledProfileId");

-- CreateIndex
CREATE INDEX "AdmissionPlacementRule_cycleId_sortOrder_idx" ON "AdmissionPlacementRule"("cycleId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AdmissionCycle" ADD CONSTRAINT "AdmissionCycle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionCycle" ADD CONSTRAINT "AdmissionCycle_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AdmissionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_targetGradeId_fkey" FOREIGN KEY ("targetGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placedGradeId_fkey" FOREIGN KEY ("placedGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placedSectionId_fkey" FOREIGN KEY ("placedSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placementRuleId_fkey" FOREIGN KEY ("placementRuleId") REFERENCES "AdmissionPlacementRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_enrolledProfileId_fkey" FOREIGN KEY ("enrolledProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AdmissionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_targetGradeId_fkey" FOREIGN KEY ("targetGradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_targetSectionId_fkey" FOREIGN KEY ("targetSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
