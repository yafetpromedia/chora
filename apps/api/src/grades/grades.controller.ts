import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateGradeDto, SetupGradesDto } from './dto/setup-grades.dto';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import { GradesService } from './grades.service';

@Controller('schools')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
    private readonly teacherScope: TeacherScopeService,
  ) {}

  @Get('grade-presets')
  @Roles('admin')
  listPresets() {
    return this.gradesService.listPresets();
  }

  @Get('setup-status')
  @Roles('admin')
  setupStatus(@CurrentUser() user: AuthUser) {
    return this.gradesService.getSetupStatus(user.schoolId);
  }

  @Get('grades')
  @Roles('admin', 'teacher')
  listGrades(@CurrentUser() user: AuthUser) {
    if (user.role === 'teacher') {
      return this.teacherScope.listGradesForTeacher(user.schoolId, user.id);
    }
    return this.gradesService.listGrades(user.schoolId);
  }

  @Post('grades/setup')
  @Roles('admin')
  setupGrades(@CurrentUser() user: AuthUser, @Body() dto: SetupGradesDto) {
    return this.gradesService.setupGrades(user.schoolId, dto);
  }

  @Post('grades/reset')
  @Roles('admin')
  resetGrades(@CurrentUser() user: AuthUser, @Body() dto: SetupGradesDto) {
    return this.gradesService.resetGrades(user.schoolId, dto);
  }

  @Post('grades')
  @Roles('admin')
  addGrade(@CurrentUser() user: AuthUser, @Body() dto: CreateGradeDto) {
    return this.gradesService.addGrade(
      user.schoolId,
      dto.name,
      dto.sections ?? [],
    );
  }

  @Post('grades/:gradeId/sections')
  addSection(
    @CurrentUser() user: AuthUser,
    @Param('gradeId') gradeId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.gradesService.addSection(user.schoolId, gradeId, dto.name);
  }

  @Delete('grades/:gradeId/sections/:sectionId')
  @Roles('admin')
  removeSection(
    @CurrentUser() user: AuthUser,
    @Param('gradeId') gradeId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.gradesService.removeSection(user.schoolId, gradeId, sectionId);
  }

  @Post('grades/fix-early-childhood')
  @Roles('admin')
  fixEarlyChildhood(@CurrentUser() user: AuthUser) {
    return this.gradesService.fixEarlyChildhoodGrades(user.schoolId);
  }

  @Post('setup/complete')
  @Roles('admin')
  completeSetup(@CurrentUser() user: AuthUser) {
    return this.gradesService.markSetupComplete(user.schoolId);
  }
}
