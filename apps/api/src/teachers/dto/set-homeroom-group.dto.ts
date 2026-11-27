import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetHomeroomGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string | null;
}
