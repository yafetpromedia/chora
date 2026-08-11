import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  /** Student-only: whether linked parents can view results / report cards. */
  @IsOptional()
  @IsBoolean()
  parentsCanViewResults?: boolean;
}
