import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { AttendanceModeDto } from '../schools/dto/attendance-mode.dto';
import { SchoolsService } from '../schools/schools.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly schoolsService: SchoolsService,
  ) {}

  @Get('settings')
  @Roles('admin', 'teacher')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.attendanceService.getSettings(user.schoolId);
  }

  @Patch('settings')
  @Roles('admin')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: AttendanceModeDto,
  ) {
    return this.schoolsService.updateAttendanceMode(user.schoolId, dto.mode);
  }

  @Get('roster')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_MANAGE)
  getRoster(
    @CurrentUser() user: AuthUser,
    @Query('gradeId') gradeId: string,
    @Query('sectionId') sectionId: string | undefined,
    @Query('date') date: string,
    @Query('periodNumber') periodNumber?: string,
  ) {
    return this.attendanceService.getRoster(
      user.schoolId,
      user.id,
      user.role,
      gradeId,
      sectionId,
      date,
      periodNumber ? Number(periodNumber) : 0,
    );
  }

  @Post('bulk')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_MANAGE)
  bulkMark(@CurrentUser() user: AuthUser, @Body() dto: BulkAttendanceDto) {
    return this.attendanceService.bulkMark(dto, user.schoolId, user.id, user.role);
  }

  @Post('scan')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_MANAGE)
  scanMark(@CurrentUser() user: AuthUser, @Body() dto: ScanAttendanceDto) {
    return this.attendanceService.scanMark(dto, user.schoolId, user.id, user.role);
  }

  @Get('student/summary')
  @Roles('student', 'parent', 'teacher', 'admin')
  async studentSummary(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const profileId = await this.attendanceService.resolveStudentProfileId(
      user.schoolId,
      user.id,
      user.role,
      studentProfileId,
    );
    return this.attendanceService.getStudentSummary(
      profileId,
      user.schoolId,
      from,
      to,
    );
  }

  @Get('student')
  @Roles('student', 'parent', 'teacher', 'admin')
  async getStudentAttendance(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId: string | undefined,
    @Query('studentId') legacyStudentId: string | undefined,
  ) {
    const requested =
      studentProfileId ??
      (legacyStudentId
        ? await this.attendanceService.resolveStudentProfileId(
            user.schoolId,
            legacyStudentId,
            'student',
          )
        : undefined);

    const profileId = await this.attendanceService.resolveStudentProfileId(
      user.schoolId,
      user.id,
      user.role,
      requested,
    );
    return this.attendanceService.listByStudentProfile(profileId, user.schoolId);
  }

  @Get('analytics')
  @Roles('admin', 'teacher')
  @RequirePermissions(SchoolPermission.ATTENDANCE_ANALYTICS)
  analytics(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.attendanceService.getAnalytics(user.schoolId, date);
  }

  @Get('export')
  @Roles('admin')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.attendanceService.exportSchoolCsv(
      user.schoolId,
      from,
      to,
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-${from}-${to}.csv"`,
    );
    res.send(csv);
  }
}
