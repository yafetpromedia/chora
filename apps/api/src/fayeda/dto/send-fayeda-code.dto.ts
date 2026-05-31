import { IsString, Matches, MinLength } from 'class-validator';

export class SendFayedaCodeDto {
  /** FAN (16 digits) or FCN (12 digits) from the Fayeda digital ID card */
  @IsString()
  @MinLength(12)
  @Matches(/^\d{12,16}$/, {
    message: 'Enter a valid FAN (16 digits) or FCN (12 digits)',
  })
  identifier!: string;
}
