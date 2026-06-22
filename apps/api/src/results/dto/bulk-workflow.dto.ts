import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkWorkflowDto {
  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sheetIds?: string[];
}
