import { Gender } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { TeacherAssignmentDto } from './teacher-assignment.dto';

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  roleTemplateSlug?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  bloodType?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  emergencyContactName?: string | null;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string | null;

  @IsOptional()
  @IsString()
  homeroomGradeId?: string | null;

  @IsOptional()
  @IsString()
  homeroomSectionId?: string | null;

  @IsOptional()
  assignments?: TeacherAssignmentDto[];
}
