import { CouponKind, Plan } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsEnum(CouponKind)
  kind!: CouponKind;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extraDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complimentaryMonths?: number;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Transform(({ value }: { value: unknown }): number | null | undefined => {
    if (value === null || value === undefined) return value;
    if (value === '') return null;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extraDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complimentaryMonths?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(Plan)
  plan?: Plan | null;
}

export class RedeemCouponDto {
  @IsString()
  @MinLength(3)
  code!: string;
}
