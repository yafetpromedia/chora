import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ClassworkType } from '@prisma/client';

export class CreateClassworkDto {
  @IsString()
  classSubjectId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ClassworkType)
  type!: ClassworkType;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateClassworkDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ClassworkType)
  type?: ClassworkType;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class SubmitClassworkDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class GradeSubmissionDto {
  @IsInt()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
