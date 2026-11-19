import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamScheduleDto {
  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  academicTermId?: string | null;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  shiftLabel?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateExamScheduleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  academicTermId?: string | null;

  @IsOptional()
  @IsString()
  shiftLabel?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class ExamScheduleSlotDto {
  @IsString()
  gradeId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string | null;

  @IsString()
  subjectLabel!: string;

  @IsOptional()
  @IsString()
  startTime?: string | null;

  @IsOptional()
  @IsString()
  endTime?: string | null;

  @IsOptional()
  sortOrder?: number;
}

export class ExamScheduleDayDto {
  @IsString()
  examDate!: string;

  @IsOptional()
  @IsBoolean()
  isStudyDay?: boolean;

  @IsOptional()
  @IsString()
  studyNote?: string | null;

  @IsOptional()
  @IsString()
  defaultStartTime?: string | null;

  @IsOptional()
  @IsString()
  defaultEndTime?: string | null;

  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamScheduleSlotDto)
  slots!: ExamScheduleSlotDto[];
}

export class ReplaceExamScheduleDaysDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamScheduleDayDto)
  days!: ExamScheduleDayDto[];
}

export class ExamSeatingRoomInputDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  roomRef?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class CreateExamSeatingPlanDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @IsString({ each: true })
  sourceGradeIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSeatingRoomInputDto)
  rooms!: ExamSeatingRoomInputDto[];
}

export class UpdateExamSeatingPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @IsString({ each: true })
  sourceGradeIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSeatingRoomInputDto)
  rooms!: ExamSeatingRoomInputDto[];
}
