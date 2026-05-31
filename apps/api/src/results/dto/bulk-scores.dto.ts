import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScoreEntryDto {
  @IsString()
  studentProfileId!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  score!: number;
}

export class BulkScoresDto {
  @IsString()
  assessmentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores!: ScoreEntryDto[];
}
