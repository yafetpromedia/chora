import { PlatformRole } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdatePlatformRoleGrantsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  SUPPORT?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  SALES?: string[];
}

export class UpdatePlatformOperatorRoleDto {
  @IsEnum(PlatformRole)
  role!: PlatformRole;
}

export class CreatePlatformOperatorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEnum(PlatformRole)
  role!: PlatformRole;
}
