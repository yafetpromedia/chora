import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AttendancePermissionStatus } from '@prisma/client';

export class ReviewAttendancePermissionDto {
  @IsEnum(AttendancePermissionStatus)
  status!: AttendancePermissionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
