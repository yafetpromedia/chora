-- Chora schema catch-up: bring DB from early migrations (init/schools/invites/subscriptions)
-- up to current prisma/schema.prisma. Supersedes broken/incomplete mid-chain migrations.
-- Generated via: prisma migrate diff --from-url <early> --to-schema-datamodel prisma/schema.prisma
-- CreateEnum
CREATE TYPE "SchoolStaffRole" AS ENUM ('SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'FINANCE_OFFICER', 'HOMEROOM_TEACHER', 'SUBJECT_TEACHER');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('DAILY', 'PERIOD', 'BOTH');

-- CreateEnum
CREATE TYPE "AttendanceReason" AS ENUM ('sick', 'family_emergency', 'unexcused', 'other');

-- CreateEnum
CREATE TYPE "AttendancePermissionType" AS ENUM ('ABSENCE', 'LATE', 'EARLY_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendancePermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "BillingCurrency" AS ENUM ('USD', 'ETB');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'SUPPORT', 'SALES');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('KINDERGARTEN', 'PRIMARY', 'SECONDARY', 'PREPARATORY', 'MIXED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "GradePreset" AS ENUM ('GRADES_1_8', 'GRADES_9_12', 'KG_12');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'TERM', 'ANNUAL');

-- CreateEnum
CREATE TYPE "StudentFeeStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'TELEBIRR', 'CHAPA', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResultWorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ClassworkType" AS ENUM ('WORKSHEET', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ClassworkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClassworkSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LATE', 'GRADED');

-- CreateEnum
CREATE TYPE "LibraryResourceType" AS ENUM ('BOOK_PDF', 'EPUB', 'DOCUMENT', 'NOTES', 'ASSIGNMENT', 'LAB_MANUAL', 'EXAM', 'VIDEO', 'AUDIO', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "LibraryResourceStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LibraryAudience" AS ENUM ('STUDENTS', 'TEACHERS', 'BOTH');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT_OFF', 'EXTRA_TRIAL_DAYS', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "PlatformPayMethod" AS ENUM ('TELEBIRR', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PlatformPaymentProofStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_SCHOOL', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('BILLING', 'TECHNICAL', 'ONBOARDING', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('APPLIED', 'SCORED', 'PLACED', 'ACCEPTED', 'REJECTED', 'ENROLLED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StudentRecordStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PromotionOutcome" AS ENUM ('ENROLLED', 'PASSED', 'PROMOTED', 'RETAINED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "StudentDocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'NATIONAL_ID', 'PASSPORT', 'TRANSFER_LETTER', 'RECOMMENDATION_LETTER', 'MEDICAL', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "BehaviorRecordType" AS ENUM ('LATE_ARRIVAL', 'ABSENT_WITHOUT_REASON', 'DISRUPTIVE', 'EXCELLENT_CONDUCT', 'WARNING', 'SUSPENSION', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentCertificateType" AS ENUM ('ENROLLMENT', 'COMPLETION', 'GRADUATION', 'CONDUCT');

-- CreateEnum
CREATE TYPE "ConcernCategory" AS ENUM ('ATTENDANCE');

-- CreateEnum
CREATE TYPE "AttendanceConcernType" AS ENUM ('STUDENT_APPEARS_ABSENT', 'STUDENT_APPEARS_PRESENT', 'COUNT_MISMATCH', 'STUDENT_LEFT_CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceConcernStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ObservedAttendanceStatus" AS ENUM ('PRESENT', 'MISSING', 'LEFT_CLASS', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceConcernResolution" AS ENUM ('OFFICIAL_CORRECT', 'CORRECTED_OFFICIAL', 'AUTHORIZED_ABSENCE', 'LEFT_CAMPUS', 'TEMPORARILY_OUTSIDE', 'DUPLICATE_OR_INCORRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('present', 'late', 'absent', 'half_day', 'on_leave', 'excused');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

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

-- CreateEnum
CREATE TYPE "ScoreCorrectionStatus" AS ENUM ('OPEN', 'PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExamScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProvisioningStepStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttendanceStatus" ADD VALUE 'excused';
ALTER TYPE "AttendanceStatus" ADD VALUE 'medical';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'staff';

-- DropIndex
DROP INDEX "AttendanceRecord_schoolId_studentId_date_key";

-- DropIndex
DROP INDEX "AttendanceRecord_schoolId_studentId_idx";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "recipientUserId" TEXT;

-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "studentId",
ADD COLUMN     "periodNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reason" "AttendanceReason",
ADD COLUMN     "studentProfileId" TEXT NOT NULL,
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "accentDeep" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "authorizedSignatureLabel" TEXT,
ADD COLUMN     "authorizedSignatureUrl" TEXT,
ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "curriculumPackageKey" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gradePreset" "GradePreset",
ADD COLUMN     "idCardShowStamp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nameAm" TEXT,
ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "postalBox" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "reportCardTagline" TEXT,
ADD COLUMN     "reportCardTitle" TEXT,
ADD COLUMN     "reportCoverImageUrl" TEXT,
ADD COLUMN     "reportShowAttendance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportShowRank" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "schoolType" "SchoolType",
ADD COLUMN     "setupComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staffCheckInTime" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "staffCheckOutTime" TEXT NOT NULL DEFAULT '17:00',
ADD COLUMN     "staffGraceMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "staffOvertimeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stampUrl" TEXT,
ADD COLUMN     "status" "SchoolStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "telebirrAccountName" TEXT,
ADD COLUMN     "telebirrNumber" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingBundle" TEXT,
ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "enabledModules" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "roleTemplateId" TEXT,
ADD COLUMN     "staffRole" "SchoolStaffRole",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PermissionDefinition" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PermissionDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "portalRole" "UserRole" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTemplatePermission" (
    "roleTemplateId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,

    CONSTRAINT "RoleTemplatePermission_pkey" PRIMARY KEY ("roleTemplateId","permissionKey")
);

-- CreateTable
CREATE TABLE "UserPermissionGrant" (
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPermissionGrant_pkey" PRIMARY KEY ("userId","permissionKey")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "percentOff" INTEGER NOT NULL DEFAULT 0,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "complimentaryMonths" INTEGER NOT NULL DEFAULT 1,
    "plan" "Plan",
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "appliedBy" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCatalog" (
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

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "plan" "Plan",
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountUsd" INTEGER NOT NULL DEFAULT 0,
    "amountEtb" INTEGER NOT NULL DEFAULT 0,
    "currency" "BillingCurrency" NOT NULL DEFAULT 'USD',
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "paymentReference" TEXT,
    "billingInterval" TEXT,
    "initiatedBy" TEXT,
    "enabledModules" JSONB,
    "billingBundle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "platformNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "status" "StudentRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "graduatedAt" TIMESTAMP(3),
    "gender" "Gender",
    "middleName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "photoUrl" TEXT,
    "fan" TEXT,
    "fcn" TEXT,
    "nationality" TEXT,
    "region" TEXT,
    "zone" TEXT,
    "woreda" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "fayedaVerifiedAt" TIMESTAMP(3),
    "cardCode" TEXT,
    "portalTempPassword" TEXT,
    "parentsCanViewResults" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePermissionRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "AttendancePermissionType" NOT NULL,
    "date" DATE NOT NULL,
    "reason" "AttendanceReason",
    "note" TEXT,
    "status" "AttendancePermissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePermissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceConcern" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" "ConcernCategory" NOT NULL DEFAULT 'ATTENDANCE',
    "date" DATE NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT,
    "timetableEntryId" TEXT,
    "periodNumber" INTEGER,
    "periodLabel" TEXT,
    "subjectNameSnapshot" TEXT,
    "reportedByUserId" TEXT NOT NULL,
    "officialPresentCount" INTEGER,
    "officialAbsentCount" INTEGER,
    "officialLateCount" INTEGER,
    "officialExcusedCount" INTEGER,
    "officialSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "totalStudents" INTEGER,
    "observedPresentCount" INTEGER,
    "observedAbsentCount" INTEGER,
    "difference" INTEGER,
    "concernType" "AttendanceConcernType" NOT NULL,
    "studentProfileId" TEXT,
    "officialStudentStatus" "AttendanceStatus",
    "observedStudentStatus" "ObservedAttendanceStatus",
    "description" TEXT,
    "status" "AttendanceConcernStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "AttendanceConcernResolution",
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceConcern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceConcernAuditEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "concernId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceConcernAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "kind" TEXT NOT NULL,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendanceRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "expectedCheckInAt" TIMESTAMP(3),
    "expectedCheckOutAt" TIMESTAMP(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendanceCorrection" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "previousStatus" "StaffAttendanceStatus" NOT NULL,
    "newStatus" "StaffAttendanceStatus" NOT NULL,
    "previousCheckInAt" TIMESTAMP(3),
    "newCheckInAt" TIMESTAMP(3),
    "previousCheckOutAt" TIMESTAMP(3),
    "newCheckOutAt" TIMESTAMP(3),
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "countsTowardBalance" BOOLEAN NOT NULL DEFAULT true,
    "annualAllocationDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffQrCredential" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffQrCredential_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ParentNotification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "platformSubjectId" TEXT,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "teacherId" TEXT,
    "weeklySessions" INTEGER NOT NULL DEFAULT 1,
    "assessmentTemplateId" TEXT,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubjectTermSheet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "status" "ResultWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSubjectTermSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTermReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "platformAssessmentTemplateId" TEXT,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplateComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentTemplateComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplateGrade" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT,

    CONSTRAINT "AssessmentTemplateGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "weightPercent" INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "entryLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreCorrectionRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "teacherId" TEXT,
    "message" TEXT NOT NULL,
    "currentScore" INTEGER,
    "proposedScore" INTEGER,
    "status" "ScoreCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAssessmentScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAssessmentScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingBand" (
    "id" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,

    CONSTRAINT "GradingBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetEmail" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platformName" TEXT NOT NULL DEFAULT 'Chora',
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
    "landingHeroImageUrl" TEXT,
    "demoVideoUrl" TEXT,
    "demoVideoThumbnailUrl" TEXT,
    "productDocsUrl" TEXT,
    "productDocsThumbnailUrl" TEXT,
    "bankName" TEXT,
    "bankAccountHolder" TEXT,
    "bankAccountNumber" TEXT,
    "telebirrNumber" TEXT,
    "telebirrAccountName" TEXT,
    "payoutInstructions" TEXT,
    "socialInstagramUrl" TEXT,
    "socialFacebookUrl" TEXT,
    "socialLinkedinUrl" TEXT,
    "socialYoutubeUrl" TEXT,
    "socialTiktokUrl" TEXT,
    "socialGithubUrl" TEXT,
    "rolePermissions" JSONB,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiProvider" TEXT NOT NULL DEFAULT 'gemini',
    "aiApiKey" TEXT,
    "aiModel" TEXT,
    "aiBaseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetablePeriod" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableRoom" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TimetableRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "periodId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherUserId" TEXT,
    "roomId" TEXT,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "academicTermId" TEXT,
    "title" TEXT NOT NULL,
    "shiftLabel" TEXT,
    "notes" TEXT,
    "status" "ExamScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamScheduleDay" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "isStudyDay" BOOLEAN NOT NULL DEFAULT false,
    "studyNote" TEXT,
    "defaultStartTime" TEXT,
    "defaultEndTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamScheduleSlot" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectLabel" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingPlan" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sourceGradeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingRoom" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomRef" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 33,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingAssignment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "sectionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSeatingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "homeroomGradeId" TEXT,
    "homeroomSectionId" TEXT,
    "photoUrl" TEXT,
    "cardCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassworkAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ClassworkType" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileName" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "status" "ClassworkStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassworkAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassworkSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" "ClassworkSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileName" TEXT,
    "note" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT,
    "isHomeroom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "promotionOutcome" "PromotionOutcome" NOT NULL DEFAULT 'ENROLLED',
    "promotionNote" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "FeeType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT,
    "sectionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "frequency" "FeeFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "feeScheduleId" TEXT,
    "label" TEXT NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "amountDueCents" INTEGER NOT NULL,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATE NOT NULL,
    "status" "StudentFeeStatus" NOT NULL DEFAULT 'PENDING',
    "isScholarship" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "status" "StudentFeeStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "proofUrl" TEXT,
    "submittedBy" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "studentFeeId" TEXT,
    "installmentId" TEXT,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

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
    "audience" "LibraryAudience" NOT NULL DEFAULT 'BOTH',
    "subject" TEXT,
    "gradeId" TEXT,
    "author" TEXT,
    "status" "LibraryResourceStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "platformLibraryResourceId" TEXT,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "PlatformAssessmentTemplateComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformAssessmentTemplateComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "CurriculumPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "gradePreset" "GradePreset",
    "schoolType" "SchoolType",
    "academicStructureId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlank" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumPackageSubject" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "platformSubjectId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumPackageSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumPackageDepartment" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumPackageDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumPackageLibraryItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "platformLibraryResourceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceType" "LibraryResourceType" NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "subject" TEXT,
    "gradeLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumPackageLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumPackageTemplate" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "platformMessageTemplateId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumPackageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumPackageAssessmentTemplate" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "platformAssessmentTemplateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumPackageAssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolDepartment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SchoolDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMessageTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "platformMessageTemplateId" TEXT,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SchoolMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionCycle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "autoPlaceOnScore" BOOLEAN NOT NULL DEFAULT true,
    "autoAcceptOnPlace" BOOLEAN NOT NULL DEFAULT true,
    "autoEnrollOnPlace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'APPLIED',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "idNumber" TEXT,
    "phone" TEXT,
    "fatherName" TEXT NOT NULL,
    "fatherPhone" TEXT NOT NULL,
    "motherName" TEXT NOT NULL,
    "motherPhone" TEXT NOT NULL,
    "email" TEXT,
    "targetGradeId" TEXT,
    "entranceScore" INTEGER,
    "interviewScore" INTEGER,
    "totalScore" INTEGER,
    "placedGradeId" TEXT,
    "placedSectionId" TEXT,
    "placementRuleId" TEXT,
    "placementNote" TEXT,
    "enrolledProfileId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionPlacementRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "targetGradeId" TEXT NOT NULL,
    "targetSectionId" TEXT,
    "streamMatch" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdmissionPlacementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleTemplate_schoolId_idx" ON "RoleTemplate"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_schoolId_slug_key" ON "RoleTemplate"("schoolId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "CouponRedemption_schoolId_idx" ON "CouponRedemption"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_schoolId_key" ON "CouponRedemption"("couponId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_invoiceNumber_key" ON "PlatformInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_paymentReference_key" ON "PlatformInvoice"("paymentReference");

-- CreateIndex
CREATE INDEX "PlatformInvoice_schoolId_idx" ON "PlatformInvoice"("schoolId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_status_idx" ON "PlatformInvoice"("status");

-- CreateIndex
CREATE INDEX "PlatformInvoice_dueAt_idx" ON "PlatformInvoice"("dueAt");

-- CreateIndex
CREATE INDEX "PlatformPaymentProof_invoiceId_status_idx" ON "PlatformPaymentProof"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "PlatformPaymentProof_schoolId_status_idx" ON "PlatformPaymentProof"("schoolId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_schoolId_status_createdAt_idx" ON "SupportTicket"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Grade_schoolId_sortOrder_idx" ON "Grade"("schoolId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_name_key" ON "Grade"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_gradeId_name_key" ON "Section"("gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_schoolId_gradeId_idx" ON "StudentProfile"("schoolId", "gradeId");

-- CreateIndex
CREATE INDEX "StudentProfile_sectionId_idx" ON "StudentProfile"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_fan_key" ON "StudentProfile"("schoolId", "fan");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_fcn_key" ON "StudentProfile"("schoolId", "fcn");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_cardCode_key" ON "StudentProfile"("schoolId", "cardCode");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "AttendancePermissionRequest_schoolId_status_date_idx" ON "AttendancePermissionRequest"("schoolId", "status", "date");

-- CreateIndex
CREATE INDEX "AttendancePermissionRequest_studentProfileId_date_idx" ON "AttendancePermissionRequest"("studentProfileId", "date");

-- CreateIndex
CREATE INDEX "AttendanceConcern_schoolId_date_status_idx" ON "AttendanceConcern"("schoolId", "date", "status");

-- CreateIndex
CREATE INDEX "AttendanceConcern_schoolId_gradeId_sectionId_date_idx" ON "AttendanceConcern"("schoolId", "gradeId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "AttendanceConcern_reportedByUserId_createdAt_idx" ON "AttendanceConcern"("reportedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceConcern_studentProfileId_date_idx" ON "AttendanceConcern"("studentProfileId", "date");

-- CreateIndex
CREATE INDEX "AttendanceConcern_timetableEntryId_idx" ON "AttendanceConcern"("timetableEntryId");

-- CreateIndex
CREATE INDEX "AttendanceConcernAuditEvent_schoolId_createdAt_idx" ON "AttendanceConcernAuditEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceConcernAuditEvent_concernId_createdAt_idx" ON "AttendanceConcernAuditEvent"("concernId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_userId_readAt_idx" ON "StaffNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "StaffNotification_schoolId_createdAt_idx" ON "StaffNotification"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffAttendanceRecord_schoolId_date_idx" ON "StaffAttendanceRecord"("schoolId", "date");

-- CreateIndex
CREATE INDEX "StaffAttendanceRecord_userId_date_idx" ON "StaffAttendanceRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendanceRecord_schoolId_userId_date_key" ON "StaffAttendanceRecord"("schoolId", "userId", "date");

-- CreateIndex
CREATE INDEX "StaffAttendanceCorrection_schoolId_createdAt_idx" ON "StaffAttendanceCorrection"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffAttendanceCorrection_recordId_idx" ON "StaffAttendanceCorrection"("recordId");

-- CreateIndex
CREATE INDEX "LeaveType_schoolId_active_idx" ON "LeaveType"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_schoolId_slug_key" ON "LeaveType"("schoolId", "slug");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_status_startDate_idx" ON "LeaveRequest"("schoolId", "status", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startDate_idx" ON "LeaveRequest"("userId", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_schoolId_leaveTypeId_idx" ON "LeaveRequest"("schoolId", "leaveTypeId");

-- CreateIndex
CREATE INDEX "LeaveBalance_schoolId_year_idx" ON "LeaveBalance"("schoolId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_schoolId_userId_leaveTypeId_year_key" ON "LeaveBalance"("schoolId", "userId", "leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "StaffQrCredential_userId_key" ON "StaffQrCredential"("userId");

-- CreateIndex
CREATE INDEX "StaffQrCredential_schoolId_active_idx" ON "StaffQrCredential"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StaffQrCredential_schoolId_token_key" ON "StaffQrCredential"("schoolId", "token");

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

-- CreateIndex
CREATE INDEX "ParentNotification_parentId_readAt_idx" ON "ParentNotification"("parentId", "readAt");

-- CreateIndex
CREATE INDEX "ParentNotification_schoolId_createdAt_idx" ON "ParentNotification"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AcademicTerm_schoolId_isCurrent_idx" ON "AcademicTerm"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_academicYearId_name_key" ON "AcademicTerm"("academicYearId", "name");

-- CreateIndex
CREATE INDEX "Subject_platformSubjectId_idx" ON "Subject"("platformSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

-- CreateIndex
CREATE INDEX "ClassSubject_schoolId_gradeId_idx" ON "ClassSubject"("schoolId", "gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_schoolId_subjectId_gradeId_sectionId_academicY_key" ON "ClassSubject"("schoolId", "subjectId", "gradeId", "sectionId", "academicYearId");

-- CreateIndex
CREATE INDEX "ClassSubjectTermSheet_schoolId_status_idx" ON "ClassSubjectTermSheet"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubjectTermSheet_termId_classSubjectId_key" ON "ClassSubjectTermSheet"("termId", "classSubjectId");

-- CreateIndex
CREATE INDEX "StudentTermReport_schoolId_termId_idx" ON "StudentTermReport"("schoolId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTermReport_studentProfileId_termId_key" ON "StudentTermReport"("studentProfileId", "termId");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_schoolId_idx" ON "AssessmentTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_platformAssessmentTemplateId_idx" ON "AssessmentTemplate"("platformAssessmentTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTemplate_schoolId_name_key" ON "AssessmentTemplate"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTemplateComponent_templateId_name_key" ON "AssessmentTemplateComponent"("templateId", "name");

-- CreateIndex
CREATE INDEX "AssessmentTemplateGrade_gradeId_subjectId_idx" ON "AssessmentTemplateGrade"("gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTemplateGrade_templateId_gradeId_subjectId_key" ON "AssessmentTemplateGrade"("templateId", "gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "Assessment_schoolId_termId_idx" ON "Assessment"("schoolId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_termId_classSubjectId_name_key" ON "Assessment"("termId", "classSubjectId", "name");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_schoolId_status_createdAt_idx" ON "ScoreCorrectionRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_teacherId_status_idx" ON "ScoreCorrectionRequest"("teacherId", "status");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_studentProfileId_status_idx" ON "ScoreCorrectionRequest"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX "ScoreCorrectionRequest_assessmentId_studentProfileId_idx" ON "ScoreCorrectionRequest"("assessmentId", "studentProfileId");

-- CreateIndex
CREATE INDEX "StudentAssessmentScore_studentProfileId_idx" ON "StudentAssessmentScore"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentScore_assessmentId_studentProfileId_key" ON "StudentAssessmentScore"("assessmentId", "studentProfileId");

-- CreateIndex
CREATE INDEX "GradingBand_scaleId_idx" ON "GradingBand"("scaleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_inviteToken_key" ON "PlatformUser"("inviteToken");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isCurrent_idx" ON "AcademicYear"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_academicYearId_key" ON "Timetable"("academicYearId");

-- CreateIndex
CREATE INDEX "Timetable_schoolId_idx" ON "Timetable"("schoolId");

-- CreateIndex
CREATE INDEX "TimetablePeriod_schoolId_idx" ON "TimetablePeriod"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetablePeriod_timetableId_number_key" ON "TimetablePeriod"("timetableId", "number");

-- CreateIndex
CREATE INDEX "TimetableRoom_schoolId_idx" ON "TimetableRoom"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableRoom_timetableId_name_key" ON "TimetableRoom"("timetableId", "name");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_teacherUserId_weekday_idx" ON "TimetableEntry"("schoolId", "teacherUserId", "weekday");

-- CreateIndex
CREATE INDEX "TimetableEntry_timetableId_gradeId_sectionId_idx" ON "TimetableEntry"("timetableId", "gradeId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_timetableId_weekday_periodId_gradeId_section_key" ON "TimetableEntry"("timetableId", "weekday", "periodId", "gradeId", "sectionId");

-- CreateIndex
CREATE INDEX "ExamSchedule_schoolId_academicYearId_idx" ON "ExamSchedule"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "ExamSchedule_schoolId_status_idx" ON "ExamSchedule"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ExamScheduleDay_scheduleId_sortOrder_idx" ON "ExamScheduleDay"("scheduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamScheduleDay_schoolId_examDate_idx" ON "ExamScheduleDay"("schoolId", "examDate");

-- CreateIndex
CREATE INDEX "ExamScheduleSlot_dayId_gradeId_sortOrder_idx" ON "ExamScheduleSlot"("dayId", "gradeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamScheduleSlot_schoolId_idx" ON "ExamScheduleSlot"("schoolId");

-- CreateIndex
CREATE INDEX "ExamSeatingPlan_scheduleId_idx" ON "ExamSeatingPlan"("scheduleId");

-- CreateIndex
CREATE INDEX "ExamSeatingPlan_schoolId_idx" ON "ExamSeatingPlan"("schoolId");

-- CreateIndex
CREATE INDEX "ExamSeatingRoom_planId_sortOrder_idx" ON "ExamSeatingRoom"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamSeatingRoom_schoolId_idx" ON "ExamSeatingRoom"("schoolId");

-- CreateIndex
CREATE INDEX "ExamSeatingAssignment_roomId_idx" ON "ExamSeatingAssignment"("roomId");

-- CreateIndex
CREATE INDEX "ExamSeatingAssignment_schoolId_studentProfileId_idx" ON "ExamSeatingAssignment"("schoolId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatingAssignment_roomId_seatNo_key" ON "ExamSeatingAssignment"("roomId", "seatNo");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_schoolId_idx" ON "TeacherProfile"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherProfile_homeroomGradeId_homeroomSectionId_idx" ON "TeacherProfile"("homeroomGradeId", "homeroomSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_schoolId_cardCode_key" ON "TeacherProfile"("schoolId", "cardCode");

-- CreateIndex
CREATE INDEX "ClassworkAssignment_schoolId_classSubjectId_status_idx" ON "ClassworkAssignment"("schoolId", "classSubjectId", "status");

-- CreateIndex
CREATE INDEX "ClassworkAssignment_schoolId_createdByUserId_idx" ON "ClassworkAssignment"("schoolId", "createdByUserId");

-- CreateIndex
CREATE INDEX "ClassworkSubmission_studentProfileId_idx" ON "ClassworkSubmission"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassworkSubmission_assignmentId_studentProfileId_key" ON "ClassworkSubmission"("assignmentId", "studentProfileId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_schoolId_gradeId_idx" ON "TeacherAssignment"("schoolId", "gradeId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherProfileId_idx" ON "TeacherAssignment"("teacherProfileId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolId_academicYearId_isCurrent_idx" ON "StudentEnrollment"("schoolId", "academicYearId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentProfileId_academicYearId_key" ON "StudentEnrollment"("studentProfileId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentDocument_studentProfileId_idx" ON "StudentDocument"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentDocument_schoolId_studentProfileId_idx" ON "StudentDocument"("schoolId", "studentProfileId");

-- CreateIndex
CREATE INDEX "BehaviorRecord_studentProfileId_date_idx" ON "BehaviorRecord"("studentProfileId", "date");

-- CreateIndex
CREATE INDEX "BehaviorRecord_schoolId_studentProfileId_idx" ON "BehaviorRecord"("schoolId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentHealthRecord_studentProfileId_key" ON "StudentHealthRecord"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentCertificate_studentProfileId_idx" ON "StudentCertificate"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentCertificate_schoolId_certificateNumber_idx" ON "StudentCertificate"("schoolId", "certificateNumber");

-- CreateIndex
CREATE INDEX "FeeType_schoolId_idx" ON "FeeType"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_schoolId_code_key" ON "FeeType"("schoolId", "code");

-- CreateIndex
CREATE INDEX "FeeSchedule_schoolId_academicYearId_idx" ON "FeeSchedule"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "FeeSchedule_gradeId_idx" ON "FeeSchedule"("gradeId");

-- CreateIndex
CREATE INDEX "StudentFee_schoolId_studentProfileId_idx" ON "StudentFee"("schoolId", "studentProfileId");

-- CreateIndex
CREATE INDEX "StudentFee_schoolId_status_dueDate_idx" ON "StudentFee"("schoolId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "FeeInstallment_studentFeeId_number_key" ON "FeeInstallment"("studentFeeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_schoolId_paidAt_idx" ON "Payment"("schoolId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_studentProfileId_idx" ON "Payment"("studentProfileId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_studentFeeId_idx" ON "PaymentAllocation"("studentFeeId");

-- CreateIndex
CREATE INDEX "LibraryCategory_schoolId_idx" ON "LibraryCategory"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_schoolId_slug_key" ON "LibraryCategory"("schoolId", "slug");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_status_idx" ON "LibraryResource"("schoolId", "status");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_categoryId_idx" ON "LibraryResource"("schoolId", "categoryId");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_gradeId_idx" ON "LibraryResource"("schoolId", "gradeId");

-- CreateIndex
CREATE INDEX "LibraryResource_schoolId_resourceType_idx" ON "LibraryResource"("schoolId", "resourceType");

-- CreateIndex
CREATE INDEX "LibraryResource_platformLibraryResourceId_idx" ON "LibraryResource"("platformLibraryResourceId");

-- CreateIndex
CREATE INDEX "LibraryFavorite_studentProfileId_idx" ON "LibraryFavorite"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryFavorite_studentProfileId_resourceId_key" ON "LibraryFavorite"("studentProfileId", "resourceId");

-- CreateIndex
CREATE INDEX "LibraryReadingProgress_studentProfileId_idx" ON "LibraryReadingProgress"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryReadingProgress_studentProfileId_resourceId_key" ON "LibraryReadingProgress"("studentProfileId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSubject_code_key" ON "PlatformSubject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAcademicStructure_key_key" ON "PlatformAcademicStructure"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformLibraryCategory_slug_key" ON "PlatformLibraryCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMessageTemplate_key_key" ON "PlatformMessageTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAssessmentTemplate_key_key" ON "PlatformAssessmentTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAssessmentTemplateComponent_templateId_name_key" ON "PlatformAssessmentTemplateComponent"("templateId", "name");

-- CreateIndex
CREATE INDEX "SchoolProvisioningLog_schoolId_createdAt_idx" ON "SchoolProvisioningLog"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumPackage_key_key" ON "CurriculumPackage"("key");

-- CreateIndex
CREATE INDEX "CurriculumPackageSubject_packageId_idx" ON "CurriculumPackageSubject"("packageId");

-- CreateIndex
CREATE INDEX "CurriculumPackageSubject_platformSubjectId_idx" ON "CurriculumPackageSubject"("platformSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumPackageSubject_packageId_code_key" ON "CurriculumPackageSubject"("packageId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumPackageDepartment_packageId_name_key" ON "CurriculumPackageDepartment"("packageId", "name");

-- CreateIndex
CREATE INDEX "CurriculumPackageLibraryItem_packageId_idx" ON "CurriculumPackageLibraryItem"("packageId");

-- CreateIndex
CREATE INDEX "CurriculumPackageLibraryItem_platformLibraryResourceId_idx" ON "CurriculumPackageLibraryItem"("platformLibraryResourceId");

-- CreateIndex
CREATE INDEX "CurriculumPackageTemplate_platformMessageTemplateId_idx" ON "CurriculumPackageTemplate"("platformMessageTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumPackageTemplate_packageId_key_key" ON "CurriculumPackageTemplate"("packageId", "key");

-- CreateIndex
CREATE INDEX "CurriculumPackageAssessmentTemplate_packageId_idx" ON "CurriculumPackageAssessmentTemplate"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumPackageAssessmentTemplate_packageId_platformAsses_key" ON "CurriculumPackageAssessmentTemplate"("packageId", "platformAssessmentTemplateId");

-- CreateIndex
CREATE INDEX "SchoolDepartment_schoolId_idx" ON "SchoolDepartment"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolDepartment_schoolId_name_key" ON "SchoolDepartment"("schoolId", "name");

-- CreateIndex
CREATE INDEX "SchoolMessageTemplate_schoolId_idx" ON "SchoolMessageTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolMessageTemplate_platformMessageTemplateId_idx" ON "SchoolMessageTemplate"("platformMessageTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolMessageTemplate_schoolId_key_key" ON "SchoolMessageTemplate"("schoolId", "key");

-- CreateIndex
CREATE INDEX "AdmissionCycle_schoolId_isOpen_idx" ON "AdmissionCycle"("schoolId", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionCycle_schoolId_academicYearId_name_key" ON "AdmissionCycle"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_enrolledProfileId_key" ON "AdmissionApplication"("enrolledProfileId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_cycleId_status_idx" ON "AdmissionApplication"("schoolId", "cycleId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_totalScore_idx" ON "AdmissionApplication"("schoolId", "totalScore");

-- CreateIndex
CREATE INDEX "AdmissionPlacementRule_cycleId_sortOrder_idx" ON "AdmissionPlacementRule"("cycleId", "sortOrder");

-- CreateIndex
CREATE INDEX "Announcement_recipientUserId_createdAt_idx" ON "Announcement"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_date_idx" ON "AttendanceRecord"("schoolId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentProfileId_date_idx" ON "AttendanceRecord"("studentProfileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_schoolId_studentProfileId_date_periodNumbe_key" ON "AttendanceRecord"("schoolId", "studentProfileId", "date", "periodNumber");

-- CreateIndex
CREATE INDEX "User_schoolId_staffRole_idx" ON "User"("schoolId", "staffRole");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_username_key" ON "User"("schoolId", "username");

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplatePermission" ADD CONSTRAINT "RoleTemplatePermission_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplatePermission" ADD CONSTRAINT "RoleTemplatePermission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "PermissionDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGrant" ADD CONSTRAINT "UserPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPaymentProof" ADD CONSTRAINT "PlatformPaymentProof_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPaymentProof" ADD CONSTRAINT "PlatformPaymentProof_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolInvite" ADD CONSTRAINT "SchoolInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePermissionRequest" ADD CONSTRAINT "AttendancePermissionRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcern" ADD CONSTRAINT "AttendanceConcern_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "AttendanceConcern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceConcernAuditEvent" ADD CONSTRAINT "AttendanceConcernAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceCorrection" ADD CONSTRAINT "StaffAttendanceCorrection_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "StaffAttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendanceCorrection" ADD CONSTRAINT "StaffAttendanceCorrection_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQrCredential" ADD CONSTRAINT "StaffQrCredential_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQrCredential" ADD CONSTRAINT "StaffQrCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "ParentNotification" ADD CONSTRAINT "ParentNotification_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentNotification" ADD CONSTRAINT "ParentNotification_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_platformSubjectId_fkey" FOREIGN KEY ("platformSubjectId") REFERENCES "PlatformSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_assessmentTemplateId_fkey" FOREIGN KEY ("assessmentTemplateId") REFERENCES "AssessmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTermSheet" ADD CONSTRAINT "ClassSubjectTermSheet_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTermSheet" ADD CONSTRAINT "ClassSubjectTermSheet_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTermSheet" ADD CONSTRAINT "ClassSubjectTermSheet_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTermSheet" ADD CONSTRAINT "ClassSubjectTermSheet_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTermSheet" ADD CONSTRAINT "ClassSubjectTermSheet_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_platformAssessmentTemplateId_fkey" FOREIGN KEY ("platformAssessmentTemplateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplateComponent" ADD CONSTRAINT "AssessmentTemplateComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplateGrade" ADD CONSTRAINT "AssessmentTemplateGrade_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplateGrade" ADD CONSTRAINT "AssessmentTemplateGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplateGrade" ADD CONSTRAINT "AssessmentTemplateGrade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrectionRequest" ADD CONSTRAINT "ScoreCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentScore" ADD CONSTRAINT "StudentAssessmentScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentScore" ADD CONSTRAINT "StudentAssessmentScore_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingBand" ADD CONSTRAINT "GradingBand_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "GradingScale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableRoom" ADD CONSTRAINT "TimetableRoom_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TimetablePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TimetableRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleDay" ADD CONSTRAINT "ExamScheduleDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExamSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ExamScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleSlot" ADD CONSTRAINT "ExamScheduleSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingPlan" ADD CONSTRAINT "ExamSeatingPlan_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExamSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingRoom" ADD CONSTRAINT "ExamSeatingRoom_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamSeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ExamSeatingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_homeroomGradeId_fkey" FOREIGN KEY ("homeroomGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_homeroomSectionId_fkey" FOREIGN KEY ("homeroomSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkAssignment" ADD CONSTRAINT "ClassworkAssignment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkAssignment" ADD CONSTRAINT "ClassworkAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkSubmission" ADD CONSTRAINT "ClassworkSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassworkAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkSubmission" ADD CONSTRAINT "ClassworkSubmission_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkSubmission" ADD CONSTRAINT "ClassworkSubmission_gradedByUserId_fkey" FOREIGN KEY ("gradedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthRecord" ADD CONSTRAINT "StudentHealthRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCertificate" ADD CONSTRAINT "StudentCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeType" ADD CONSTRAINT "FeeType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryResource" ADD CONSTRAINT "LibraryResource_platformLibraryResourceId_fkey" FOREIGN KEY ("platformLibraryResourceId") REFERENCES "PlatformLibraryResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "PlatformLibraryResource" ADD CONSTRAINT "PlatformLibraryResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlatformLibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAssessmentTemplateComponent" ADD CONSTRAINT "PlatformAssessmentTemplateComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProvisioningLog" ADD CONSTRAINT "SchoolProvisioningLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackage" ADD CONSTRAINT "CurriculumPackage_academicStructureId_fkey" FOREIGN KEY ("academicStructureId") REFERENCES "PlatformAcademicStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageSubject" ADD CONSTRAINT "CurriculumPackageSubject_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageSubject" ADD CONSTRAINT "CurriculumPackageSubject_platformSubjectId_fkey" FOREIGN KEY ("platformSubjectId") REFERENCES "PlatformSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageDepartment" ADD CONSTRAINT "CurriculumPackageDepartment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageLibraryItem" ADD CONSTRAINT "CurriculumPackageLibraryItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageLibraryItem" ADD CONSTRAINT "CurriculumPackageLibraryItem_platformLibraryResourceId_fkey" FOREIGN KEY ("platformLibraryResourceId") REFERENCES "PlatformLibraryResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageTemplate" ADD CONSTRAINT "CurriculumPackageTemplate_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageTemplate" ADD CONSTRAINT "CurriculumPackageTemplate_platformMessageTemplateId_fkey" FOREIGN KEY ("platformMessageTemplateId") REFERENCES "PlatformMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageAssessmentTemplate" ADD CONSTRAINT "CurriculumPackageAssessmentTemplate_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CurriculumPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumPackageAssessmentTemplate" ADD CONSTRAINT "CurriculumPackageAssessmentTemplate_platformAssessmentTemp_fkey" FOREIGN KEY ("platformAssessmentTemplateId") REFERENCES "PlatformAssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolDepartment" ADD CONSTRAINT "SchoolDepartment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMessageTemplate" ADD CONSTRAINT "SchoolMessageTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMessageTemplate" ADD CONSTRAINT "SchoolMessageTemplate_platformMessageTemplateId_fkey" FOREIGN KEY ("platformMessageTemplateId") REFERENCES "PlatformMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionCycle" ADD CONSTRAINT "AdmissionCycle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionCycle" ADD CONSTRAINT "AdmissionCycle_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AdmissionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_targetGradeId_fkey" FOREIGN KEY ("targetGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placedGradeId_fkey" FOREIGN KEY ("placedGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placedSectionId_fkey" FOREIGN KEY ("placedSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_placementRuleId_fkey" FOREIGN KEY ("placementRuleId") REFERENCES "AdmissionPlacementRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_enrolledProfileId_fkey" FOREIGN KEY ("enrolledProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AdmissionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_targetGradeId_fkey" FOREIGN KEY ("targetGradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionPlacementRule" ADD CONSTRAINT "AdmissionPlacementRule_targetSectionId_fkey" FOREIGN KEY ("targetSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
