import { IsOptional, IsString } from 'class-validator';

export class WorkflowNotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
