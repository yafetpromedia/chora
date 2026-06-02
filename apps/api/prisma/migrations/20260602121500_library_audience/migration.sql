CREATE TYPE "LibraryAudience" AS ENUM ('STUDENTS', 'TEACHERS', 'BOTH');

ALTER TABLE "LibraryResource"
ADD COLUMN "audience" "LibraryAudience" NOT NULL DEFAULT 'BOTH';
