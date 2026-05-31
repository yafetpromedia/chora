import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly adminAnalytics: AdminAnalyticsService,
  ) {}

  @Get('me')
  getMyDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardsService.getDashboard(
      user.role,
      user.schoolId,
      user.id,
    );
  }

  @Get('admin-analytics')
  @Roles('admin', 'staff')
  getAdminAnalytics(@CurrentUser() user: AuthUser) {
    return this.adminAnalytics.getOverview(user.schoolId);
  }
}
