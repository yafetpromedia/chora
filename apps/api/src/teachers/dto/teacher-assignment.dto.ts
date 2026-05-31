import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TeacherAssignmentDto {
  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsBoolean()
  isHomeroom?: boolean;
}
