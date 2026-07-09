import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GenerateTimetableDto {
  @IsString()
  academicYearId!: string;

  /** Limit generation to one grade (optional — default is whole school). */
  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  /** Replace existing timetable entries in scope before generating. */
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}
