import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignGradeFeesDto {
  @IsString()
  feeScheduleId!: string;

  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsDateString()
  dueDate!: string;
}
