-- Plan catalog for platform-managed pricing & limits (PostgreSQL)
-- Seed rows are applied by PlanCatalogService on startup (idempotent), not here.

CREATE TABLE IF NOT EXISTS "PlanCatalog" (
    "plan" "Plan" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "studentsLimit" INTEGER,
    "teachersLimit" INTEGER,
    "adminsLimit" INTEGER,
    "usdMonthly" INTEGER NOT NULL DEFAULT 0,
    "etbMonthly" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '[]',
    "trialDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCatalog_pkey" PRIMARY KEY ("plan")
);
