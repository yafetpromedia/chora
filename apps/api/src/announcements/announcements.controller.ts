import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthUser) {
    return this.announcementsService.create(dto, user.schoolId, user.id);
  }

  @Get()
  @Roles('admin', 'teacher', 'student', 'parent')
  list(@CurrentUser() user: AuthUser) {
    return this.announcementsService.list(user.schoolId);
  }

  @Post(':id/read')
  @Roles('admin', 'teacher', 'student', 'parent')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.markRead(id, user.id);
  }
}
