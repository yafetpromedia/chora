-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "recipientUserId" TEXT;

-- CreateIndex
CREATE INDEX "Announcement_recipientUserId_createdAt_idx" ON "Announcement"("recipientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
