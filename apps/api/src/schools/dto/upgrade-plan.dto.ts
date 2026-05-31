import { IsEnum } from 'class-validator';
import { Plan } from '@prisma/client';

export class UpgradePlanDto {
  @IsEnum(Plan)
  plan!: Plan;
}
