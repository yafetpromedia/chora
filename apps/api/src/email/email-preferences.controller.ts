import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { UpdateEmailPreferencesDto } from './dto/email.dto';
import { EmailPreferencesService } from './email-preferences.service';

@Controller('schools/email-preferences')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
@Roles('admin')
export class SchoolEmailPreferenceController {
  constructor(private readonly preferences: EmailPreferencesService) {}

  @Get()
  getSchool(@CurrentUser() user: AuthUser) {
    return this.preferences.getSchool(user.schoolId);
  }

  @Patch()
  updateSchool(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.preferences.updateSchool(user.schoolId, dto);
  }

  @Patch('parents/:userId')
  updateParent(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.preferences.updateParentAsAdmin(user.schoolId, userId, dto);
  }
}

@Controller('notifications/email-preferences')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
export class ParentEmailPreferenceController {
  constructor(private readonly preferences: EmailPreferencesService) {}

  @Get()
  @Roles('parent')
  getOwn(@CurrentUser() user: AuthUser) {
    return this.preferences.getParent(user.schoolId, user.id);
  }

  @Patch()
  @Roles('parent')
  updateOwn(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.preferences.updateOwn(user, dto);
  }
}
