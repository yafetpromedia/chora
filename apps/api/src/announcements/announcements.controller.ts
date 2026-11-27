import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthUser) {
    return this.announcementsService.create(dto, user.schoolId, user.id);
  }

  @Get()
  @Roles('admin', 'teacher', 'student', 'parent', 'staff')
  list(@CurrentUser() user: AuthUser) {
    return this.announcementsService.list(user.schoolId, user.id);
  }

  @Get('unread-count')
  @Roles('admin', 'teacher', 'student', 'parent', 'staff')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.announcementsService.unreadCount(user.schoolId, user.id);
  }

  @Post('read-all')
  @Roles('admin', 'teacher', 'student', 'parent', 'staff')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.announcementsService.markAllRead(user.schoolId, user.id);
  }

  @Post(':id/read')
  @Roles('admin', 'teacher', 'student', 'parent', 'staff')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.markRead(id, user.id);
  }

  /** Remove from this user's inbox (marks read; deletes personal alerts). */
  @Delete(':id')
  @Roles('admin', 'teacher', 'student', 'parent', 'staff')
  dismiss(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.dismissForUser(
      id,
      user.schoolId,
      user.id,
    );
  }
}
