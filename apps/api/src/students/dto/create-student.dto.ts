import { Gender } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  gradeId!: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  /** Optional override — auto-generated when omitted */
  @IsString()
  @MinLength(1)
  @IsOptional()
  studentId?: string;

  /** National ID number (stored as FCN on profile) */
  @IsString()
  @MinLength(1)
  idNumber!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsISO8601()
  dateOfBirth!: string;

  @IsString()
  @MinLength(1)
  fatherName!: string;

  @IsString()
  @MinLength(9)
  fatherPhone!: string;

  @IsString()
  @MinLength(1)
  motherName!: string;

  @IsString()
  @MinLength(9)
  motherPhone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  /** @deprecated Use fatherName — kept for older clients */
  @IsString()
  @IsOptional()
  parentName?: string;

  /** @deprecated Use fatherPhone */
  @IsString()
  @IsOptional()
  parentPhone?: string;

  @IsEmail()
  @IsOptional()
  parentEmail?: string;

  @IsString()
  @IsOptional()
  fayedaVerificationToken?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  fan?: string;

  @IsString()
  @IsOptional()
  fcn?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  woreda?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
