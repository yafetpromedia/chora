import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SendRemindersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  daysBeforeDue?: number;
}
