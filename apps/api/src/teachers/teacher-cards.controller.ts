import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { TeachersService } from './teachers.service';

@Controller('schools/teacher-cards')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
export class TeacherCardsController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TEACHERS_READ)
  list(@CurrentUser() user: AuthUser) {
    return this.teachersService.listTeacherIdCards(user.schoolId);
  }

  @Get('me')
  @Roles('teacher')
  myCard(@CurrentUser() user: AuthUser) {
    return this.teachersService.getTeacherIdCard(user.schoolId, user.id);
  }

  @Get(':userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TEACHERS_READ)
  one(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.teachersService.getTeacherIdCard(user.schoolId, userId);
  }

  @Post('backfill')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TEACHERS_MANAGE)
  backfill(@CurrentUser() user: AuthUser) {
    return this.teachersService.ensureTeacherIdsAndCards(user.schoolId);
  }
}
