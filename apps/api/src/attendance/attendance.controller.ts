import {
  Body,
  Controller,
  Get,
  Header,
  Param,
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
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import { AttendanceModeDto } from '../schools/dto/attendance-mode.dto';
import { SchoolsService } from '../schools/schools.service';
import {
  AttendanceConcernStatus,
  AttendanceConcernType,
} from '@prisma/client';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { CreateAttendanceConcernDto } from './dto/create-attendance-concern.dto';
import { CreateAttendancePermissionDto } from './dto/create-attendance-permission.dto';
import { ResolveAttendanceConcernDto } from './dto/resolve-attendance-concern.dto';
import { ReviewAttendancePermissionDto } from './dto/review-attendance-permission.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { AttendanceConcernsService } from './attendance-concerns.service';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly concernsService: AttendanceConcernsService,
    private readonly schoolsService: SchoolsService,
  ) {}

  @Get('my-classes/today')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REPORT)
  myClassesToday(@CurrentUser() user: AuthUser) {
    return this.concernsService.myClassesToday(
      user.schoolId,
      user.id,
      user.role,
    );
  }

  @Get('classes/:timetableEntryId/context')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REPORT)
  classContext(
    @CurrentUser() user: AuthUser,
    @Param('timetableEntryId') timetableEntryId: string,
    @Query('date') date?: string,
  ) {
    return this.concernsService.getClassContext(
      user.schoolId,
      user.id,
      user.role,
      timetableEntryId,
      date,
    );
  }

  @Get('concerns/summary')
  @Roles('teacher', 'admin', 'staff')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REVIEW)
  concernsSummary(@CurrentUser() user: AuthUser) {
    return this.concernsService.summaryForHomeroom(
      user.schoolId,
      user.id,
      user.role,
    );
  }

  @Get('concerns')
  @Roles('teacher', 'admin', 'staff')
  listConcerns(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
    @Query('gradeId') gradeId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('status') status?: AttendanceConcernStatus,
    @Query('concernType') concernType?: AttendanceConcernType,
    @Query('reportedByUserId') reportedByUserId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('mine') mine?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.concernsService.listConcerns(
      user.schoolId,
      user.id,
      user.role,
      {
        date,
        gradeId,
        sectionId,
        status,
        concernType,
        reportedByUserId,
        subjectId,
        mine,
        page,
        pageSize,
      },
    );
  }

  @Post('concerns')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REPORT)
  createConcern(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAttendanceConcernDto,
  ) {
    return this.concernsService.createConcern(
      user.schoolId,
      user.id,
      user.role,
      dto,
    );
  }

  @Get('concerns/:id')
  @Roles('teacher', 'admin', 'staff')
  getConcern(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.concernsService.getConcern(
      user.schoolId,
      user.id,
      user.role,
      id,
    );
  }

  @Post('concerns/:id/review')
  @Roles('teacher', 'admin', 'staff')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REVIEW)
  reviewConcern(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.concernsService.markUnderReview(
      user.schoolId,
      user.id,
      user.role,
      id,
    );
  }

  @Post('concerns/:id/resolve')
  @Roles('teacher', 'admin', 'staff')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REVIEW)
  resolveConcern(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveAttendanceConcernDto,
  ) {
    return this.concernsService.resolve(
      user.schoolId,
      user.id,
      user.role,
      id,
      dto,
    );
  }

  @Post('concerns/:id/dismiss')
  @Roles('teacher', 'admin', 'staff')
  @RequirePermissions(SchoolPermission.ATTENDANCE_CONCERNS_REVIEW)
  dismissConcern(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveAttendanceConcernDto,
  ) {
    return this.concernsService.dismiss(
      user.schoolId,
      user.id,
      user.role,
      id,
      dto,
    );
  }

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

  @Post('permission-requests')
  @Roles('student', 'parent')
  createPermissionRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAttendancePermissionDto,
  ) {
    return this.attendanceService.createPermissionRequest(
      user.schoolId,
      user.id,
      user.role,
      dto,
    );
  }

  @Get('permission-requests/mine')
  @Roles('student', 'parent')
  myPermissionRequests(
    @CurrentUser() user: AuthUser,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    return this.attendanceService.listMyPermissionRequests(
      user.schoolId,
      user.id,
      user.role,
      studentProfileId,
    );
  }

  @Get('permission-requests')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_MANAGE)
  listPermissionRequests(
    @CurrentUser() user: AuthUser,
    @Query('gradeId') gradeId: string,
    @Query('sectionId') sectionId: string | undefined,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    @Query('date') date?: string,
  ) {
    return this.attendanceService.listPermissionRequestsForTeacher(
      user.schoolId,
      user.id,
      user.role,
      gradeId,
      sectionId,
      status,
      date,
    );
  }

  @Patch('permission-requests/:id/review')
  @Roles('teacher', 'admin')
  @RequirePermissions(SchoolPermission.ATTENDANCE_MANAGE)
  reviewPermissionRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewAttendancePermissionDto,
  ) {
    return this.attendanceService.reviewPermissionRequest(
      user.schoolId,
      user.id,
      user.role,
      id,
      dto,
    );
  }

  @Get('export')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.ATTENDANCE_ANALYTICS)
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
