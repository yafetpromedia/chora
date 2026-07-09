import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class StudentSubjectScoreEntryDto {
  @IsString()
  classSubjectId!: string;

  @IsString()
  assessmentId!: string;

  @IsInt()
  @Min(0)
  score!: number;
}

export class SaveStudentSubjectMatrixDto {
  @IsString()
  termId!: string;

  @IsString()
  studentProfileId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentSubjectScoreEntryDto)
  entries!: StudentSubjectScoreEntryDto[];
}
