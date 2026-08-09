import { GradePreset } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformStructureDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Key must be uppercase letters, numbers, and underscores',
  })
  key!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(GradePreset)
  gradePreset!: GradePreset;
}

export class UpdatePlatformStructureDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(GradePreset)
  gradePreset?: GradePreset;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
