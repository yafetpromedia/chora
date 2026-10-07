import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { UpsertEmployeeProfileDto, UpsertHrOrgDto } from './hr.dto';
import { HrService } from './hr.service';

@Controller('hr')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('payroll')
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Post('org/seed')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_ORG_MANAGE)
  seed(@CurrentUser() user: AuthUser) {
    return this.hr.ensureOrgDefaults(user.schoolId);
  }

  @Get('departments')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.HR_EMPLOYEES_READ)
  departments(@CurrentUser() user: AuthUser) {
    return this.hr.listDepartments(user.schoolId);
  }

  @Post('departments')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_ORG_MANAGE)
  createDept(@CurrentUser() user: AuthUser, @Body() dto: UpsertHrOrgDto) {
    return this.hr.createDepartment(user.schoolId, dto);
  }

  @Patch('departments/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_ORG_MANAGE)
  updateDept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertHrOrgDto,
  ) {
    return this.hr.updateDepartment(user.schoolId, id, dto);
  }

  @Get('positions')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.HR_EMPLOYEES_READ)
  positions(@CurrentUser() user: AuthUser) {
    return this.hr.listPositions(user.schoolId);
  }

  @Post('positions')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_ORG_MANAGE)
  createPos(@CurrentUser() user: AuthUser, @Body() dto: UpsertHrOrgDto) {
    return this.hr.createPosition(user.schoolId, dto);
  }

  @Patch('positions/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_ORG_MANAGE)
  updatePos(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertHrOrgDto,
  ) {
    return this.hr.updatePosition(user.schoolId, id, dto);
  }

  @Get('employees')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_EMPLOYEES_READ)
  employees(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
    @Query('status') status?: string,
  ) {
    const revealBank = user.permissions.includes('hr.employees.manage');
    return this.hr.listEmployees(user.schoolId, {
      search,
      departmentId,
      positionId,
      status,
      revealBank,
    });
  }

  @Get('employees/:userId')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.HR_EMPLOYEES_READ)
  employee(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    if (
      user.role === 'teacher' &&
      userId !== user.id &&
      !user.permissions.includes('hr.employees.read')
    ) {
      // teachers without HR read only see self via other routes
    }
    const revealBank =
      user.permissions.includes('hr.employees.manage') ||
      user.permissions.includes('payroll.pay');
    return this.hr.getEmployee(user.schoolId, userId, revealBank);
  }

  @Patch('employees/:userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.HR_EMPLOYEES_MANAGE)
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpsertEmployeeProfileDto,
  ) {
    return this.hr.upsertProfile(user.schoolId, user.id, userId, dto);
  }
}
