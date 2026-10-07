import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;

  /** Admin creating on behalf of another staff member */
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ReviewLeaveRequestDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

export class UpsertLeaveBalanceDto {
  @IsString()
  userId!: string;

  @IsString()
  leaveTypeId!: string;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsInt()
  @Min(0)
  allocated!: number;
}
