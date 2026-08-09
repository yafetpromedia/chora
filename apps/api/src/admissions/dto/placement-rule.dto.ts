import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlacementRuleDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  minScore!: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  maxScore!: number;

  @IsString()
  targetGradeId!: string;

  @IsString()
  @IsOptional()
  targetSectionId?: string;

  @IsString()
  @IsOptional()
  streamMatch?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePlacementRuleDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  label?: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  minScore?: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  maxScore?: number;

  @IsString()
  @IsOptional()
  targetGradeId?: string;

  @IsString()
  @IsOptional()
  targetSectionId?: string;

  @IsString()
  @IsOptional()
  streamMatch?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
