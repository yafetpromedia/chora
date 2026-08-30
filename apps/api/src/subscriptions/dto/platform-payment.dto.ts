import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SubmitPlatformPaymentDto {
  @IsIn(['TELEBIRR', 'BANK_TRANSFER'])
  method!: 'TELEBIRR' | 'BANK_TRANSFER';

  @IsString()
  @MinLength(4)
  @MaxLength(120)
  transactionId!: string;

  @IsString()
  @MaxLength(2_500_000)
  @Matches(/^(data:image\/(jpeg|jpg|png|webp|gif);base64,|https:\/\/)/i, {
    message: 'Receipt must be an image upload or an https link',
  })
  proofUrl!: string;
}

export class ReviewPlatformPaymentDto {
  @IsIn(['CONFIRMED', 'REJECTED'])
  status!: 'CONFIRMED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
