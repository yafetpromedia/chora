import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitParentPaymentDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MaxLength(120)
  reference!: string;

  @IsOptional()
  @IsIn(['BANK_TRANSFER', 'TELEBIRR'])
  method?: 'BANK_TRANSFER' | 'TELEBIRR';

  @IsOptional()
  @IsString()
  @MaxLength(2_500_000)
  @Matches(/^(data:image\/(jpeg|jpg|png|webp|gif);base64,|https:\/\/)/i, {
    message: 'Receipt must be an image upload or an https link',
  })
  proofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
