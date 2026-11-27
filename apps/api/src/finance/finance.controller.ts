import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { RequireSchoolModule } from '../common/decorators/require-school-module.decorator';
import { SchoolModuleGuard } from '../common/guards/school-module.guard';
import { AssignGradeFeesDto } from './dto/assign-grade-fees.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateFeeScheduleDto } from './dto/create-fee-schedule.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { SendRemindersDto } from './dto/send-reminders.dto';
import { InitializeChapaPaymentDto } from './dto/initialize-chapa-payment.dto';
import { SubmitParentPaymentDto } from './dto/submit-parent-payment.dto';
import { VerifyChapaPaymentDto } from './dto/verify-chapa-payment.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard, SchoolModuleGuard)
@RequireSchoolModule('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('seed-defaults')
  @Roles('admin')
  seedDefaults(@CurrentUser() user: AuthUser) {
    return this.financeService.ensureDefaultFeeTypes(user.schoolId);
  }

  @Get('years')
  @Roles('admin')
  listYears(@CurrentUser() user: AuthUser) {
    return this.financeService.listYears(user.schoolId);
  }

  @Post('years')
  @Roles('admin')
  createYear(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.financeService.createYear(user.schoolId, dto);
  }

  @Get('fee-types')
  @Roles('admin')
  listFeeTypes(@CurrentUser() user: AuthUser) {
    return this.financeService.listFeeTypes(user.schoolId);
  }

  @Get('schedules')
  @Roles('admin')
  listSchedules(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.financeService.listSchedules(user.schoolId, academicYearId);
  }

  @Post('schedules')
  @Roles('admin')
  createSchedule(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeScheduleDto,
  ) {
    return this.financeService.createSchedule(user.schoolId, dto);
  }

  @Post('assign-grade')
  @Roles('admin')
  assignGrade(@CurrentUser() user: AuthUser, @Body() dto: AssignGradeFeesDto) {
    return this.financeService.assignGradeFees(user.schoolId, dto);
  }

  @Get('students/:profileId/summary')
  @Roles('admin', 'parent', 'student')
  async studentSummary(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    await this.financeService.assertParentCanViewStudent(
      user.role,
      user.id,
      user.schoolId,
      profileId,
    );
    return this.financeService.getStudentFinanceSummary(
      user.schoolId,
      profileId,
    );
  }

  @Post('payments')
  @Roles('admin', 'staff')
  recordPayment(@CurrentUser() user: AuthUser, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayment(user.schoolId, dto, user.id);
  }

  @Get('payments/pending')
  @Roles('admin', 'staff')
  listPending(@CurrentUser() user: AuthUser) {
    return this.financeService.listPendingPayments(user.schoolId);
  }

  @Post('payments/:id/approve')
  @Roles('admin', 'staff')
  approvePending(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.approvePendingPayment(
      user.schoolId,
      id,
      user.id,
    );
  }

  @Post('payments/:id/reject')
  @Roles('admin', 'staff')
  rejectPending(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.financeService.rejectPendingPayment(
      user.schoolId,
      id,
      user.id,
      dto.reason,
    );
  }

  @Get('payments/:id/receipt')
  @Roles('admin', 'parent')
  async receipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.getPaymentReceipt(user.schoolId, id);
  }

  @Get('analytics')
  @Roles('admin')
  analytics(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.financeService.getAnalytics(user.schoolId, month);
  }

  @Get('export')
  @Roles('admin')
  @Header('Content-Type', 'text/csv')
  async export(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.financeService.exportCsv(user.schoolId, from, to);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="finance-${from}-${to}.csv"`,
    );
    res.send(csv);
  }

  @Post('reminders')
  @Roles('admin')
  reminders(@CurrentUser() user: AuthUser, @Body() dto: SendRemindersDto) {
    return this.financeService.sendReminders(
      user.schoolId,
      dto.daysBeforeDue ?? 3,
    );
  }

  @Get('parent/overview')
  @Roles('parent')
  parentOverview(@CurrentUser() user: AuthUser) {
    return this.financeService.parentOverview(user.id, user.schoolId);
  }

  @Get('parent/students/:profileId/due')
  @Roles('parent')
  parentDue(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.financeService.parentFeesDue(user.id, user.schoolId, profileId);
  }

  @Post('parent/students/:profileId/pay-request')
  @Roles('parent')
  payRequest(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: SubmitParentPaymentDto,
  ) {
    return this.financeService.submitParentPayment(
      user.id,
      user.schoolId,
      profileId,
      {
        amountCents: dto.amountCents,
        reference: dto.reference,
        method: dto.method,
        proofUrl: dto.proofUrl,
        notes: dto.notes,
      },
    );
  }

  @Post('parent/students/:profileId/chapa/initialize')
  @Roles('parent')
  initializeChapa(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: InitializeChapaPaymentDto,
  ) {
    return this.financeService.initializeChapaPayment(
      user.id,
      user.schoolId,
      profileId,
      dto.amountCents,
    );
  }

  @Post('parent/chapa/verify')
  @Roles('parent')
  verifyChapa(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyChapaPaymentDto,
  ) {
    return this.financeService.verifyChapaPaymentForParent(user.id, dto.txRef);
  }
}
