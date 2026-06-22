import { IsString, MinLength } from 'class-validator';

export class VerifySubscriptionCheckoutDto {
  @IsString()
  @MinLength(6)
  txRef!: string;
}
