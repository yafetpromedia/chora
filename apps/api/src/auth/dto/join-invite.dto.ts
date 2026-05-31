import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class JoinInviteDto {
  @IsString()
  @MinLength(8)
  inviteToken!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  externalRef?: string;
}
