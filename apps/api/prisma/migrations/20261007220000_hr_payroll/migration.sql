-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'DAILY', 'HOURLY', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "CompensationComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "CompensationCalcMethod" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE_OF_BASIC', 'PER_HOUR', 'PER_DAY');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATING', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollLineKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentType" AS ENUM ('BONUS', 'PENALTY', 'CORRECTION', 'ALLOWANCE', 'ADVANCE_DEDUCTION', 'REIMBURSEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceDeductionMethod" AS ENUM ('NO_DEDUCTION', 'MONTHLY_DIVIDED_BY_WORKING_DAYS', 'MONTHLY_DIVIDED_BY_FIXED_DAYS');

-- CreateEnum
CREATE TYPE "OvertimeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('UNPAID', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPayMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'OTHER');

-- AlterTable
ALTER TABLE "LeaveBalance" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeaveRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeaveType" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffAttendanceRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffQrCredential" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HrDepartment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPosition" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "gender" "Gender",
    "dateOfBirth" DATE,
    "address" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hrDepartmentId" TEXT,
    "hrPositionId" TEXT,
    "supervisorUserId" TEXT,
    "hireDate" DATE,
    "contractStart" DATE,
    "contractEnd" DATE,
    "photoUrl" TEXT,
    "bankName" TEXT,
    "bankAccountHolder" TEXT,
    "bankAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentHistory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "hrDepartmentId" TEXT,
    "hrPositionId" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationComponent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompensationComponentType" NOT NULL,
    "method" "CompensationCalcMethod" NOT NULL DEFAULT 'FIXED_AMOUNT',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompensation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "basicAmountCents" INTEGER NOT NULL DEFAULT 0,
    "hourlyRateCents" INTEGER,
    "dailyRateCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompensationLine" (
    "id" TEXT NOT NULL,
    "compensationId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "amountCents" INTEGER,
    "percentBp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCompensationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "workingDaysPerMonth" INTEGER NOT NULL DEFAULT 22,
    "overtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overtimeMultiplierBp" INTEGER NOT NULL DEFAULT 15000,
    "overtimeApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "absenceDeductionMethod" "AbsenceDeductionMethod" NOT NULL DEFAULT 'NO_DEDUCTION',
    "absenceFixedDays" INTEGER NOT NULL DEFAULT 30,
    "statutoryActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRuleSet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "minCents" INTEGER NOT NULL,
    "maxCents" INTEGER,
    "rateBp" INTEGER NOT NULL,
    "deductionCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeRateBp" INTEGER NOT NULL DEFAULT 0,
    "employerRateBp" INTEGER NOT NULL DEFAULT 0,
    "basis" TEXT NOT NULL DEFAULT 'GROSS',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContributionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "ruleSetId" TEXT,
    "statutoryActive" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEmployeeSnapshot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "positionName" TEXT,
    "departmentName" TEXT,
    "payFrequency" "PayFrequency" NOT NULL,
    "basicCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "deductionCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "employerCostCents" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceDays" INTEGER NOT NULL DEFAULT 0,
    "leaveDaysPaid" INTEGER NOT NULL DEFAULT 0,
    "leaveDaysUnpaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollEmployeeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "kind" "PayrollLineKind" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PayrollAdjustmentType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeApproval" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "runId" TEXT,
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL,
    "status" "OvertimeApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertimeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "payDate" DATE NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PayrollPayMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" "PayrollPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAuditEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrDepartment_schoolId_active_idx" ON "HrDepartment"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "HrDepartment_schoolId_code_key" ON "HrDepartment"("schoolId", "code");

-- CreateIndex
CREATE INDEX "HrPosition_schoolId_active_idx" ON "HrPosition"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "HrPosition_schoolId_code_key" ON "HrPosition"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_schoolId_employmentStatus_idx" ON "EmployeeProfile"("schoolId", "employmentStatus");

-- CreateIndex
CREATE INDEX "EmployeeProfile_schoolId_hrDepartmentId_idx" ON "EmployeeProfile"("schoolId", "hrDepartmentId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_schoolId_hrPositionId_idx" ON "EmployeeProfile"("schoolId", "hrPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_schoolId_employeeCode_key" ON "EmployeeProfile"("schoolId", "employeeCode");

-- CreateIndex
CREATE INDEX "EmploymentHistory_schoolId_employeeProfileId_effectiveFrom_idx" ON "EmploymentHistory"("schoolId", "employeeProfileId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CompensationComponent_schoolId_active_idx" ON "CompensationComponent"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CompensationComponent_schoolId_code_key" ON "CompensationComponent"("schoolId", "code");

-- CreateIndex
CREATE INDEX "EmployeeCompensation_schoolId_userId_effectiveFrom_idx" ON "EmployeeCompensation"("schoolId", "userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeCompensation_schoolId_effectiveFrom_idx" ON "EmployeeCompensation"("schoolId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeCompensationLine_compensationId_idx" ON "EmployeeCompensationLine"("compensationId");

-- CreateIndex
CREATE INDEX "EmployeeCompensationLine_componentId_idx" ON "EmployeeCompensationLine"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSettings_schoolId_key" ON "PayrollSettings"("schoolId");

-- CreateIndex
CREATE INDEX "PayrollRuleSet_schoolId_active_idx" ON "PayrollRuleSet"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRuleSet_schoolId_code_key" ON "PayrollRuleSet"("schoolId", "code");

-- CreateIndex
CREATE INDEX "TaxBracket_ruleSetId_idx" ON "TaxBracket"("ruleSetId");

-- CreateIndex
CREATE INDEX "ContributionRule_ruleSetId_idx" ON "ContributionRule"("ruleSetId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_schoolId_startDate_idx" ON "PayrollPeriod"("schoolId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_schoolId_startDate_endDate_key" ON "PayrollPeriod"("schoolId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "PayrollRun_schoolId_status_idx" ON "PayrollRun"("schoolId", "status");

-- CreateIndex
CREATE INDEX "PayrollRun_periodId_idx" ON "PayrollRun"("periodId");

-- CreateIndex
CREATE INDEX "PayrollEmployeeSnapshot_schoolId_runId_idx" ON "PayrollEmployeeSnapshot"("schoolId", "runId");

-- CreateIndex
CREATE INDEX "PayrollEmployeeSnapshot_userId_idx" ON "PayrollEmployeeSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmployeeSnapshot_runId_userId_key" ON "PayrollEmployeeSnapshot"("runId", "userId");

-- CreateIndex
CREATE INDEX "PayrollLine_snapshotId_idx" ON "PayrollLine"("snapshotId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_runId_userId_idx" ON "PayrollAdjustment"("runId", "userId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_schoolId_idx" ON "PayrollAdjustment"("schoolId");

-- CreateIndex
CREATE INDEX "OvertimeApproval_schoolId_status_idx" ON "OvertimeApproval"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeApproval_schoolId_userId_periodStart_periodEnd_key" ON "OvertimeApproval"("schoolId", "userId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_snapshotId_key" ON "Payslip"("snapshotId");

-- CreateIndex
CREATE INDEX "Payslip_schoolId_userId_payDate_idx" ON "Payslip"("schoolId", "userId", "payDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPayment_snapshotId_key" ON "PayrollPayment"("snapshotId");

-- CreateIndex
CREATE INDEX "PayrollPayment_schoolId_status_idx" ON "PayrollPayment"("schoolId", "status");

-- CreateIndex
CREATE INDEX "PayrollPayment_userId_idx" ON "PayrollPayment"("userId");

-- CreateIndex
CREATE INDEX "PayrollAuditEvent_schoolId_createdAt_idx" ON "PayrollAuditEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollAuditEvent_entity_entityId_idx" ON "PayrollAuditEvent"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "HrDepartment" ADD CONSTRAINT "HrDepartment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPosition" ADD CONSTRAINT "HrPosition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_hrDepartmentId_fkey" FOREIGN KEY ("hrDepartmentId") REFERENCES "HrDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_hrPositionId_fkey" FOREIGN KEY ("hrPositionId") REFERENCES "HrPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_hrDepartmentId_fkey" FOREIGN KEY ("hrDepartmentId") REFERENCES "HrDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_hrPositionId_fkey" FOREIGN KEY ("hrPositionId") REFERENCES "HrPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationComponent" ADD CONSTRAINT "CompensationComponent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensationLine" ADD CONSTRAINT "EmployeeCompensationLine_compensationId_fkey" FOREIGN KEY ("compensationId") REFERENCES "EmployeeCompensation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensationLine" ADD CONSTRAINT "EmployeeCompensationLine_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "CompensationComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSettings" ADD CONSTRAINT "PayrollSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRuleSet" ADD CONSTRAINT "PayrollRuleSet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "PayrollRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionRule" ADD CONSTRAINT "ContributionRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "PayrollRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "PayrollRuleSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeSnapshot" ADD CONSTRAINT "PayrollEmployeeSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PayrollEmployeeSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeApproval" ADD CONSTRAINT "OvertimeApproval_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeApproval" ADD CONSTRAINT "OvertimeApproval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeApproval" ADD CONSTRAINT "OvertimeApproval_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PayrollEmployeeSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PayrollEmployeeSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAuditEvent" ADD CONSTRAINT "PayrollAuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAuditEvent" ADD CONSTRAINT "PayrollAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
