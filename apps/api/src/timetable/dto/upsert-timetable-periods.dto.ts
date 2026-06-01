import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class TimetablePeriodItemDto {
  @IsInt()
  @Min(1)
  number!: number;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpsertTimetablePeriodsDto {
  @IsString()
  academicYearId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetablePeriodItemDto)
  periods!: TimetablePeriodItemDto[];
}
