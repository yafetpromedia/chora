import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AbsenceDeductionMethod,
  CompensationCalcMethod,
  CompensationComponentType,
  OvertimeApprovalStatus,
  PayFrequency,
  PayrollAdjustmentType,
  PayrollPayMethod,
  PayrollPaymentStatus,
} from '@prisma/client';

export class UpsertCompensationComponentDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(CompensationComponentType)
  type!: CompensationComponentType;

  @IsOptional()
  @IsEnum(CompensationCalcMethod)
  method?: CompensationCalcMethod;

  @IsOptional()
  taxable?: boolean;

  @IsOptional()
  recurring?: boolean;

  @IsOptional()
  active?: boolean;
}

export class CompensationLineDto {
  @IsString()
  componentId!: string;

  @IsOptional()
  @IsInt()
  amountCents?: number;

  @IsOptional()
  @IsInt()
  percentBp?: number;
}

export class CreateEmployeeCompensationDto {
  @IsEnum(PayFrequency)
  payFrequency!: PayFrequency;

  @IsInt()
  @Min(0)
  basicAmountCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyRateCents?: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  lines?: CompensationLineDto[];
}

export class CreatePayrollPeriodDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsDateString()
  payDate!: string;
}

export class PayrollAdjustmentDto {
  @IsString()
  userId!: string;

  @IsEnum(PayrollAdjustmentType)
  type!: PayrollAdjustmentType;

  @IsInt()
  amountCents!: number;

  @IsString()
  @MinLength(1)
  reason!: string;
}

export class PayrollSettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  workingDaysPerMonth?: number;

  @IsOptional()
  overtimeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  overtimeMultiplierBp?: number;

  @IsOptional()
  overtimeApprovalRequired?: boolean;

  @IsOptional()
  @IsEnum(AbsenceDeductionMethod)
  absenceDeductionMethod?: AbsenceDeductionMethod;

  @IsOptional()
  @IsInt()
  absenceFixedDays?: number;

  @IsOptional()
  statutoryActive?: boolean;
}

export class RecordPayrollPaymentDto {
  @IsEnum(PayrollPayMethod)
  method!: PayrollPayMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(PayrollPaymentStatus)
  status?: PayrollPaymentStatus;
}

export class ReviewOvertimeDto {
  @IsEnum(OvertimeApprovalStatus)
  status!: OvertimeApprovalStatus;
}
