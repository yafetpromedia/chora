import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlatformProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
