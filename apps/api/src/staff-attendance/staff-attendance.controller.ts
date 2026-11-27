import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
  BulkMarkUnmarkedDto,
  CorrectStaffAttendanceDto,
  ManualStaffAttendanceDto,
  StaffAttendanceSettingsDto,
  StaffCheckInDto,
  StaffCheckOutDto,
  StaffScanDto,
} from './dto/staff-attendance.dto';
import { StaffAttendanceService } from './staff-attendance.service';

@Controller('staff-attendance')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('attendance')
export class StaffAttendanceController {
  constructor(private readonly staffAttendance: StaffAttendanceService) {}

  @Get('settings')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_READ)
  getSettings(@CurrentUser() user: AuthUser) {
    return this.staffAttendance.getSettings(user.schoolId);
  }

  @Patch('settings')
  @Roles('admin')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: StaffAttendanceSettingsDto,
  ) {
    return this.staffAttendance.updateSettings(user.schoolId, dto);
  }

  @Get('me/summary')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_SELF)
  meSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffAttendance.getMeSummary(user.schoolId, user.id, from, to);
  }

  @Get('me/history')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_SELF)
  meHistory(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffAttendance.getHistory(user.schoolId, user.id, from, to);
  }

  @Get('me/qr')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_SELF)
  meQr(@CurrentUser() user: AuthUser) {
    return this.staffAttendance.getQr(user.schoolId, user.id);
  }

  @Post('me/qr')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_SELF)
  issueMyQr(@CurrentUser() user: AuthUser) {
    return this.staffAttendance.issueQr(user.schoolId, user.id);
  }

  @Get('day')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_READ)
  listDay(
    @CurrentUser() user: AuthUser,
    @Query('date') date: string,
    @Query('group') group?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('roleTemplateSlug') roleTemplateSlug?: string,
    @Query('search') search?: string,
  ) {
    return this.staffAttendance.listDay(user.schoolId, {
      date: date || new Date().toISOString().slice(0, 10),
      group,
      department,
      status,
      roleTemplateSlug,
      search,
    });
  }

  @Get('summary')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_ANALYTICS)
  summary(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.staffAttendance.summary(user.schoolId, date);
  }

  @Get('analytics')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_ANALYTICS)
  analytics(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('department') department?: string,
    @Query('userId') userId?: string,
  ) {
    return this.staffAttendance.analytics(user.schoolId, from, to, {
      department,
      userId,
    });
  }

  @Get('hours-summary')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_ANALYTICS)
  hoursSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('department') department?: string,
    @Query('userId') userId?: string,
  ) {
    return this.staffAttendance.hoursSummary(user.schoolId, from, to, {
      department,
      userId,
    });
  }

  @Get('history/:userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_READ)
  history(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffAttendance.getHistory(user.schoolId, userId, from, to);
  }

  @Get('records/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_READ)
  getRecord(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.staffAttendance.getRecord(user.schoolId, id);
  }

  @Post('scan')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  scan(@CurrentUser() user: AuthUser, @Body() dto: StaffScanDto) {
    return this.staffAttendance.scan(user.schoolId, user.id, dto);
  }

  @Post('check-in')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: StaffCheckInDto) {
    return this.staffAttendance.checkIn(user.schoolId, user.id, dto);
  }

  @Post('check-out')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  checkOut(@CurrentUser() user: AuthUser, @Body() dto: StaffCheckOutDto) {
    return this.staffAttendance.checkOut(user.schoolId, user.id, dto);
  }

  @Put('manual')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  manual(@CurrentUser() user: AuthUser, @Body() dto: ManualStaffAttendanceDto) {
    return this.staffAttendance.upsertManual(user.schoolId, user.id, dto);
  }

  @Post('bulk-mark-unmarked')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  bulkMarkUnmarked(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkMarkUnmarkedDto,
  ) {
    return this.staffAttendance.bulkMarkUnmarked(user.schoolId, user.id, dto);
  }

  @Patch('records/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_MANAGE)
  correct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CorrectStaffAttendanceDto,
  ) {
    return this.staffAttendance.correct(user.schoolId, user.id, id, dto);
  }

  @Post('qr/:userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_QR_MANAGE)
  issueQr(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.staffAttendance.issueQr(user.schoolId, userId);
  }

  @Post('qr/:userId/rotate')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_QR_MANAGE)
  rotateQr(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.staffAttendance.rotateQr(user.schoolId, userId);
  }

  @Patch('qr/:userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_QR_MANAGE)
  setQrActive(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: { active: boolean },
  ) {
    return this.staffAttendance.setQrActive(
      user.schoolId,
      userId,
      !!body.active,
    );
  }

  @Get('qr/:userId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_QR_MANAGE)
  getQr(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.staffAttendance.getQr(user.schoolId, userId);
  }

  @Get('export')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_ANALYTICS)
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('group') group: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.staffAttendance.exportCsv(
      user.schoolId,
      from,
      to,
      group,
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="staff-attendance-${from}-${to}.csv"`,
    );
    res.send(csv);
  }

  @Get('export-payroll')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.STAFF_ATTENDANCE_ANALYTICS)
  @Header('Content-Type', 'text/csv')
  async exportPayroll(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('department') department: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.staffAttendance.exportPayrollCsv(
      user.schoolId,
      from,
      to,
      department,
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="staff-payroll-hours-${from}-${to}.csv"`,
    );
    res.send(csv);
  }
}
