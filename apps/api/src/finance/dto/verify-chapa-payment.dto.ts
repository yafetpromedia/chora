import { IsString, MinLength } from 'class-validator';

export class VerifyChapaPaymentDto {
  @IsString()
  @MinLength(3)
  txRef!: string;
}
