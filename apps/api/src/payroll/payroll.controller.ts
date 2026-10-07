import {
  Body,
  Controller,
  ForbiddenException,
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
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { SchoolPermission } from '../common/permissions/school-permissions';
import {
  CreateEmployeeCompensationDto,
  CreatePayrollPeriodDto,
  PayrollAdjustmentDto,
  PayrollSettingsDto,
  RecordPayrollPaymentDto,
  ReviewOvertimeDto,
  UpsertCompensationComponentDto,
} from './payroll.dto';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(
  JwtAuthGuard,
  SchoolTenantGuard,
  RolesGuard,
  PermissionsGuard,
  SchoolModuleGuard,
)
@RequireSchoolModule('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get('dashboard')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  dashboard(@CurrentUser() user: AuthUser) {
    return this.payroll.dashboard(user.schoolId);
  }

  @Get('settings')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  getSettings(@CurrentUser() user: AuthUser) {
    return this.payroll.getSettings(user.schoolId);
  }

  @Patch('settings')
  @Roles('admin')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: PayrollSettingsDto,
  ) {
    return this.payroll.updateSettings(user.schoolId, dto);
  }

  @Get('rule-sets')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  ruleSets(@CurrentUser() user: AuthUser) {
    return this.payroll.listRuleSets(user.schoolId);
  }

  @Get('components')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  components(@CurrentUser() user: AuthUser) {
    return this.payroll.listComponents(user.schoolId);
  }

  @Post('components')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  createComponent(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertCompensationComponentDto,
  ) {
    return this.payroll.createComponent(user.schoolId, dto);
  }

  @Patch('components/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  updateComponent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertCompensationComponentDto,
  ) {
    return this.payroll.updateComponent(user.schoolId, id, dto);
  }

  @Get('employees/:userId/compensation')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  listComp(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.payroll.listCompensation(user.schoolId, userId);
  }

  @Post('employees/:userId/compensation')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_SETTINGS)
  createComp(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: CreateEmployeeCompensationDto,
  ) {
    return this.payroll.createCompensation(
      user.schoolId,
      user.id,
      userId,
      dto,
    );
  }

  @Get('periods')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  periods(@CurrentUser() user: AuthUser) {
    return this.payroll.listPeriods(user.schoolId);
  }

  @Post('periods')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_CALCULATE)
  createPeriod(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payroll.createPeriod(user.schoolId, dto);
  }

  @Post('periods/:periodId/runs')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_CALCULATE)
  createRun(
    @CurrentUser() user: AuthUser,
    @Param('periodId') periodId: string,
  ) {
    return this.payroll.createRun(user.schoolId, periodId);
  }

  @Get('runs/:runId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  getRun(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.payroll.getRun(user.schoolId, runId);
  }

  @Post('runs/:runId/calculate')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_CALCULATE)
  calculate(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.payroll.calculate(user.schoolId, user.id, runId);
  }

  @Post('runs/:runId/adjustments')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_ADJUST)
  adjust(
    @CurrentUser() user: AuthUser,
    @Param('runId') runId: string,
    @Body() dto: PayrollAdjustmentDto,
  ) {
    return this.payroll.addAdjustment(user.schoolId, user.id, runId, dto);
  }

  @Post('runs/:runId/approve')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_APPROVE)
  approve(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.payroll.approve(user.schoolId, user.id, runId);
  }

  @Post('runs/:runId/close')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_CLOSE)
  close(
    @CurrentUser() user: AuthUser,
    @Param('runId') runId: string,
    @Body() body: { force?: boolean; reason?: string },
  ) {
    return this.payroll.close(user.schoolId, user.id, runId, body);
  }

  @Get('runs/:runId/report')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  report(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.payroll.summaryReport(user.schoolId, runId);
  }

  @Get('runs/:runId/export')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_EXPORT)
  @Header('Content-Type', 'text/csv')
  async export(
    @CurrentUser() user: AuthUser,
    @Param('runId') runId: string,
    @Res() res: Response,
  ) {
    const csv = await this.payroll.exportCsv(user.schoolId, runId);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${runId}.csv"`,
    );
    res.send(csv);
  }

  @Post('payments/:snapshotId')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_PAY)
  pay(
    @CurrentUser() user: AuthUser,
    @Param('snapshotId') snapshotId: string,
    @Body() dto: RecordPayrollPaymentDto,
  ) {
    return this.payroll.recordPayment(
      user.schoolId,
      user.id,
      snapshotId,
      dto,
    );
  }

  @Get('overtime-approvals')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_VIEW)
  otList(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.payroll.listOvertimeApprovals(user.schoolId, status);
  }

  @Patch('overtime-approvals/:id')
  @Roles('admin', 'staff')
  @RequirePermissions(SchoolPermission.PAYROLL_APPROVE)
  otReview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewOvertimeDto,
  ) {
    return this.payroll.reviewOvertime(user.schoolId, user.id, id, dto);
  }

  @Get('me/payslips')
  @Roles('admin', 'staff', 'teacher')
  @RequirePermissions(SchoolPermission.PAYSLIP_SELF)
  myPayslips(@CurrentUser() user: AuthUser) {
    return this.payroll.listMyPayslips(user.schoolId, user.id);
  }

  @Get('payslips/:id')
  @Roles('admin', 'staff', 'teacher')
  payslip(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // OR semantics: payslip.self (own) or payslip.manage (same-school others).
    // RequirePermissions is AND-only, so enforce explicitly at the boundary.
    const canSelf = user.permissions.includes('payslip.self');
    const canManage = user.permissions.includes('payslip.manage');
    if (!canSelf && !canManage) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.payroll.getPayslip(
      user.schoolId,
      id,
      user.id,
      canManage,
    );
  }
}
