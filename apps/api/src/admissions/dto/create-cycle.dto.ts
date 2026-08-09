import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdmissionCycleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  academicYearId!: string;

  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;

  @IsBoolean()
  @IsOptional()
  autoPlaceOnScore?: boolean;

  @IsBoolean()
  @IsOptional()
  autoAcceptOnPlace?: boolean;

  @IsBoolean()
  @IsOptional()
  autoEnrollOnPlace?: boolean;
}
