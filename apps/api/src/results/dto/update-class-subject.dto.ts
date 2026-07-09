import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateClassSubjectDto {
  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsOptional()
  @IsString()
  assessmentTemplateId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  weeklySessions?: number;
}
