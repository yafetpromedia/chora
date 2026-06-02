import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class UpdateTemplateComponentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weightPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAssessmentTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateComponentDto)
  components?: UpdateTemplateComponentDto[];
}
