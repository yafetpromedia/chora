import { IsNumber, IsString, Max, Min } from 'class-validator';

export class UpsertResultDto {
  @IsString()
  studentId!: string;

  @IsString()
  subject!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;
}
