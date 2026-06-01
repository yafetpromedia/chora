import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';
import { InvitesService } from './invites.service';
import { CurriculumCatalogService } from '../provisioning/curriculum-catalog.service';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly invitesService: InvitesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly curriculumCatalog: CurriculumCatalogService,
  ) {}

  /** Public — used during school registration. */
  @Get('curriculum-packages')
  listCurriculumPackages() {
    return this.curriculumCatalog.listPackages().then((rows) =>
      rows.map((p) => ({
        key: p.key,
        label: p.label,
        description: p.description,
        gradePreset: p.gradePreset,
        schoolType: p.schoolType,
        isBlank: p.isBlank,
        counts: p._count,
      })),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard)
  async me(@CurrentUser() user: AuthUser) {
    const school = await this.schoolsService.findById(user.schoolId);
    if (!school) {
      return { school: null };
    }
    return { school };
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSchoolSettingsDto,
  ) {
    return this.schoolsService.updateSettings(user.schoolId, {
      name: dto.name,
      schoolType: dto.schoolType,
      address: dto.address,
      email: dto.email,
      phone: dto.phone,
      country: dto.country,
      logoUrl: dto.logoUrl,
      attendanceMode: dto.attendanceMode,
      bankName: dto.bankName,
      bankAccountHolder: dto.bankAccountHolder,
      bankAccountNumber: dto.bankAccountNumber,
      paymentInstructions: dto.paymentInstructions,
    });
  }

  @Post('invites')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  createInvite(@CurrentUser() user: AuthUser, @Body() dto: CreateInviteDto) {
    return this.invitesService.createInvite(user.schoolId, user.id, dto);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  listInvites(@CurrentUser() user: AuthUser) {
    return this.invitesService.listInvites(user.schoolId);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getStatus(user.schoolId);
  }

  @Get('billing')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  getBilling(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getBillingOverview(user.schoolId);
  }

  @Get('billing/invoices')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  listBillingInvoices(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.listInvoicesForSchool(user.schoolId);
  }

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Post('subscription/upgrade')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  async upgradePlan(@CurrentUser() user: AuthUser, @Body() dto: UpgradePlanDto) {
    await this.subscriptionsService.upgradePlan(user.schoolId, dto.plan);
    return this.subscriptionsService.getStatus(user.schoolId);
  }
}
