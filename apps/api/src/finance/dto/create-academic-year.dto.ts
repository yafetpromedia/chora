import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export type AcademicCalendarSystemDto = 'ETHIOPIAN' | 'GREGORIAN';

export class CreateAcademicYearDto {
  @IsString()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  /** E.C. (Ethiopian) or G.C. (Gregorian). */
  @IsOptional()
  @IsIn(['ETHIOPIAN', 'GREGORIAN'])
  calendarSystem?: AcademicCalendarSystemDto;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
