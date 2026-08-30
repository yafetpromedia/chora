-- CreateEnum
CREATE TYPE "PlatformPayMethod" AS ENUM ('TELEBIRR', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PlatformPaymentProofStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "PlatformPaymentProof" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "method" "PlatformPayMethod" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "status" "PlatformPaymentProofStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformPaymentProof_invoiceId_status_idx" ON "PlatformPaymentProof"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "PlatformPaymentProof_schoolId_status_idx" ON "PlatformPaymentProof"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "PlatformPaymentProof" ADD CONSTRAINT "PlatformPaymentProof_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPaymentProof" ADD CONSTRAINT "PlatformPaymentProof_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
