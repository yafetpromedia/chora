import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ReportCommentKind {
  TEACHER = 'teacher',
  PRINCIPAL = 'principal',
}

export class ReportCommentDraftDto {
  @IsEnum(ReportCommentKind)
  kind!: ReportCommentKind;

  @IsString()
  @MinLength(20)
  @MaxLength(8000)
  context!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  studentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  termName?: string;
}
