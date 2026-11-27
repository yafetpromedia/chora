import { IsString, MinLength } from 'class-validator';

export class LookupIdCardDto {
  @IsString()
  @MinLength(4)
  code!: string;
}
