import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum AiChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export class AiChatImageDto {
  @IsString()
  @IsIn(IMAGE_MIME)
  mimeType!: (typeof IMAGE_MIME)[number];

  /** Raw base64 (no data: prefix). */
  @IsString()
  @MinLength(32)
  @MaxLength(5_500_000)
  data!: string;
}

export class AiChatMessageDto {
  @IsEnum(AiChatRole)
  role!: AiChatRole;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatImageDto)
  @ArrayMaxSize(3)
  images?: AiChatImageDto[];
}

export class AiChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  @ArrayMaxSize(40)
  messages!: AiChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageContext?: string;
}
