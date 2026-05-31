import { IsOptional, IsString } from 'class-validator';
import { TeacherAssignmentDto } from './teacher-assignment.dto';

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  roleTemplateSlug?: string;

  @IsOptional()
  @IsString()
  homeroomGradeId?: string | null;

  @IsOptional()
  @IsString()
  homeroomSectionId?: string | null;

  @IsOptional()
  assignments?: TeacherAssignmentDto[];
}
