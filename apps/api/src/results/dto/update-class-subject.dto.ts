import { IsOptional, IsString } from 'class-validator';

export class UpdateClassSubjectDto {
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsOptional()
  @IsString()
  assessmentTemplateId?: string | null;
}
