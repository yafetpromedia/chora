import { AttendanceMode, SchoolType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class UpdateSchoolSettingsDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsEnum(SchoolType)
  @IsOptional()
  schoolType?: SchoolType;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @Matches(HEX_COLOR, { message: 'primaryColor must be a hex color like #3d9b9b' })
  @IsOptional()
  primaryColor?: string | null;

  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @Matches(HEX_COLOR, { message: 'accentColor must be a hex color like #5ec9cf' })
  @IsOptional()
  accentColor?: string | null;

  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @Matches(HEX_COLOR, { message: 'accentDeep must be a hex color like #0f766e' })
  @IsOptional()
  accentDeep?: string | null;

  @IsEnum(AttendanceMode)
  @IsOptional()
  attendanceMode?: AttendanceMode;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  paymentInstructions?: string;

  @IsString()
  @IsOptional()
  reportCardTitle?: string;

  @IsString()
  @IsOptional()
  reportCardTagline?: string;
}
