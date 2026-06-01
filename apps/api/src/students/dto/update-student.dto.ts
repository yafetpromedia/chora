import { Gender } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateStudentDto {
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

  @IsString()
  @IsOptional()
  gradeId?: string;

  @IsString()
  @IsOptional()
  sectionId?: string | null;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsISO8601()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  studentId?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string | null;

  @IsString()
  @IsOptional()
  address?: string | null;

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

  @IsString()
  @MinLength(1)
  @IsOptional()
  parentName?: string;

  @IsString()
  @MinLength(9)
  @IsOptional()
  parentPhone?: string;
}
