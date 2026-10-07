import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AnnouncementDraftDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;
}
