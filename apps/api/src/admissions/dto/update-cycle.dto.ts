import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAdmissionCycleDto {
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
