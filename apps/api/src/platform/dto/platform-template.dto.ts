import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformMessageTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Key must be lowercase letters, numbers, and underscores',
  })
  key!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  channel!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdatePlatformMessageTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  channel?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  body?: string;
}

export class AddPackageTemplateDto {
  @IsString()
  platformMessageTemplateId!: string;
}

export class UpdatePackageTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  channel?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  body?: string;
}
