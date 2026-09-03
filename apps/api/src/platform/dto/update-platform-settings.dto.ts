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
  ValidateIf,
} from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  platformName?: string;

  @ValidateIf((_, v) => v !== null && v !== undefined && String(v).trim() !== '')
  @IsEmail()
  @MaxLength(200)
  @IsOptional()
  supportEmail?: string | null;

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

  @ValidateIf((_, v) => v !== null && v !== undefined && String(v).trim() !== '')
  @IsEmail()
  @MaxLength(200)
  @IsOptional()
  emailReplyTo?: string | null;

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

  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  landingHeroImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telebirrNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  telebirrAccountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  payoutInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialInstagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialFacebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialLinkedinUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialYoutubeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialTiktokUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialGithubUrl?: string;
}
