import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { UpdateParentAccountDto } from './dto/update-parent-account.dto';
import { StudentsService } from './students.service';

@Controller('schools/parents')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.STUDENTS_READ)
export class ParentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.studentsService.listParents(user.schoolId);
  }

  @Post(':userId/reset-password')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.studentsService.resetParentPassword(user.schoolId, userId);
  }

  @Patch(':userId')
  @RequirePermissions(SchoolPermission.STUDENTS_EDIT)
  updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateParentAccountDto,
  ) {
    return this.studentsService.updateParentAccount(user.schoolId, userId, dto);
  }
}
