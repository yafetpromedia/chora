import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const STAFF_ATTENDANCE_STATUSES = [
  'present',
  'late',
  'absent',
  'half_day',
  'on_leave',
  'excused',
] as const;

export type StaffAttendanceStatusDto =
  (typeof STAFF_ATTENDANCE_STATUSES)[number];

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class StaffAttendanceSettingsDto {
  @IsOptional()
  @Matches(TIME_HH_MM, { message: 'checkInTime must be HH:mm' })
  checkInTime?: string;

  @IsOptional()
  @Matches(TIME_HH_MM, { message: 'checkOutTime must be HH:mm' })
  checkOutTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes?: number;

  @IsOptional()
  @IsBoolean()
  overtimeEnabled?: boolean;
}

export class StaffCheckInDto {
  @IsString()
  userId!: string;

  @IsDateString()
  date!: string;

  /** ISO datetime or HH:mm (school-local intent). Defaults to now. */
  @IsOptional()
  @IsString()
  checkInAt?: string;
}

export class StaffCheckOutDto {
  @IsString()
  userId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  checkOutAt?: string;
}

export class ManualStaffAttendanceDto {
  @IsString()
  userId!: string;

  @IsDateString()
  date!: string;

  @IsIn(STAFF_ATTENDANCE_STATUSES)
  status!: StaffAttendanceStatusDto;

  @IsOptional()
  @IsString()
  checkInAt?: string;

  @IsOptional()
  @IsString()
  checkOutAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CorrectStaffAttendanceDto {
  @IsIn(STAFF_ATTENDANCE_STATUSES)
  status!: StaffAttendanceStatusDto;

  @IsOptional()
  @IsString()
  checkInAt?: string | null;

  @IsOptional()
  @IsString()
  checkOutAt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export const STAFF_DEPARTMENTS = [
  'teachers',
  'administrative',
  'support',
  'other',
] as const;

export type StaffDepartmentDto = (typeof STAFF_DEPARTMENTS)[number];

export class StaffScanDto {
  @IsString()
  @MinLength(4)
  code!: string;

  @IsDateString()
  date!: string;

  /** auto = check-in then check-out on successive scans */
  @IsOptional()
  @IsIn(['auto', 'check_in', 'check_out'])
  mode?: 'auto' | 'check_in' | 'check_out';
}

export class BulkMarkUnmarkedDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsIn(['present', 'absent', 'on_leave', 'excused'])
  status?: 'present' | 'absent' | 'on_leave' | 'excused';

  @IsOptional()
  @IsIn(STAFF_DEPARTMENTS)
  department?: StaffDepartmentDto;

  @IsOptional()
  @IsIn(['teachers', 'staff', 'all'])
  group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
