import { IsEnum, IsIn } from 'class-validator';
import { Plan } from '@prisma/client';

export class SubscriptionCheckoutDto {
  @IsEnum(Plan)
  @IsIn([Plan.STARTER, Plan.PROFESSIONAL])
  plan!: Plan;

  @IsIn(['month', 'year'])
  interval!: 'month' | 'year';
}
