import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AttendancePermissionType, AttendanceReason } from '@prisma/client';

export class CreateAttendancePermissionDto {
  @IsOptional()
  @IsString()
  studentProfileId?: string;

  @IsEnum(AttendancePermissionType)
  type!: AttendancePermissionType;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsEnum(AttendanceReason)
  reason?: AttendanceReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
