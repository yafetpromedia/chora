import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { StudentsService } from './students.service';

@Controller('schools/me')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class MeStudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('student-id-card')
  @Roles('student')
  myStudentIdCard(@CurrentUser() user: AuthUser) {
    return this.studentsService.getIdCardByUserId(user.schoolId, user.id);
  }

  @Get('children/:profileId/id-card')
  @Roles('parent')
  childIdCard(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.studentsService.getIdCardForParentChild(
      user.schoolId,
      user.id,
      profileId,
    );
  }
}
