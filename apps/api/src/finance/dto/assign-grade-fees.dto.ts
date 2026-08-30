import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignGradeFeesDto {
  @IsString()
  feeScheduleId!: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  gradeFromId?: string;

  @IsOptional()
  @IsString()
  gradeToId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsDateString()
  dueDate!: string;
}
