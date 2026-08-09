-- Platform-wide settings (singleton row)
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platformName" TEXT NOT NULL DEFAULT 'CampusOne',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "defaultCountry" TEXT NOT NULL DEFAULT 'Ethiopia',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "allowSelfRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireAdminApproval" BOOLEAN NOT NULL DEFAULT false,
    "defaultTrialDays" INTEGER NOT NULL DEFAULT 14,
    "welcomeMessage" TEXT,
    "defaultBillingCurrency" "BillingCurrency" NOT NULL DEFAULT 'USD',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceGraceDays" INTEGER NOT NULL DEFAULT 14,
    "autoSuspendOverdue" BOOLEAN NOT NULL DEFAULT false,
    "emailFromName" TEXT,
    "emailReplyTo" TEXT,
    "smsSenderName" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP);
