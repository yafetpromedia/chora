import { Weekday } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class TimetableEntryItemDto {
  @IsEnum(Weekday)
  weekday!: Weekday;

  @IsInt()
  @Min(1)
  periodNumber!: number;

  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  teacherUserId?: string | null;

  @IsOptional()
  @IsString()
  roomName?: string | null;
}

export class SaveTimetableEntriesDto {
  @IsString()
  academicYearId!: string;

  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableEntryItemDto)
  entries!: TimetableEntryItemDto[];
}
