import { Gender } from '@prisma/client';
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

export class CreateAdmissionApplicationDto {
  @IsString()
  cycleId!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

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
  notes?: string;
}
