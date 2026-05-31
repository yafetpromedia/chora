import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  @MinLength(4)
  code!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  gradeId!: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  @IsOptional()
  periodNumber?: number;
}
