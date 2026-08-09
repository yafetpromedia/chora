import { BillingCurrency } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  platformName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultTimezone?: string;

  @IsOptional()
  @IsBoolean()
  allowSelfRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAdminApproval?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  defaultTrialDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  welcomeMessage?: string;

  @IsOptional()
  @IsEnum(BillingCurrency)
  defaultBillingCurrency?: BillingCurrency;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  invoicePrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  invoiceGraceDays?: number;

  @IsOptional()
  @IsBoolean()
  autoSuspendOverdue?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emailFromName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  emailReplyTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  smsSenderName?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceMessage?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  sessionTimeoutMinutes?: number;
}
