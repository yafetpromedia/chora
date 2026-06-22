import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformSubjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  curriculum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  level?: string;

  @IsOptional()
  @IsInt()
  gradeMin?: number;

  @IsOptional()
  @IsInt()
  gradeMax?: number;
}

export class UpdatePlatformSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  curriculum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  level?: string;

  @IsOptional()
  @IsInt()
  gradeMin?: number;

  @IsOptional()
  @IsInt()
  gradeMax?: number;

  @IsOptional()
  isArchived?: boolean;
}

export class UpdateCurriculumPackageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class AddPackageSubjectDto {
  @IsString()
  platformSubjectId!: string;

  @IsOptional()
  @IsString()
  level?: string;
}
