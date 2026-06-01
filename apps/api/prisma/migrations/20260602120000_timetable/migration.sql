-- Timetable module: periods, rooms, class schedule entries

CREATE TYPE "Weekday" AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

CREATE TABLE "Timetable" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Main',
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Timetable_academicYearId_key" ON "Timetable"("academicYearId");
CREATE INDEX "Timetable_schoolId_idx" ON "Timetable"("schoolId");

CREATE TABLE "TimetablePeriod" (
  "id" TEXT NOT NULL,
  "timetableId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimetablePeriod_timetableId_number_key" ON "TimetablePeriod"("timetableId", "number");
CREATE INDEX "TimetablePeriod_schoolId_idx" ON "TimetablePeriod"("schoolId");

CREATE TABLE "TimetableRoom" (
  "id" TEXT NOT NULL,
  "timetableId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "TimetableRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimetableRoom_timetableId_name_key" ON "TimetableRoom"("timetableId", "name");
CREATE INDEX "TimetableRoom_schoolId_idx" ON "TimetableRoom"("schoolId");

CREATE TABLE "TimetableEntry" (
  "id" TEXT NOT NULL,
  "timetableId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "weekday" "Weekday" NOT NULL,
  "periodId" TEXT NOT NULL,
  "gradeId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT NOT NULL,
  "teacherUserId" TEXT,
  "roomId" TEXT,
  CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimetableEntry_timetableId_weekday_periodId_gradeId_sectionId_key"
  ON "TimetableEntry"("timetableId", "weekday", "periodId", "gradeId", "sectionId");
CREATE INDEX "TimetableEntry_schoolId_teacherUserId_weekday_idx"
  ON "TimetableEntry"("schoolId", "teacherUserId", "weekday");
CREATE INDEX "TimetableEntry_timetableId_gradeId_sectionId_idx"
  ON "TimetableEntry"("timetableId", "gradeId", "sectionId");

ALTER TABLE "Timetable"
  ADD CONSTRAINT "Timetable_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Timetable"
  ADD CONSTRAINT "Timetable_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetablePeriod"
  ADD CONSTRAINT "TimetablePeriod_timetableId_fkey"
  FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableRoom"
  ADD CONSTRAINT "TimetableRoom_timetableId_fkey"
  FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_timetableId_fkey"
  FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "TimetablePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_teacherUserId_fkey"
  FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "TimetableRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
