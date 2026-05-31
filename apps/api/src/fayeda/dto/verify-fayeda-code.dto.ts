import { IsString, Length, MinLength } from 'class-validator';

export class VerifyFayedaCodeDto {
  @IsString()
  @MinLength(1)
  sessionId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
