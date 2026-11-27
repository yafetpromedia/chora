-- CreateEnum
CREATE TYPE "AcademicCalendarSystem" AS ENUM ('ETHIOPIAN', 'GREGORIAN');

-- AlterTable
ALTER TABLE "AcademicYear"
ADD COLUMN "calendarSystem" "AcademicCalendarSystem" NOT NULL DEFAULT 'ETHIOPIAN';
