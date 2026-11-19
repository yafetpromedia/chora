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
import { AdmissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import { AdmissionsService } from './admissions.service';
import { CreateAdmissionApplicationDto } from './dto/create-application.dto';
import { CreateAdmissionCycleDto } from './dto/create-cycle.dto';
import {
  CreatePlacementRuleDto,
  UpdatePlacementRuleDto,
} from './dto/placement-rule.dto';
import { RunPlacementDto } from './dto/run-placement.dto';
import { UpdateAdmissionApplicationDto } from './dto/update-application.dto';
import { UpdateAdmissionCycleDto } from './dto/update-cycle.dto';

@Controller('schools/admissions')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'staff')
@RequirePermissions(SchoolPermission.ADMISSIONS_READ)
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Get('cycles')
  listCycles(@CurrentUser() user: AuthUser) {
    return this.admissionsService.listCycles(user.schoolId);
  }

  @Post('cycles')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  createCycle(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAdmissionCycleDto,
  ) {
    return this.admissionsService.createCycle(user.schoolId, dto);
  }

  @Post('cycles/ensure-default')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  ensureDefaultCycle(@CurrentUser() user: AuthUser) {
    return this.admissionsService.ensureDefaultCycle(user.schoolId);
  }

  @Patch('cycles/:cycleId')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  updateCycle(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Body() dto: UpdateAdmissionCycleDto,
  ) {
    return this.admissionsService.updateCycle(user.schoolId, cycleId, dto);
  }

  @Get('applications')
  listApplications(
    @CurrentUser() user: AuthUser,
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: AdmissionStatus,
  ) {
    return this.admissionsService.listApplications(user.schoolId, {
      cycleId,
      status,
    });
  }

  @Get('applications/:id')
  getApplication(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admissionsService.getApplication(user.schoolId, id);
  }

  @Post('applications')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  createApplication(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAdmissionApplicationDto,
  ) {
    return this.admissionsService.createApplication(user.schoolId, dto);
  }

  @Patch('applications/:id')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  updateApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdmissionApplicationDto,
  ) {
    return this.admissionsService.updateApplication(user.schoolId, id, dto);
  }

  @Delete('applications/:id')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  deleteApplication(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admissionsService.deleteApplication(user.schoolId, id);
  }

  @Post('applications/:id/enroll')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  enrollApplication(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admissionsService.enrollApplication(user.schoolId, id);
  }

  @Get('cycles/:cycleId/placement-rules')
  listPlacementRules(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.admissionsService.listPlacementRules(user.schoolId, cycleId);
  }

  @Post('cycles/:cycleId/placement-rules')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  createPlacementRule(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Body() dto: CreatePlacementRuleDto,
  ) {
    return this.admissionsService.createPlacementRule(
      user.schoolId,
      cycleId,
      dto,
    );
  }

  @Patch('cycles/:cycleId/placement-rules/:ruleId')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  updatePlacementRule(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePlacementRuleDto,
  ) {
    return this.admissionsService.updatePlacementRule(
      user.schoolId,
      cycleId,
      ruleId,
      dto,
    );
  }

  @Delete('cycles/:cycleId/placement-rules/:ruleId')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  deletePlacementRule(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.admissionsService.deletePlacementRule(
      user.schoolId,
      cycleId,
      ruleId,
    );
  }

  @Post('cycles/:cycleId/placement-rules/seed-streams')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  seedStreamRules(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Body() body: { gradeId: string },
  ) {
    return this.admissionsService.seedStreamRules(
      user.schoolId,
      cycleId,
      body.gradeId,
    );
  }

  @Post('cycles/:cycleId/placement-rules/seed-grade')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  seedGradeRules(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Body() body: { gradeId: string },
  ) {
    return this.admissionsService.seedGradeRules(
      user.schoolId,
      cycleId,
      body.gradeId,
    );
  }

  @Post('cycles/:cycleId/run-placement')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  runPlacement(
    @CurrentUser() user: AuthUser,
    @Param('cycleId') cycleId: string,
    @Body() dto: RunPlacementDto,
  ) {
    return this.admissionsService.runPlacement(user.schoolId, cycleId, dto);
  }

  @Post('cycles/:cycleId/bulk-enroll')
  @RequirePermissions(SchoolPermission.ADMISSIONS_MANAGE)
  bulkEnroll(@CurrentUser() user: AuthUser, @Param('cycleId') cycleId: string) {
    return this.admissionsService.bulkEnroll(user.schoolId, cycleId);
  }
}
