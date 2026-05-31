import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class MatrixScoreEntryDto {
  @IsString()
  studentProfileId!: string;

  @IsString()
  assessmentId!: string;

  @IsInt()
  @Min(0)
  score!: number;
}

export class SaveScoreMatrixDto {
  @IsString()
  termId!: string;

  @IsString()
  classSubjectId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MatrixScoreEntryDto)
  entries!: MatrixScoreEntryDto[];
}
