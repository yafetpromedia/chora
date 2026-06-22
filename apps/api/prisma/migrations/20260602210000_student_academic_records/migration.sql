-- Student Academic Record Center

CREATE TYPE "StudentRecordStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');
CREATE TYPE "PromotionOutcome" AS ENUM ('ENROLLED', 'PASSED', 'PROMOTED', 'RETAINED', 'GRADUATED');
CREATE TYPE "StudentDocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'NATIONAL_ID', 'PASSPORT', 'TRANSFER_LETTER', 'RECOMMENDATION_LETTER', 'MEDICAL', 'PHOTO', 'OTHER');
CREATE TYPE "BehaviorRecordType" AS ENUM ('LATE_ARRIVAL', 'ABSENT_WITHOUT_REASON', 'DISRUPTIVE', 'EXCELLENT_CONDUCT', 'WARNING', 'SUSPENSION', 'OTHER');
CREATE TYPE "StudentCertificateType" AS ENUM ('ENROLLMENT', 'COMPLETION', 'GRADUATION', 'CONDUCT');

ALTER TABLE "StudentProfile" ADD COLUMN "status" "StudentRecordStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "StudentProfile" ADD COLUMN "graduatedAt" TIMESTAMP(3);

ALTER TABLE "StudentEnrollment" ADD COLUMN "promotionOutcome" "PromotionOutcome" NOT NULL DEFAULT 'ENROLLED';
ALTER TABLE "StudentEnrollment" ADD COLUMN "promotionNote" TEXT;

CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "type" "StudentDocumentType" NOT NULL,
    "title" TEXT,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentDocument_studentProfileId_idx" ON "StudentDocument"("studentProfileId");
CREATE INDEX "StudentDocument_schoolId_studentProfileId_idx" ON "StudentDocument"("schoolId", "studentProfileId");
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BehaviorRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "BehaviorRecordType" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BehaviorRecord_studentProfileId_date_idx" ON "BehaviorRecord"("studentProfileId", "date");
CREATE INDEX "BehaviorRecord_schoolId_studentProfileId_idx" ON "BehaviorRecord"("schoolId", "studentProfileId");
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentHealthRecord" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "bloodType" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "allergies" TEXT,
    "medicalConditions" TEXT,
    "medicationNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentHealthRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentHealthRecord_studentProfileId_key" ON "StudentHealthRecord"("studentProfileId");
ALTER TABLE "StudentHealthRecord" ADD CONSTRAINT "StudentHealthRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudentCertificate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "type" "StudentCertificateType" NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "meta" JSONB,
    CONSTRAINT "StudentCertificate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentCertificate_studentProfileId_idx" ON "StudentCertificate"("studentProfileId");
CREATE INDEX "StudentCertificate_schoolId_certificateNumber_idx" ON "StudentCertificate"("schoolId", "certificateNumber");
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
