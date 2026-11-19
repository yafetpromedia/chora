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
import {
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  UpsertLeaveBalanceDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('attendance')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get('types')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.LEAVE_READ)
  listTypes(@CurrentUser() user: AuthUser) {
    return this.leave.listTypes(user.schoolId);
  }

  @Get('requests')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.LEAVE_READ)
  listRequests(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mine') mine?: string,
  ) {
    const canManageOthers =
      user.role === 'admin' ||
      user.permissions.includes('leave.approve') ||
      user.permissions.includes('leave.manage');
    return this.leave.listRequests(user.schoolId, {
      status,
      userId: canManageOthers ? userId : user.id,
      leaveTypeId,
      from,
      to,
      mineOnly: mine === '1' || mine === 'true' || !canManageOthers,
      actorId: user.id,
    });
  }

  @Post('requests')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.LEAVE_REQUEST)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveRequestDto) {
    return this.leave.createRequest(
      user.schoolId,
      user.id,
      user.role,
      dto,
      user.permissions,
    );
  }

  @Patch('requests/:id/review')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.LEAVE_APPROVE)
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.leave.review(user.schoolId, user.id, id, dto);
  }

  @Post('requests/:id/cancel')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.LEAVE_READ)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // Service enforces: owner may cancel pending; leave.manage/approve for others/approved.
    return this.leave.cancel(
      user.schoolId,
      user.id,
      user.role,
      id,
      user.permissions,
    );
  }

  @Get('balances')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.LEAVE_READ)
  balances(
    @CurrentUser() user: AuthUser,
    @Query('userId') userId?: string,
    @Query('year') year?: string,
  ) {
    const canManage =
      user.role === 'admin' ||
      user.permissions.includes('leave.manage') ||
      user.permissions.includes('leave.approve');
    return this.leave.listBalances(
      user.schoolId,
      canManage ? userId : user.id,
      year ? Number(year) : undefined,
    );
  }

  @Post('balances')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.LEAVE_MANAGE)
  upsertBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertLeaveBalanceDto,
  ) {
    return this.leave.upsertBalance(user.schoolId, dto);
  }
}
