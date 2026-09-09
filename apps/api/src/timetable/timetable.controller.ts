import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Weekday } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import { CreateTimetableRoomDto } from './dto/create-timetable-room.dto';
import { SaveTimetableEntriesDto } from './dto/save-timetable-entries.dto';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import { UpsertTimetablePeriodsDto } from './dto/upsert-timetable-periods.dto';
import { TimetableService } from './timetable.service';

@Controller('schools/timetable')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('ensure')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  ensure(
    @CurrentUser() user: AuthUser,
    @Body('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.ensureTimetable(user.schoolId, academicYearId);
  }

  @Get('periods')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  periods(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.listPeriods(user.schoolId, academicYearId);
  }

  @Patch('periods')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  upsertPeriods(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertTimetablePeriodsDto,
  ) {
    return this.timetableService.upsertPeriods(user.schoolId, dto);
  }

  @Get('rooms')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  rooms(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.listRooms(user.schoolId, academicYearId);
  }

  @Post('rooms')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  createRoom(@CurrentUser() user: AuthUser, @Body() dto: CreateTimetableRoomDto) {
    return this.timetableService.createRoom(user.schoolId, dto);
  }

  @Get('overview')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  overview(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.getSchoolOverview(
      user.schoolId,
      academicYearId,
    );
  }

  @Get('stack')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  stack(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId: string,
    @Query('gradeId') gradeId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.timetableService.getSchoolStack(
      user.schoolId,
      academicYearId,
      gradeId,
      sectionId,
    );
  }

  @Get('grid')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_READ)
  grid(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId: string,
    @Query('gradeId') gradeId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.timetableService.getClassGrid(
      user.schoolId,
      academicYearId,
      gradeId,
      sectionId,
    );
  }

  @Patch('entries')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  saveEntries(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveTimetableEntriesDto,
  ) {
    return this.timetableService.saveClassEntries(user.schoolId, dto);
  }

  @Post('generate')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TIMETABLE_MANAGE)
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateTimetableDto) {
    return this.timetableService.autoGenerate(user.schoolId, dto);
  }

  @Get('me/today')
  @Roles('teacher', 'student', 'parent')
  myToday(
    @CurrentUser() user: AuthUser,
    @Query('weekday') weekday?: Weekday,
  ) {
    return this.timetableService.getScheduleForUser(
      user.schoolId,
      user.id,
      user.role,
      weekday,
    );
  }

  @Get('me/week')
  @Roles('teacher', 'student', 'parent')
  myWeek(@CurrentUser() user: AuthUser) {
    return this.timetableService.getWeekForUser(
      user.schoolId,
      user.id,
      user.role,
    );
  }
}
