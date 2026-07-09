import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherScopeService } from './teacher-scope.service';
import { TeachersService } from './teachers.service';

@Controller('schools/teachers')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly teacherScopeService: TeacherScopeService,
    private readonly teacherDashboardService: TeacherDashboardService,
  ) {}

  @Get()
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.TEACHERS_READ)
  list(
    @CurrentUser() user: AuthUser,
    @Query('group') group?: 'teachers' | 'staff',
  ) {
    return this.teachersService.list(user.schoolId, group);
  }

  @Get('me')
  @Roles('admin', 'teacher')
  getMe(@CurrentUser() user: AuthUser) {
    return this.teachersService.getMe(user.schoolId, user.id);
  }

  @Get('me/dashboard')
  @Roles('teacher')
  myDashboard(@CurrentUser() user: AuthUser) {
    return this.teacherDashboardService.getOverview(user.schoolId, user.id);
  }

  @Get('me/classes')
  @Roles('admin', 'teacher', 'staff')
  async myClasses(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: string,
  ) {
    if (user.role === 'teacher') {
      const grades =
        scope === 'homeroom'
          ? await this.teacherScopeService.listHomeroomGradesForTeacher(
              user.schoolId,
              user.id,
            )
          : await this.teacherScopeService.listGradesForTeacher(
              user.schoolId,
              user.id,
            );
      return grades.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sortOrder,
        sections: g.sections.map((s) => ({ id: s.id, name: s.name })),
        _count: { students: 0 },
      }));
    }
    return this.teachersService.listGradesForSchool(user.schoolId);
  }

  @Post()
  @Roles('admin')
  @RequirePermissions(SchoolPermission.TEACHERS_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeacherDto) {
    return this.teachersService.create(user.schoolId, dto);
  }

  @Patch(':userId')
  @Roles('admin')
  @RequirePermissions(SchoolPermission.TEACHERS_MANAGE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(user.schoolId, userId, dto);
  }

  @Delete(':userId')
  @Roles('admin')
  @RequirePermissions(SchoolPermission.TEACHERS_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.teachersService.remove(user.schoolId, userId);
  }
}
