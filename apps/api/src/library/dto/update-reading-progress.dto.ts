import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateReadingProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lastReadPage?: number;
}
