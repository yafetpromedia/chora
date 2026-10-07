import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  AI_PROVIDERS,
  type AiProviderId,
} from '../../platform/dto/update-platform-settings.dto';

export class TestPlatformAiDto {
  /** Unsaved key from the settings form (preferred for Test connection). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  aiApiKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(AI_PROVIDERS)
  aiProvider?: AiProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  aiBaseUrl?: string;
}
