-- Exam hall seating plans (temporary room lists; does not change class placement)

CREATE TABLE "ExamSeatingPlan" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sourceGradeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamSeatingRoom" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomRef" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 33,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamSeatingAssignment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "sectionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSeatingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExamSeatingPlan_scheduleId_idx" ON "ExamSeatingPlan"("scheduleId");
CREATE INDEX "ExamSeatingPlan_schoolId_idx" ON "ExamSeatingPlan"("schoolId");
CREATE INDEX "ExamSeatingRoom_planId_sortOrder_idx" ON "ExamSeatingRoom"("planId", "sortOrder");
CREATE INDEX "ExamSeatingRoom_schoolId_idx" ON "ExamSeatingRoom"("schoolId");
CREATE INDEX "ExamSeatingAssignment_roomId_idx" ON "ExamSeatingAssignment"("roomId");
CREATE INDEX "ExamSeatingAssignment_schoolId_studentProfileId_idx" ON "ExamSeatingAssignment"("schoolId", "studentProfileId");
CREATE UNIQUE INDEX "ExamSeatingAssignment_roomId_seatNo_key" ON "ExamSeatingAssignment"("roomId", "seatNo");

ALTER TABLE "ExamSeatingPlan" ADD CONSTRAINT "ExamSeatingPlan_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExamSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSeatingRoom" ADD CONSTRAINT "ExamSeatingRoom_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamSeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ExamSeatingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
