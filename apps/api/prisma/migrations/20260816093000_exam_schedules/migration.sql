-- CreateEnum
CREATE TYPE "ExamScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ExamSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "academicTermId" TEXT,
    "title" TEXT NOT NULL,
    "shiftLabel" TEXT,
    "notes" TEXT,
    "status" "ExamScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamScheduleDay" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "isStudyDay" BOOLEAN NOT NULL DEFAULT false,
    "studyNote" TEXT,
    "defaultStartTime" TEXT,
    "defaultEndTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamScheduleSlot" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectLabel" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamSchedule_schoolId_academicYearId_idx" ON "ExamSchedule"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "ExamSchedule_schoolId_status_idx" ON "ExamSchedule"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ExamScheduleDay_scheduleId_sortOrder_idx" ON "ExamScheduleDay"("scheduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamScheduleDay_schoolId_examDate_idx" ON "ExamScheduleDay"("schoolId", "examDate");

-- CreateIndex
CREATE INDEX "ExamScheduleSlot_dayId_gradeId_sortOrder_idx" ON "ExamScheduleSlot"("dayId", "gradeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamScheduleSlot_schoolId_idx" ON "ExamScheduleSlot"("schoolId");

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleDay" ADD CONSTRAINT "ExamScheduleDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExamSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ExamScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
