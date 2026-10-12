import { AttendanceConcernResolution } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveAttendanceConcernDto {
  @IsEnum(AttendanceConcernResolution)
  resolution!: AttendanceConcernResolution;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
