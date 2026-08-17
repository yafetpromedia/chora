import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ProposeScoreCorrectionDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  proposedScore!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  replyNote?: string;
}
