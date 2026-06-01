import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SubmitParentPaymentDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MaxLength(120)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  proofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
