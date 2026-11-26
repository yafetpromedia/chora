import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('parent', 'admin', 'teacher', 'staff')
  list(@CurrentUser() user: AuthUser) {
    if (user.role === 'parent') {
      return this.notificationsService.listForParent(user.id, user.schoolId);
    }
    return this.notificationsService.listForStaff(user.id, user.schoolId);
  }

  @Get('unread-count')
  @Roles('parent', 'admin', 'teacher', 'staff')
  async unreadCount(@CurrentUser() user: AuthUser) {
    if (user.role === 'parent') {
      const count = await this.notificationsService.unreadCount(
        user.id,
        user.schoolId,
      );
      return { count };
    }
    const count = await this.notificationsService.unreadCountForStaff(
      user.id,
      user.schoolId,
    );
    return { count };
  }

  @Post('read-all')
  @Roles('admin', 'teacher', 'staff')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllStaffRead(user.id, user.schoolId);
  }

  @Patch(':id/read')
  @Roles('parent', 'admin', 'teacher', 'staff')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role === 'parent') {
      return this.notificationsService.markRead(id, user.id);
    }
    return this.notificationsService.markStaffRead(id, user.id);
  }

  @Delete(':id')
  @Roles('parent', 'admin', 'teacher', 'staff')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role === 'parent') {
      return this.notificationsService.deleteParentNotification(id, user.id);
    }
    return this.notificationsService.deleteStaffNotification(id, user.id);
  }
}
