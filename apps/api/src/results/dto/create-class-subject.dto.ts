import { IsOptional, IsString } from 'class-validator';

export class CreateClassSubjectDto {
  @IsString()
  subjectId!: string;

  @IsString()
  academicYearId!: string;

  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  assessmentTemplateId?: string;
}
