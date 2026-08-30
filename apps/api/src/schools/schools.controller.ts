import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { SchoolTenantGuard } from '../common/guards/school-tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { SubscriptionCheckoutDto } from './dto/subscription-checkout.dto';
import { VerifySubscriptionCheckoutDto } from './dto/verify-subscription-checkout.dto';
import { RedeemCouponDto } from '../subscriptions/dto/coupon.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { SubmitPlatformPaymentDto } from '../subscriptions/dto/platform-payment.dto';
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
      authorizedSignatureUrl: dto.authorizedSignatureUrl,
      authorizedSignatureLabel: dto.authorizedSignatureLabel,
      primaryColor: dto.primaryColor,
      accentColor: dto.accentColor,
      accentDeep: dto.accentDeep,
      attendanceMode: dto.attendanceMode,
      bankName: dto.bankName,
      bankAccountHolder: dto.bankAccountHolder,
      bankAccountNumber: dto.bankAccountNumber,
      telebirrNumber: dto.telebirrNumber,
      telebirrAccountName: dto.telebirrAccountName,
      paymentInstructions: dto.paymentInstructions,
      reportCardTitle: dto.reportCardTitle,
      reportCardTagline: dto.reportCardTagline,
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
  @Roles('admin', 'staff', 'teacher', 'parent', 'student')
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

  @Get('billing/payment-config')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  paymentConfig() {
    return this.subscriptionsService.getPaymentConfig();
  }

  @Get('billing/payment-proofs')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  listPaymentProofs(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.listPlatformPaymentProofs(user.schoolId);
  }

  @Post('billing/invoices/:invoiceId/payment-proof')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  submitPaymentProof(
    @CurrentUser() user: AuthUser,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SubmitPlatformPaymentDto,
  ) {
    return this.subscriptionsService.submitPlatformPaymentProof(
      user.schoolId,
      user.id,
      invoiceId,
      dto,
    );
  }

  @Post('billing/request-invoice')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  requestRenewalInvoice(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.requestRenewalInvoice(
      user.schoolId,
      user.id,
    );
  }

  @Post('subscription/checkout')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  startCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscriptionCheckoutDto,
  ) {
    return this.subscriptionsService.initializePlanCheckout(
      user.schoolId,
      user.id,
      dto.plan,
      dto.interval,
    );
  }

  @Post('subscription/checkout/verify')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  verifyCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifySubscriptionCheckoutDto,
  ) {
    return this.subscriptionsService.verifyPlanCheckoutForSchool(
      user.schoolId,
      dto.txRef,
    );
  }

  @Post('subscription/upgrade')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  upgradePlan(@CurrentUser() user: AuthUser, @Body() dto: UpgradePlanDto) {
    return this.subscriptionsService.upgradePlan(
      user.schoolId,
      dto.plan,
      user.id,
    );
  }

  @Post('subscription/coupon')
  @UseGuards(JwtAuthGuard, SchoolTenantGuard, RolesGuard)
  @Roles('admin')
  redeemCoupon(@CurrentUser() user: AuthUser, @Body() dto: RedeemCouponDto) {
    return this.subscriptionsService.redeemCoupon(
      user.schoolId,
      dto.code,
      user.id,
    );
  }
}
