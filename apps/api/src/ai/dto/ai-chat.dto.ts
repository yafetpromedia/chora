import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
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

export class AiChatMessageDto {
  @IsEnum(AiChatRole)
  role!: AiChatRole;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class AiChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  @ArrayMaxSize(20)
  messages!: AiChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageContext?: string;
}
