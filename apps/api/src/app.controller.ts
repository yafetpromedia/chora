import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { Roles } from './common/decorators/roles.decorator';
import type { AuthUser } from './common/auth.types';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('admin')
  getAdminOverview(@CurrentUser() user: AuthUser) {
    return this.appService.getAdminOverview(user.schoolId);
  }
}
