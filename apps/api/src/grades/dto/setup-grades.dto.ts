import { GradePreset } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetupGradesDto {
  @IsEnum(GradePreset)
  preset!: GradePreset;
}
