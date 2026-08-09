import { AdmissionStatus, Gender } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAdmissionApplicationDto {
  @IsEnum(AdmissionStatus)
  @IsOptional()
  status?: AdmissionStatus;

  @IsString()
  @MinLength(1)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsISO8601()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  fatherName?: string;

  @IsString()
  @MinLength(9)
  @IsOptional()
  fatherPhone?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  motherName?: string;

  @IsString()
  @MinLength(9)
  @IsOptional()
  motherPhone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  targetGradeId?: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  entranceScore?: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  interviewScore?: number;

  @IsString()
  @IsOptional()
  placedGradeId?: string;

  @IsString()
  @IsOptional()
  placedSectionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
