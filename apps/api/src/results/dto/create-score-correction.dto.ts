import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateScoreCorrectionDto {
  @IsString()
  assessmentId!: string;

  /** Required for parents (linked child). Students may omit. */
  @IsOptional()
  @IsString()
  studentProfileId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message!: string;
}
