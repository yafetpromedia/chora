import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import {
  CreateExamScheduleDto,
  CreateExamSeatingPlanDto,
  ReplaceExamScheduleDaysDto,
  UpdateExamScheduleDto,
  UpdateExamSeatingPlanDto,
} from './dto/exam-schedule.dto';
import { ExamSchedulesService } from './exam-schedules.service';

@Controller('schools/exam-schedules')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
export class ExamSchedulesController {
  constructor(private readonly examSchedulesService: ExamSchedulesService) {}

  @Get()
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  list(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.examSchedulesService.list(user.schoolId, academicYearId);
  }

  /** Published schedules for student / parent / teacher portals (no timetable permission). */
  @Get('published')
  @Roles('student', 'parent', 'teacher', 'admin', 'staff')
  listPublished(@CurrentUser() user: AuthUser) {
    return this.examSchedulesService.listPublished(user.schoolId);
  }

  @Get('published/:id')
  @Roles('student', 'parent', 'teacher', 'admin', 'staff')
  getPublished(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    return this.examSchedulesService.getPublished(user.schoolId, id, {
      userId: user.id,
      role: user.role,
      studentProfileId,
    });
  }

  @Get(':id/seating')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  listSeating(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examSchedulesService.listSeatingPlans(user.schoolId, id);
  }

  @Post(':id/seating')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  createSeating(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateExamSeatingPlanDto,
  ) {
    return this.examSchedulesService.createSeatingPlan(user.schoolId, id, dto);
  }

  @Get(':id/seating/:planId')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  getSeating(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('planId') planId: string,
  ) {
    return this.examSchedulesService.getSeatingPlan(user.schoolId, id, planId);
  }

  @Put(':id/seating/:planId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  updateSeating(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateExamSeatingPlanDto,
  ) {
    return this.examSchedulesService.updateSeatingPlan(
      user.schoolId,
      id,
      planId,
      dto,
    );
  }

  @Delete(':id/seating/:planId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  removeSeating(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('planId') planId: string,
  ) {
    return this.examSchedulesService.removeSeatingPlan(
      user.schoolId,
      id,
      planId,
    );
  }

  @Get(':id')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examSchedulesService.get(user.schoolId, id);
  }

  @Post()
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExamScheduleDto) {
    return this.examSchedulesService.create(user.schoolId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExamScheduleDto,
  ) {
    return this.examSchedulesService.update(user.schoolId, id, dto);
  }

  @Put(':id/days')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  replaceDays(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplaceExamScheduleDaysDto,
  ) {
    return this.examSchedulesService.replaceDays(user.schoolId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examSchedulesService.remove(user.schoolId, id);
  }
}
