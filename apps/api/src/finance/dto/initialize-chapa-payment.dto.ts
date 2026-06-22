import { IsInt, Min } from 'class-validator';

export class InitializeChapaPaymentDto {
  @IsInt()
  @Min(1)
  amountCents!: number;
}
