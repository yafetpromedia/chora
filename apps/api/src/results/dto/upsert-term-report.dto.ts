import { IsOptional, IsString } from 'class-validator';

export class UpsertTermReportDto {
  @IsOptional()
  @IsString()
  teacherComment?: string;

  @IsOptional()
  @IsString()
  principalComment?: string;
}
