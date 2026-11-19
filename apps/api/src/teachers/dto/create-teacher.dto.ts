import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  /** Role template slug, e.g. homeroom_teacher, registrar, finance_officer */
  @IsString()
  roleTemplateSlug!: string;

  @IsOptional()
  @IsString()
  homeroomGradeId?: string;

  @IsOptional()
  @IsString()
  homeroomSectionId?: string;
}
