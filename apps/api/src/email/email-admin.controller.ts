import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { PlatformAuthUser } from '../common/auth.types';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import { RequirePlatformOwner } from '../common/decorators/require-platform-permissions.decorator';
import { PlatformGuard } from '../common/guards/platform.guard';
import { PlatformPermissionsGuard } from '../common/guards/platform-permissions.guard';
import { SendTestEmailDto } from './dto/email.dto';
import { assertPlatformOwner } from './email.policy';
import { EmailService } from './email.service';

@Controller('platform/email')
@UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)
@RequirePlatformOwner()
export class EmailAdminController {
  constructor(private readonly email: EmailService) {}

  @Get('overview')
  overview(@CurrentPlatformUser() user: PlatformAuthUser) {
    assertPlatformOwner(user.role);
    return this.email.overview();
  }

  @Get('logs')
  logs(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Query('status') status?: string,
    @Query('schoolId') schoolId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    assertPlatformOwner(user.role);
    return this.email.listLogs({
      status,
      schoolId,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('templates')
  templates(@CurrentPlatformUser() user: PlatformAuthUser) {
    assertPlatformOwner(user.role);
    return this.email.listTemplates();
  }

  @Get('templates/:id/preview')
  preview(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param('id') id: string,
  ) {
    assertPlatformOwner(user.role);
    const preview = this.email.previewTemplate(id);
    if (!preview) throw new NotFoundException('Email template not found');
    return preview;
  }

  @Get('provider')
  provider(@CurrentPlatformUser() user: PlatformAuthUser) {
    assertPlatformOwner(user.role);
    return this.email.providerStatus();
  }

  @Post('test')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  test(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: SendTestEmailDto,
  ) {
    assertPlatformOwner(user.role);
    return this.email.sendTest({
      to: dto.to,
      mailboxId: dto.mailboxId,
      actorEmail: user.email,
    });
  }
}
