import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportService } from './support.service';

@Controller('schools/support-tickets')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.SCHOOL_SETTINGS)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.supportService.listForSchool(user.schoolId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.supportService.getForSchool(user.schoolId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.create(user.schoolId, user.id, dto);
  }
}
