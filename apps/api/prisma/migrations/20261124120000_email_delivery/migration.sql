-- Centralized SMTP delivery log and per-school notification preferences.
-- Does not store mailbox passwords or message bodies after a terminal status.

CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "recipient" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");
CREATE INDEX "EmailDelivery_schoolId_createdAt_idx" ON "EmailDelivery"("schoolId", "createdAt");
CREATE INDEX "EmailDelivery_category_createdAt_idx" ON "EmailDelivery"("category", "createdAt");

ALTER TABLE "EmailDelivery"
ADD CONSTRAINT "EmailDelivery_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SchoolEmailPreference" (
    "schoolId" TEXT NOT NULL,
    "absenceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "examinationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentConfirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportCardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolEmailPreference_pkey" PRIMARY KEY ("schoolId")
);

ALTER TABLE "SchoolEmailPreference"
ADD CONSTRAINT "SchoolEmailPreference_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ParentEmailPreference" (
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "absenceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "examinationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentConfirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportCardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentEmailPreference_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "ParentEmailPreference_schoolId_idx" ON "ParentEmailPreference"("schoolId");

ALTER TABLE "ParentEmailPreference"
ADD CONSTRAINT "ParentEmailPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailSystemState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestError" TEXT,
    "lastTestMailbox" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSystemState_pkey" PRIMARY KEY ("id")
);
