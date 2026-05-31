import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AttendanceEntryDto {
  @IsString()
  studentProfileId!: string;

  @IsIn(['present', 'absent', 'late', 'excused'])
  status!: 'present' | 'absent' | 'late' | 'excused';

  @IsOptional()
  @IsIn(['sick', 'family_emergency', 'unexcused', 'other'])
  reason?: 'sick' | 'family_emergency' | 'unexcused' | 'other';
}

export class BulkAttendanceDto {
  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsDateString()
  date!: string;

  /** 0 = daily attendance; 1+ = period slot */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  periodNumber?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records!: AttendanceEntryDto[];
}
