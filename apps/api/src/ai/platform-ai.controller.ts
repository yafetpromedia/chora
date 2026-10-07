import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { PlatformAuthUser } from '../common/auth.types';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import { RequirePlatformOwner } from '../common/decorators/require-platform-permissions.decorator';
import { PlatformGuard } from '../common/guards/platform.guard';
import { PlatformPermissionsGuard } from '../common/guards/platform-permissions.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { TestPlatformAiDto } from './dto/test-platform-ai.dto';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
export class PlatformAiController {
  constructor(private readonly ai: AiService) {}

  @Post('settings/ai/test')
  @RequirePlatformOwner()
  testConnection(@Body() dto: TestPlatformAiDto) {
    return this.ai.testConnection(dto);
  }

  @Get('ai/status')
  status() {
    return this.ai.getStatus();
  }

  @Post('ai/chat')
  chat(
    @Body() dto: AiChatDto,
    @CurrentPlatformUser() user: PlatformAuthUser,
  ) {
    return this.ai.platformChat(dto.messages, dto.pageContext, user);
  }
}
