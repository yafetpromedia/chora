import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  termId!: string;

  @IsString()
  classSubjectId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weightPercent?: number;
}
