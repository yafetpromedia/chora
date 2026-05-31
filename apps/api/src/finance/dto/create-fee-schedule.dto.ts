import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeeScheduleDto {
  @IsString()
  feeTypeId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsIn(['ONE_TIME', 'MONTHLY', 'TERM', 'ANNUAL'])
  frequency?: 'ONE_TIME' | 'MONTHLY' | 'TERM' | 'ANNUAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
