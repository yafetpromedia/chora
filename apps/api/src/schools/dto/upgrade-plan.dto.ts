import { Plan } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpgradePlanDto {
  @IsEnum(Plan)
  plan!: Plan;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsString()
  bundleId?: string | null;
}
