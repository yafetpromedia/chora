import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { StudentsService } from './students.service';

/** Separate controller so `/cards` is not captured by `GET /students/:id`. */
@Controller('schools/student-cards')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.STUDENTS_CARDS)
export class StudentCardsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('count')
  count(
    @CurrentUser() user: AuthUser,
    @Query('gradeId') gradeId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.studentsService
      .countIdCards(user.schoolId, gradeId, sectionId)
      .then((count) => ({ count }));
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('gradeId') gradeId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipN = skip !== undefined && skip !== '' ? Number(skip) : undefined;
    const takeN = take !== undefined && take !== '' ? Number(take) : undefined;
    return this.studentsService.listIdCards(
      user.schoolId,
      gradeId,
      sectionId,
      Number.isFinite(skipN) ? skipN : undefined,
      Number.isFinite(takeN) ? takeN : undefined,
    );
  }

  @Post('backfill')
  backfill(@CurrentUser() user: AuthUser) {
    return this.studentsService.ensureCardCodes(user.schoolId);
  }
}
