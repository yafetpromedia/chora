import { GradePreset, SchoolType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTenantSchoolDto {
  @IsString()
  schoolName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  curriculumPackageKey?: string;

  @IsOptional()
  @IsEnum(GradePreset)
  gradePreset?: GradePreset;

  @IsOptional()
  @IsEnum(SchoolType)
  schoolType?: SchoolType;
}
