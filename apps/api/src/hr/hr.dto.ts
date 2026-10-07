import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EmploymentStatus, EmploymentType, Gender } from '@prisma/client';

export class UpsertHrOrgDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  sortOrder?: number;
}

export class UpsertEmployeeProfileDto {
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyName?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @IsOptional()
  @IsString()
  hrDepartmentId?: string | null;

  @IsOptional()
  @IsString()
  hrPositionId?: string | null;

  @IsOptional()
  @IsString()
  supervisorUserId?: string | null;

  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  @IsOptional()
  @IsDateString()
  contractStart?: string | null;

  @IsOptional()
  @IsDateString()
  contractEnd?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string | null;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
