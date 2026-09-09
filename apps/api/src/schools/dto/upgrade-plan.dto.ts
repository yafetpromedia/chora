import { Plan } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

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
