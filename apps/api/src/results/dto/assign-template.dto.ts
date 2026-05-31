import { IsOptional, IsString } from 'class-validator';

export class AssignTemplateToGradeDto {
  @IsString()
  gradeId!: string;

  /** Omit for all subjects in the grade */
  @IsOptional()
  @IsString()
  subjectId?: string;
}

export class AssignTemplateToClassSubjectDto {
  @IsString()
  templateId!: string;
}
