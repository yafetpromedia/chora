import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformInvoiceStatus } from '@prisma/client';
import { UpdatePlatformProfileDto } from './dto/update-platform-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentPlatformUser } from '../common/decorators/current-platform-user.decorator';
import type { PlatformAuthUser } from '../common/auth.types';
import { PlatformGuard } from '../common/guards/platform.guard';
import { CreateTenantSchoolDto } from './dto/create-tenant-school.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import {
  UpdatePlanCatalogDto,
  UpdateSchoolPlanDto,
} from './dto/update-plan-catalog.dto';
import {
  CreatePlatformInvoiceDto,
  UpdatePlatformInvoiceDto,
} from './dto/platform-invoice.dto';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformAuthService: PlatformAuthService,
    private readonly platformService: PlatformService,
    private readonly platformBillingService: PlatformBillingService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAuthService.login(dto.email, dto.password);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  me(@CurrentPlatformUser() user: PlatformAuthUser) {
    return { user };
  }

  @Get('auth/profile')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  profile(@CurrentPlatformUser() user: PlatformAuthUser) {
    return this.platformAuthService.getProfile(user);
  }

  @Patch('auth/profile')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateProfile(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() dto: UpdatePlatformProfileDto,
  ) {
    return this.platformAuthService.updateProfile(user, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  dashboard() {
    return this.platformService.getDashboard();
  }

  @Get('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listSchools() {
    return this.platformService.listSchools();
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  schoolDetail(@Param('id') id: string) {
    return this.platformService.getSchoolDetail(id);
  }

  @Get('curriculum-packages')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listCurriculumPackages() {
    return this.platformService.listCurriculumPackages();
  }

  @Get('curriculum-packages/:key')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  getCurriculumPackage(@Param('key') key: string) {
    return this.platformService.getCurriculumPackage(key);
  }

  @Post('schools')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createSchool(@Body() dto: CreateTenantSchoolDto) {
    return this.platformService.createTenantSchool(dto);
  }

  @Post('schools/:id/provision')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  reprovisionSchool(
    @Param('id') id: string,
    @Body() body: { curriculumPackageKey: string },
  ) {
    return this.platformService.reprovisionSchool(
      id,
      body.curriculumPackageKey,
    );
  }

  @Patch('schools/:id/status')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.platformService.updateSchoolStatus(id, dto.status);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listPlans() {
    return this.platformService.listPlanCatalog();
  }

  @Patch('plans/:plan')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updatePlan(@Param('plan') plan: string, @Body() dto: UpdatePlanCatalogDto) {
    return this.platformService.updatePlanCatalog(plan, dto);
  }

  @Patch('schools/:id/plan')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateSchoolPlan(@Param('id') id: string, @Body() dto: UpdateSchoolPlanDto) {
    return this.platformService.updateSchoolPlan(id, dto);
  }

  @Get('billing/summary')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  billingSummary() {
    return this.platformBillingService.getBillingSummary();
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listUsage() {
    return this.platformBillingService.listUsage();
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  listInvoices(
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: PlatformInvoiceStatus,
  ) {
    return this.platformBillingService.listInvoices({ schoolId, status });
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  createInvoice(@Body() dto: CreatePlatformInvoiceDto) {
    return this.platformBillingService.createInvoice(dto);
  }

  @Patch('invoices/:id')
  @UseGuards(JwtAuthGuard, PlatformGuard)
  updateInvoice(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.platformBillingService.updateInvoice(id, dto);
  }
}
