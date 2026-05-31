import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GradePromotionMappingDto {
  @IsString()
  fromGradeId!: string;

  @IsOptional()
  @IsString()
  toGradeId?: string | null;
}

export class ExecutePromotionDto {
  @IsString()
  fromYearId!: string;

  @IsString()
  toYearId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradePromotionMappingDto)
  mappings!: GradePromotionMappingDto[];

  @IsOptional()
  @IsBoolean()
  setToYearCurrent?: boolean;
}
