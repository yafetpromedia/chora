-- CreateEnum
CREATE TYPE "LibraryResourceType" AS ENUM ('BOOK_PDF', 'EPUB', 'DOCUMENT', 'NOTES', 'ASSIGNMENT', 'LAB_MANUAL', 'EXAM', 'VIDEO', 'AUDIO', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "LibraryResourceStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryResource" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "coverUrl" TEXT,
    "resourceType" "LibraryResourceType" NOT NULL,
    "subject" TEXT,
    "gradeId" TEXT,
    "author" TEXT,
    "status" "LibraryResourceStatus" NOT NULL DEFAULT 'PUBLISHED',
    "uploadedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryFavorite" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryReadingProgress" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "lastReadPage" INTEGER,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_schoolId_slug_key" ON "LibraryCategory"("schoolId", "slug");

-- CreateIndex
CREATE INDEX "LibraryCategory_schoolId_idx" ON "LibraryCategory"("schoolId");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_status_idx" ON "LibraryResource"("schoolId", "status");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_categoryId_idx" ON "LibraryResource"("schoolId", "categoryId");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_gradeId_idx" ON "LibraryResource"("schoolId", "gradeId");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_resourceType_idx" ON "LibraryResource"("schoolId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryFavorite_studentProfileId_resourceId_key" ON "LibraryFavorite"("studentProfileId", "resourceId");

-- CreateIndex
CREATE INDEX "LibraryFavorite_studentProfileId_idx" ON "LibraryFavorite"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryReadingProgress_studentProfileId_resourceId_key" ON "LibraryReadingProgress"("studentProfileId", "resourceId");

-- CreateIndex
CREATE INDEX "LibraryReadingProgress_studentProfileId_idx" ON "LibraryReadingProgress"("studentProfileId");

-- AddForeignKey
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryFavorite" ADD CONSTRAINT "LibraryFavorite_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryFavorite" ADD CONSTRAINT "LibraryFavorite_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LibraryResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryReadingProgress" ADD CONSTRAINT "LibraryReadingProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryReadingProgress" ADD CONSTRAINT "LibraryReadingProgress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LibraryResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
