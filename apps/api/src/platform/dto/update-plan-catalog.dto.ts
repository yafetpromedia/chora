import { Plan } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePlanCatalogDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  studentsLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  teachersLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  adminsLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  usdMonthly?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  etbMonthly?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isListed?: boolean;
}

export class UpdateSchoolPlanDto {
  @IsEnum(Plan)
  plan!: Plan;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  trialEndsAt?: string | null;
}
