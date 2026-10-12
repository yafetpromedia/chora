import {
  AttendanceConcernType,
  ObservedAttendanceStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAttendanceConcernDto {
  @IsString()
  @MinLength(1)
  timetableEntryId!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsEnum(AttendanceConcernType)
  concernType!: AttendanceConcernType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  observedPresentCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  observedAbsentCount?: number;

  @IsOptional()
  @IsString()
  studentProfileId?: string;

  @IsOptional()
  @IsEnum(ObservedAttendanceStatus)
  observedStudentStatus?: ObservedAttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Allow create when a similar open concern already exists. */
  @IsOptional()
  @IsBoolean()
  acknowledgeDuplicate?: boolean;
}
