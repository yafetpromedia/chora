import { Plan } from '@prisma/client';
import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class SubscriptionCheckoutDto {
  @IsEnum(Plan)
  @IsIn([Plan.STARTER, Plan.PROFESSIONAL])
  plan!: Plan;

  @IsIn(['month', 'year'])
  interval!: 'month' | 'year';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsString()
  bundleId?: string | null;
}
