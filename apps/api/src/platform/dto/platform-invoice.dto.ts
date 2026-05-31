import { BillingCurrency, Plan, PlatformInvoiceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlatformInvoiceDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountUsd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountEtb?: number;

  @IsOptional()
  @IsEnum(BillingCurrency)
  currency?: BillingCurrency;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePlatformInvoiceDto {
  @IsOptional()
  @IsEnum(PlatformInvoiceStatus)
  status?: PlatformInvoiceStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}
