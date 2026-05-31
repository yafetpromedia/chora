import { SchoolType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class RegisterSchoolDto {
  @IsString()
  @MinLength(2)
  schoolName!: string;

  @IsEnum(SchoolType)
  @IsOptional()
  schoolType?: SchoolType;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEmail()
  @IsOptional()
  schoolEmail?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @MinLength(1)
  adminFirstName!: string;

  @IsString()
  @MinLength(1)
  adminLastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  country?: string;
}
