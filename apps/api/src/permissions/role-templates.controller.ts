import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { PermissionCatalog } from '../common/permissions/permission-catalog';
import { PermissionsService } from './permissions.service';

@Controller('schools')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
export class RoleTemplatesController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions/catalog')
  @Roles('admin', 'staff', 'teacher')
  catalog() {
    return this.permissionsService.listCatalog();
  }

  @Get('role-templates')
  @Roles('admin', 'staff')
  @RequirePermissions(PermissionCatalog.TEACHERS_READ)
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.permissionsService.listTemplates(user.schoolId);
  }

  @Patch('staff/:userId/role-template')
  @Roles('admin')
  @RequirePermissions(PermissionCatalog.TEACHERS_MANAGE)
  assignTemplate(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: { roleTemplateId: string },
  ) {
    return this.permissionsService.assignTemplate(
      userId,
      user.schoolId,
      body.roleTemplateId,
    );
  }

  @Get('staff/:userId/permissions')
  @Roles('admin')
  @RequirePermissions(PermissionCatalog.TEACHERS_MANAGE)
  getStaffPermissions(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.permissionsService.getStaffPermissions(
      userId,
      user.schoolId,
      user.id,
    );
  }

  @Patch('staff/:userId/permissions')
  @Roles('admin')
  @RequirePermissions(PermissionCatalog.TEACHERS_MANAGE)
  setGrants(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body()
    body: { grants: { permissionKey: string; granted: boolean }[] },
  ) {
    return this.permissionsService.setPermissionGrants(
      userId,
      user.schoolId,
      user.id,
      body.grants,
    );
  }
}
