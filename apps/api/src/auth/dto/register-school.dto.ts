import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterSchoolDto {
  @IsString()
  @MinLength(2)
  schoolName!: string;

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
