import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateParentAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password?: string;
}
