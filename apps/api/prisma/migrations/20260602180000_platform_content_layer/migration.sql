-- Platform content layer: subject repository, inheritance, provisioning logs

CREATE TYPE "ProvisioningStepStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

CREATE TABLE "PlatformSubject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "curriculum" TEXT,
    "level" TEXT,
    "gradeMin" INTEGER,
    "gradeMax" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSubject_code_key" ON "PlatformSubject"("code");

CREATE TABLE "SchoolProvisioningLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "packageKey" TEXT,
    "step" TEXT NOT NULL,
    "status" "ProvisioningStepStatus" NOT NULL,
    "message" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolProvisioningLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolProvisioningLog_schoolId_createdAt_idx" ON "SchoolProvisioningLog"("schoolId", "createdAt");

ALTER TABLE "SchoolProvisioningLog" ADD CONSTRAINT "SchoolProvisioningLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subject" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subject" ADD COLUMN "platformSubjectId" TEXT;
ALTER TABLE "Subject" ADD COLUMN "isCustomized" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Subject_platformSubjectId_idx" ON "Subject"("platformSubjectId");

ALTER TABLE "Subject" ADD CONSTRAINT "Subject_platformSubjectId_fkey" FOREIGN KEY ("platformSubjectId") REFERENCES "PlatformSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CurriculumPackageSubject" ADD COLUMN "platformSubjectId" TEXT;

CREATE INDEX "CurriculumPackageSubject_platformSubjectId_idx" ON "CurriculumPackageSubject"("platformSubjectId");

ALTER TABLE "CurriculumPackageSubject" ADD CONSTRAINT "CurriculumPackageSubject_platformSubjectId_fkey" FOREIGN KEY ("platformSubjectId") REFERENCES "PlatformSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
