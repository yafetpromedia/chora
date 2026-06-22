-- Platform content layer: eLibrary, messages, assessments, academic structures + inheritance

CREATE TABLE "PlatformAcademicStructure" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "gradePreset" "GradePreset" NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAcademicStructure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAcademicStructure_key_key" ON "PlatformAcademicStructure"("key");

CREATE TABLE "PlatformLibraryCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformLibraryCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformLibraryCategory_slug_key" ON "PlatformLibraryCategory"("slug");

CREATE TABLE "PlatformLibraryResource" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "coverUrl" TEXT,
    "resourceType" "LibraryResourceType" NOT NULL,
    "audience" "LibraryAudience" NOT NULL DEFAULT 'BOTH',
    "subject" TEXT,
    "gradeLabel" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformLibraryResource_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PlatformLibraryResource" ADD CONSTRAINT "PlatformLibraryResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlatformLibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformMessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformMessageTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformMessageTemplate_key_key" ON "PlatformMessageTemplate"("key");

CREATE TABLE "PlatformAssessmentTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gradeMin" INTEGER,
    "gradeMax" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAssessmentTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAssessmentTemplate_key_key" ON "PlatformAssessmentTemplate"("key");

CREATE TABLE "PlatformAssessmentTemplateComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlatformAssessmentTemplateComponent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAssessmentTemplateComponent_templateId_name_key" ON "PlatformAssessmentTemplateComponent"("templateId", "name");
ALTER TABLE "PlatformAssessmentTemplateComponent" ADD CONSTRAINT "PlatformAssessmentTemplateComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CurriculumPackageAssessmentTemplate" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "platformAssessmentTemplateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CurriculumPackageAssessmentTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumPackageAssessmentTemplate_packageId_platformAssessmentTemplateId_key" ON "CurriculumPackageAssessmentTemplate"("packageId", "platformAssessmentTemplateId");
CREATE INDEX "CurriculumPackageAssessmentTemplate_packageId_idx" ON "CurriculumPackageAssessmentTemplate"("packageId");
ALTER TABLE "CurriculumPackageAssessmentTemplate" ADD CONSTRAINT "CurriculumPackageAssessmentTemplate_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumPackageAssessmentTemplate" ADD CONSTRAINT "CurriculumPackageAssessmentTemplate_platformAssessmentTemplateId_fkey" FOREIGN KEY ("platformAssessmentTemplateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurriculumPackage" ADD COLUMN "academicStructureId" TEXT;
ALTER TABLE "CurriculumPackage" ADD CONSTRAINT "CurriculumPackage_academicStructureId_fkey" FOREIGN KEY ("academicStructureId") REFERENCES "PlatformAcademicStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CurriculumPackageLibraryItem" ADD COLUMN "platformLibraryResourceId" TEXT;
CREATE INDEX "CurriculumPackageLibraryItem_platformLibraryResourceId_idx" ON "CurriculumPackageLibraryItem"("platformLibraryResourceId");
ALTER TABLE "CurriculumPackageLibraryItem" ADD CONSTRAINT "CurriculumPackageLibraryItem_platformLibraryResourceId_fkey" FOREIGN KEY ("platformLibraryResourceId") REFERENCES "PlatformLibraryResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CurriculumPackageTemplate" ADD COLUMN "platformMessageTemplateId" TEXT;
CREATE INDEX "CurriculumPackageTemplate_platformMessageTemplateId_idx" ON "CurriculumPackageTemplate"("platformMessageTemplateId");
ALTER TABLE "CurriculumPackageTemplate" ADD CONSTRAINT "CurriculumPackageTemplate_platformMessageTemplateId_fkey" FOREIGN KEY ("platformMessageTemplateId") REFERENCES "PlatformMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibraryResource" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LibraryResource" ADD COLUMN "platformLibraryResourceId" TEXT;
ALTER TABLE "LibraryResource" ADD COLUMN "isCustomized" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "LibraryResource_platformLibraryResourceId_idx" ON "LibraryResource"("platformLibraryResourceId");
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_platformLibraryResourceId_fkey" FOREIGN KEY ("platformLibraryResourceId") REFERENCES "PlatformLibraryResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentTemplate" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssessmentTemplate" ADD COLUMN "platformAssessmentTemplateId" TEXT;
ALTER TABLE "AssessmentTemplate" ADD COLUMN "isCustomized" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "AssessmentTemplate_platformAssessmentTemplateId_idx" ON "AssessmentTemplate"("platformAssessmentTemplateId");
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_platformAssessmentTemplateId_fkey" FOREIGN KEY ("platformAssessmentTemplateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolMessageTemplate" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SchoolMessageTemplate" ADD COLUMN "platformMessageTemplateId" TEXT;
ALTER TABLE "SchoolMessageTemplate" ADD COLUMN "isCustomized" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "SchoolMessageTemplate_platformMessageTemplateId_idx" ON "SchoolMessageTemplate"("platformMessageTemplateId");
ALTER TABLE "SchoolMessageTemplate" ADD CONSTRAINT "SchoolMessageTemplate_platformMessageTemplateId_fkey" FOREIGN KEY ("platformMessageTemplateId") REFERENCES "PlatformMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
