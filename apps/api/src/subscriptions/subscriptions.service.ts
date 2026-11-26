import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  BillingCurrency,
  Plan,
  PlatformInvoiceStatus,
  PlatformPaymentProofStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { ReviewPlatformPaymentDto } from './dto/platform-payment.dto';
import type { SubmitPlatformPaymentDto } from './dto/platform-payment.dto';
import { EmailService } from '../email/email.service';
import { ChapaService } from '../payments/chapa.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from './coupons.service';
import { ModuleEntitlementService } from './module-entitlement.service';
import {
  BILLING_BUNDLES,
  SCHOOL_MODULE_CATALOG,
  computeModularMonthlyTotal,
  type BillingBundleId,
  type ModularPriceBreakdown,
  type SchoolModuleKey,
  allSchoolModules,
} from './module-catalog';
import { PlanCatalogService } from './plan-catalog.service';
import { UPGRADE_PLANS } from './plan-limits';

const YEARLY_BILLING_MULTIPLIER = 10;

export type SubscriptionStatus = {
  plan: Plan;
  isActive: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  couponCode: string | null;
  daysRemaining: number | null;
  expired: boolean;
  limits: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  usage: {
    students: number;
    teachers: number;
    admins: number;
  };
  planLabel: string;
  planDescription: string;
  enabledModules: SchoolModuleKey[];
  billingBundle: string | null;
  priceBreakdown: ModularPriceBreakdown | null;
  moduleCatalog: typeof SCHOOL_MODULE_CATALOG;
  bundles: typeof BILLING_BUNDLES;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planCatalog: PlanCatalogService,
    private readonly chapaService: ChapaService,
    private readonly coupons: CouponsService,
    private readonly moduleEntitlements: ModuleEntitlementService,
    @Optional() private readonly email?: EmailService,
  ) {}

  async createTrial(schoolId: string) {
    const trialDays = await this.planCatalog.getTrialDays();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.subscription.create({
      data: {
        schoolId,
        plan: Plan.TRIAL,
        trialEndsAt,
        isActive: true,
        enabledModules: allSchoolModules(),
        billingBundle: 'full',
      },
    });
  }

  async ensureSubscription(schoolId: string, plan: Plan = Plan.STARTER) {
    const existing = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    if (existing) {
      return existing;
    }
    const trialDays = await this.planCatalog.getTrialDays();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.subscription.create({
      data: {
        schoolId,
        plan,
        isActive: true,
        trialEndsAt: plan === Plan.TRIAL ? trialEndsAt : null,
        enabledModules: allSchoolModules(),
        billingBundle: 'full',
      },
    });
  }

  async getStatus(schoolId: string): Promise<SubscriptionStatus> {
    let sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });

    if (!sub) {
      sub = await this.createTrial(schoolId);
    }

    const now = new Date();
    const trialExpired =
      sub.plan === Plan.TRIAL &&
      sub.trialEndsAt !== null &&
      sub.trialEndsAt < now;
    const periodExpired =
      sub.plan !== Plan.TRIAL &&
      sub.currentPeriodEnd !== null &&
      sub.currentPeriodEnd < now;

    if ((trialExpired || periodExpired) && sub.isActive) {
      sub = await this.prisma.subscription.update({
        where: { schoolId },
        data: { isActive: false },
      });
    }

    const usage = await this.countUsersByRole(schoolId);
    const limits = await this.planCatalog.getLimits(sub.plan);

    let daysRemaining: number | null = null;
    if (sub.plan === Plan.TRIAL && sub.trialEndsAt) {
      daysRemaining = Math.max(
        0,
        Math.ceil(
          (sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
    } else if (sub.currentPeriodEnd) {
      daysRemaining = Math.max(
        0,
        Math.ceil(
          (sub.currentPeriodEnd.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
    }

    const expired = trialExpired || periodExpired || !sub.isActive;

    await this.moduleEntitlements.backfillAllModulesIfUnset(schoolId);
    const refreshed = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    const subForModules = refreshed ?? sub;
    const enabledModules =
      this.moduleEntitlements.resolveFromSubscription(subForModules);
    const billingBundle = subForModules.billingBundle;
    const pricePlan = sub.plan === Plan.TRIAL ? Plan.STARTER : sub.plan;
    const priceBreakdown = await this.buildPriceBreakdown(
      pricePlan,
      enabledModules,
      billingBundle === 'base'
        ? null
        : billingBundle && billingBundle !== 'base'
          ? (billingBundle as BillingBundleId)
          : null,
      billingBundle === 'base',
    );

    return {
      plan: sub.plan,
      isActive: sub.isActive,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      couponCode: sub.couponCode,
      daysRemaining,
      expired,
      limits: {
        students: limits.students,
        teachers: limits.teachers,
        admins: limits.admins,
      },
      usage,
      planLabel: limits.label,
      planDescription: limits.description,
      enabledModules,
      billingBundle,
      priceBreakdown,
      moduleCatalog: SCHOOL_MODULE_CATALOG,
      bundles: BILLING_BUNDLES,
    };
  }

  getModulesCatalog() {
    return {
      modules: SCHOOL_MODULE_CATALOG,
      bundles: BILLING_BUNDLES,
    };
  }

  async updateModules(
    schoolId: string,
    input: { modules?: string[]; bundleId?: string | null },
  ) {
    await this.ensureSubscription(schoolId);
    const normalized = this.moduleEntitlements.normalizeSelection(input);
    await this.prisma.subscription.update({
      where: { schoolId },
      data: {
        enabledModules: normalized.modules,
        billingBundle: normalized.billingBundle,
      },
    });
    return this.getStatus(schoolId);
  }

  private async buildPriceBreakdown(
    plan: Plan,
    modules: SchoolModuleKey[],
    bundleId: BillingBundleId | null,
    baseOnly = false,
  ): Promise<ModularPriceBreakdown | null> {
    if (plan === Plan.TRIAL) {
      plan = Plan.STARTER;
    }
    if (plan === Plan.ENTERPRISE) {
      return computeModularMonthlyTotal({
        plan,
        baseEtb: 0,
        baseUsd: 0,
        modules: [],
        bundleId: null,
      });
    }
    const catalog = await this.planCatalog.findAll();
    const planRow = catalog.find((p) => p.plan === plan);
    if (!planRow) return null;
    return computeModularMonthlyTotal({
      plan,
      baseEtb: planRow.etbMonthly,
      baseUsd: planRow.usdMonthly,
      modules: baseOnly ? [] : modules,
      bundleId: baseOnly ? null : bundleId,
    });
  }

  async assertActive(schoolId: string) {
    const status = await this.getStatus(schoolId);
    if (!status.isActive || status.expired) {
      throw new ForbiddenException(
        'Your Chora trial has ended. Pay for a plan or enter a coupon code to continue.',
      );
    }
    return status;
  }

  async assertCanAddUser(schoolId: string, role: UserRole) {
    const status = await this.assertActive(schoolId);
    const limits = await this.planCatalog.getLimits(status.plan);

    if (role === 'student' && limits.students !== null) {
      if (status.usage.students >= limits.students) {
        throw new ForbiddenException(
          status.plan === Plan.TRIAL
            ? `Trial limit reached (${limits.students} students). Upgrade your plan to add more.`
            : `Student limit reached for your ${limits.label} plan (${status.usage.students}/${limits.students}). Upgrade to add more, or update existing rows only.`,
        );
      }
    }

    if (role === 'teacher' && limits.teachers !== null) {
      if (status.usage.teachers >= limits.teachers) {
        throw new ForbiddenException(
          status.plan === Plan.TRIAL
            ? `Trial limit reached (${limits.teachers} teachers). Upgrade your plan to add more.`
            : `Teacher limit reached for your ${limits.label} plan.`,
        );
      }
    }

    if (role === 'admin' && limits.admins !== null) {
      if (status.usage.admins >= limits.admins) {
        throw new ForbiddenException(
          'Only one school administrator is allowed on the trial.',
        );
      }
    }

    return status;
  }

  async getPaymentConfig() {
    return {
      chapaEnabled: this.chapaService.isLiveEnabled(),
      currency: 'ETB' as const,
      provider: 'chapa' as const,
      payout: await this.getPlatformPayout(),
    };
  }

  private async getPlatformPayout() {
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    const hasBank =
      !!settings?.bankName?.trim() && !!settings?.bankAccountNumber?.trim();
    const hasTelebirr = !!settings?.telebirrNumber?.trim();
    return {
      bank: hasBank
        ? {
            bankName: settings!.bankName!,
            accountHolder:
              settings!.bankAccountHolder?.trim() || settings!.bankName!,
            accountNumber: settings!.bankAccountNumber!,
          }
        : null,
      telebirr: hasTelebirr
        ? {
            number: settings!.telebirrNumber!,
            accountName:
              settings!.telebirrAccountName?.trim() ||
              settings!.bankAccountHolder?.trim() ||
              settings!.platformName ||
              'Chora',
          }
        : null,
      instructions: settings?.payoutInstructions?.trim() || null,
      supportEmail: settings?.supportEmail ?? null,
      supportPhone: settings?.supportPhone ?? null,
    };
  }

  async upgradePlan(
    schoolId: string,
    plan: Plan,
    adminId?: string,
    moduleSelection?: { modules?: string[]; bundleId?: string | null },
  ) {
    if (!UPGRADE_PLANS.includes(plan)) {
      throw new ForbiddenException('Invalid upgrade plan');
    }

    if (this.chapaService.isLiveEnabled()) {
      throw new BadRequestException(
        'Use subscription checkout to pay and activate your plan.',
      );
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    if (moduleSelection) {
      await this.updateModules(schoolId, moduleSelection);
    }

    const statusAfterMods = await this.getStatus(schoolId);
    const breakdown = await this.buildPriceBreakdown(
      plan,
      statusAfterMods.enabledModules,
      statusAfterMods.billingBundle === 'base'
        ? null
        : (statusAfterMods.billingBundle as BillingBundleId | null),
      statusAfterMods.billingBundle === 'base',
    );
    if (!breakdown || (breakdown.custom && plan === Plan.ENTERPRISE)) {
      throw new BadRequestException(
        plan === Plan.ENTERPRISE
          ? 'Contact sales for Enterprise pricing'
          : 'Plan pricing is not available',
      );
    }
    if (breakdown.totalEtb <= 0 && plan !== Plan.ENTERPRISE) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const catalog = await this.planCatalog.findAll();
    const planRow = catalog.find((p) => p.plan === plan);
    if (!planRow) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const percentOff = await this.coupons.discountForSchool(schoolId);
    const amountEtb = this.applyPercentOff(breakdown.totalEtb, percentOff);
    const amountUsd = this.applyPercentOff(breakdown.totalUsd, percentOff);

    const moduleData = {
      enabledModules:
        statusAfterMods.enabledModules as unknown as Prisma.InputJsonValue,
      billingBundle: statusAfterMods.billingBundle,
    };

    if (percentOff >= 100 || amountEtb <= 0) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await this.prisma.subscription.update({
        where: { schoolId },
        data: {
          plan,
          isActive: true,
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
          ...moduleData,
        },
      });
      const status = await this.getStatus(schoolId);
      return {
        ...status,
        paymentRequired: false,
        message: `Coupon applied. ${planRow.label} is now active.`,
      };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const invoiceNumber = await this.nextInvoiceNumber();

    await this.prisma.platformInvoice.updateMany({
      where: { schoolId, status: PlatformInvoiceStatus.SENT },
      data: { status: PlatformInvoiceStatus.VOID },
    });

    await this.prisma.platformInvoice.create({
      data: {
        schoolId,
        invoiceNumber,
        plan,
        periodStart: now,
        periodEnd,
        dueAt: now,
        amountUsd,
        amountEtb,
        currency: BillingCurrency.ETB,
        status: PlatformInvoiceStatus.SENT,
        billingInterval: 'month',
        initiatedBy: adminId ?? null,
        enabledModules: moduleData.enabledModules,
        billingBundle: moduleData.billingBundle,
        notes: percentOff
          ? `${planRow.label} modular monthly · ${percentOff}% coupon`
          : `${planRow.label} modular monthly — pay by bank transfer`,
      },
    });

    const status = await this.getStatus(schoolId);
    return {
      ...status,
      paymentRequired: true,
      invoiceNumber,
      amountEtb,
      percentOff,
      message: percentOff
        ? `Invoice ${invoiceNumber} issued at ${percentOff}% off (${amountEtb} ETB). Access continues after payment is confirmed.`
        : `Invoice ${invoiceNumber} issued for ${amountEtb} ETB. Pay by bank transfer; we activate the plan when payment is confirmed.`,
    };
  }

  async redeemCoupon(schoolId: string, code: string, appliedBy?: string) {
    const applied = await this.coupons.redeem(schoolId, code, appliedBy);
    const status = await this.getStatus(schoolId);
    return { ...status, coupon: applied };
  }

  async initializePlanCheckout(
    schoolId: string,
    adminId: string,
    plan: Plan,
    interval: 'month' | 'year',
    moduleSelection?: { modules?: string[]; bundleId?: string | null },
  ) {
    if (!this.chapaService.isLiveEnabled()) {
      throw new BadRequestException('Chapa payments are not enabled');
    }
    if (!UPGRADE_PLANS.includes(plan)) {
      throw new ForbiddenException('Invalid plan for checkout');
    }

    if (moduleSelection) {
      await this.updateModules(schoolId, moduleSelection);
    }

    const status = await this.getStatus(schoolId);
    const breakdown = await this.buildPriceBreakdown(
      plan,
      status.enabledModules,
      status.billingBundle === 'base'
        ? null
        : (status.billingBundle as BillingBundleId | null),
      status.billingBundle === 'base',
    );
    if (!breakdown || breakdown.totalEtb <= 0) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const catalog = await this.planCatalog.findAll();
    const planRow = catalog.find((p) => p.plan === plan);
    if (!planRow) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const factor = interval === 'year' ? YEARLY_BILLING_MULTIPLIER : 1;
    const percentOff = await this.coupons.discountForSchool(schoolId);
    const amountEtb = this.applyPercentOff(
      breakdown.totalEtb * factor,
      percentOff,
    );
    const amountUsd = this.applyPercentOff(
      breakdown.totalUsd * factor,
      percentOff,
    );

    const [admin, school] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: adminId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      }),
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      }),
    ]);
    if (!admin) {
      throw new NotFoundException('Admin account not found');
    }

    await this.prisma.platformInvoice.updateMany({
      where: {
        schoolId,
        status: PlatformInvoiceStatus.SENT,
        paymentReference: { not: null },
      },
      data: { status: PlatformInvoiceStatus.VOID },
    });

    const invoiceNumber = await this.nextInvoiceNumber();
    const txRef = `C1SUB-${invoiceNumber}`;
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const invoice = await this.prisma.platformInvoice.create({
      data: {
        schoolId,
        invoiceNumber,
        plan,
        periodStart: now,
        periodEnd,
        dueAt: now,
        amountUsd,
        amountEtb,
        currency: BillingCurrency.ETB,
        status: PlatformInvoiceStatus.SENT,
        paymentReference: txRef,
        billingInterval: interval,
        initiatedBy: adminId,
        enabledModules: status.enabledModules,
        billingBundle: status.billingBundle,
        notes: `Chora ${planRow.label} modular plan (${interval}ly)`,
      },
    });

    const webAppUrl =
      process.env.WEB_APP_URL?.trim() || 'http://localhost:3000';
    const apiUrl =
      process.env.API_PUBLIC_URL?.trim() || 'http://localhost:3001';
    const phone = this.normalizeEthiopianPhone(admin.phone);
    const intervalLabel = interval === 'year' ? 'annual' : 'monthly';

    try {
      const { checkout_url } = await this.chapaService.initializeTransaction({
        amount: String(amountEtb),
        currency: 'ETB',
        email: admin.email,
        first_name: admin.firstName,
        last_name: admin.lastName,
        ...(phone ? { phone_number: phone } : {}),
        tx_ref: txRef,
        callback_url: `${apiUrl}/payments/chapa/callback`,
        return_url: `${webAppUrl}/admin/billing/plans?chapa_return=1&tx_ref=${encodeURIComponent(txRef)}`,
        customization: {
          title: `${school?.name ?? 'Chora'} — ${planRow.label}`,
          description: `${intervalLabel} subscription`,
        },
      });

      return {
        checkoutUrl: checkout_url,
        txRef,
        invoiceNumber,
        plan: planRow.label,
        amountEtb,
        interval,
        message: 'Redirecting to Chapa secure checkout…',
      };
    } catch (err) {
      await this.prisma.platformInvoice.update({
        where: { id: invoice.id },
        data: { status: PlatformInvoiceStatus.VOID },
      });
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Could not start Chapa checkout',
      );
    }
  }

  async verifyPlanCheckoutForSchool(schoolId: string, txRef: string) {
    const invoice = await this.findCheckoutInvoice(txRef);
    if (!invoice || invoice.schoolId !== schoolId) {
      throw new NotFoundException('Checkout not found');
    }

    if (invoice.status === PlatformInvoiceStatus.PAID) {
      const subscription = await this.getStatus(schoolId);
      return {
        status: 'COMPLETED',
        plan: subscription.plan,
        planLabel: subscription.planLabel,
        invoiceNumber: invoice.invoiceNumber,
        message: 'Your plan is active.',
      };
    }

    await this.completePlanCheckout(txRef);
    const subscription = await this.getStatus(schoolId);
    return {
      status: 'COMPLETED',
      plan: subscription.plan,
      planLabel: subscription.planLabel,
      invoiceNumber: invoice.invoiceNumber,
      message: `Welcome to ${subscription.planLabel}! Your subscription is now active.`,
    };
  }

  async completePlanCheckout(txRef: string) {
    const invoice = await this.findCheckoutInvoice(txRef);
    if (!invoice) {
      throw new NotFoundException('Checkout not found');
    }

    if (invoice.status === PlatformInvoiceStatus.PAID) {
      return this.getStatus(invoice.schoolId);
    }
    if (invoice.status !== PlatformInvoiceStatus.SENT) {
      throw new BadRequestException('Checkout is no longer pending');
    }
    if (!invoice.plan) {
      throw new BadRequestException('Checkout has no plan attached');
    }

    const verified = await this.chapaService.verifyTransaction(txRef);
    if (verified.status !== 'success') {
      throw new BadRequestException('Payment was not successful');
    }

    const paidEtb = Math.round(parseFloat(verified.amount));
    if (paidEtb !== invoice.amountEtb) {
      throw new BadRequestException('Paid amount does not match invoice');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformInvoice.update({
        where: { id: invoice.id },
        data: {
          status: PlatformInvoiceStatus.PAID,
          paidAt: new Date(),
          paymentReference: `${txRef}|${verified.reference}`,
        },
      });
      await tx.subscription.update({
        where: { schoolId: invoice.schoolId },
        data: {
          plan: invoice.plan!,
          isActive: true,
          trialEndsAt: null,
          currentPeriodEnd: invoice.periodEnd,
          ...(invoice.enabledModules != null
            ? {
                enabledModules: invoice.enabledModules,
                billingBundle: invoice.billingBundle,
              }
            : {}),
        },
      });
    });

    return this.getStatus(invoice.schoolId);
  }

  private findCheckoutInvoice(txRef: string) {
    return this.prisma.platformInvoice.findFirst({
      where: {
        OR: [
          { paymentReference: txRef },
          { paymentReference: { startsWith: `${txRef}|` } },
        ],
      },
    });
  }

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await this.prisma.platformInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    let seq = 1;
    if (latest?.invoiceNumber) {
      const part = latest.invoiceNumber.slice(prefix.length);
      const n = Number.parseInt(part, 10);
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  private normalizeEthiopianPhone(
    phone: string | null | undefined,
  ): string | null {
    if (!phone?.trim()) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && /^0[79]/.test(digits)) return digits;
    if (digits.length === 12 && digits.startsWith('251')) {
      return `0${digits.slice(3)}`;
    }
    return null;
  }

  async activateFromPaidInvoice(
    schoolId: string,
    plan: Plan | null,
    periodEnd: Date,
    modules?: { enabledModules?: unknown; billingBundle?: string | null },
  ) {
    if (!plan || plan === Plan.TRIAL) return;
    await this.prisma.subscription.update({
      where: { schoolId },
      data: {
        plan,
        isActive: true,
        trialEndsAt: null,
        currentPeriodEnd: periodEnd,
        ...(modules?.enabledModules != null
          ? {
              enabledModules: modules.enabledModules,
              billingBundle: modules.billingBundle ?? null,
            }
          : {}),
      },
    });
    try {
      await this.email?.notifySchoolAdmins({
        schoolId,
        category: 'subscription_activation',
        templateId: 'subscription_activation',
        idempotencyPrefix: `subscription:${schoolId}:${plan}:${periodEnd.toISOString()}`,
        vars: {
          plan: String(plan),
          periodEnd: periodEnd.toISOString().slice(0, 10),
        },
      });
    } catch {
      // Subscription activation already succeeded.
    }
  }

  private applyPercentOff(amount: number, percentOff: number) {
    if (percentOff <= 0) return amount;
    return Math.max(0, Math.round(amount * (1 - percentOff / 100)));
  }

  async adminSetSchoolPlan(
    schoolId: string,
    data: { plan: Plan; isActive?: boolean; trialEndsAt?: string | null },
  ) {
    let sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    if (!sub) {
      sub = await this.ensureSubscription(schoolId, data.plan);
    }

    const trialEndsAt =
      data.trialEndsAt === undefined
        ? data.plan === Plan.TRIAL
          ? sub.trialEndsAt
          : null
        : data.trialEndsAt
          ? new Date(data.trialEndsAt)
          : null;

    return this.prisma.subscription.update({
      where: { schoolId },
      data: {
        plan: data.plan,
        isActive: data.isActive ?? true,
        trialEndsAt,
      },
    });
  }

  async listPlans() {
    const rows = await this.planCatalog.findListed();
    return rows.map((row) => ({
      plan: row.plan,
      students: row.students,
      teachers: row.teachers,
      admins: row.admins,
      label: row.label,
      description: row.description,
      usdMonthly: row.usdMonthly,
      etbMonthly: row.etbMonthly,
      features: row.features,
    }));
  }

  async getBillingOverview(schoolId: string) {
    const subscription = await this.getStatus(schoolId);
    const catalog = await this.planCatalog.findAll();
    const planRow = catalog.find((p) => p.plan === subscription.plan);

    const invoices = await this.prisma.platformInvoice.findMany({
      where: { schoolId },
      orderBy: { dueAt: 'asc' },
    });

    let outstandingUsd = 0;
    let outstandingEtb = 0;
    let openCount = 0;
    let nextDueAt: string | null = null;

    for (const inv of invoices) {
      if (
        inv.status === PlatformInvoiceStatus.SENT ||
        inv.status === PlatformInvoiceStatus.OVERDUE
      ) {
        openCount += 1;
        outstandingUsd += inv.amountUsd;
        outstandingEtb += inv.amountEtb;
        if (!nextDueAt || inv.dueAt < new Date(nextDueAt)) {
          nextDueAt = inv.dueAt.toISOString();
        }
      }
    }

    const openInvoices = invoices
      .filter(
        (inv) =>
          inv.status === PlatformInvoiceStatus.SENT ||
          inv.status === PlatformInvoiceStatus.OVERDUE,
      )
      .map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountUsd: inv.amountUsd,
        amountEtb: inv.amountEtb,
        dueAt: inv.dueAt.toISOString(),
      }));

    const paymentProofs = await this.prisma.platformPaymentProof.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { invoice: { select: { invoiceNumber: true } } },
    });

    return {
      subscription,
      planPrice: subscription.priceBreakdown
        ? {
            usdMonthly: subscription.priceBreakdown.totalUsd,
            etbMonthly: subscription.priceBreakdown.totalEtb,
            baseEtb: subscription.priceBreakdown.baseEtb,
            modulesEtb: subscription.priceBreakdown.modulesEtb,
            discountEtb: subscription.priceBreakdown.discountEtb,
          }
        : planRow
          ? {
              usdMonthly: planRow.usdMonthly,
              etbMonthly: planRow.etbMonthly,
            }
          : null,
      invoices: {
        total: invoices.length,
        openCount,
        outstandingUsd,
        outstandingEtb,
        nextDueAt,
      },
      openInvoices,
      paymentProofs: paymentProofs.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice.invoiceNumber,
        method: p.method,
        transactionId: p.transactionId,
        status: p.status,
        reviewNote: p.reviewNote,
        createdAt: p.createdAt.toISOString(),
        reviewedAt: p.reviewedAt?.toISOString() ?? null,
      })),
      payout: await this.getPlatformPayout(),
    };
  }

  async requestRenewalInvoice(schoolId: string, adminId?: string) {
    if (this.chapaService.isLiveEnabled()) {
      throw new BadRequestException(
        'Use subscription checkout to renew your plan.',
      );
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    if (!sub.isActive || sub.plan === Plan.TRIAL) {
      throw new BadRequestException(
        'Upgrade to a paid plan before requesting a renewal invoice.',
      );
    }

    const open = await this.prisma.platformInvoice.findFirst({
      where: {
        schoolId,
        status: {
          in: [PlatformInvoiceStatus.SENT, PlatformInvoiceStatus.OVERDUE],
        },
      },
    });
    if (open) {
      return {
        invoice: {
          id: open.id,
          invoiceNumber: open.invoiceNumber,
          amountUsd: open.amountUsd,
          amountEtb: open.amountEtb,
          dueAt: open.dueAt.toISOString(),
        },
        message: `Invoice ${open.invoiceNumber} is already open.`,
        created: false,
      };
    }

    const status = await this.getStatus(schoolId);
    const breakdown = status.priceBreakdown;
    if (!breakdown || breakdown.totalEtb <= 0) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const percentOff = await this.coupons.discountForSchool(schoolId);
    const amountEtb = this.applyPercentOff(breakdown.totalEtb, percentOff);
    const amountUsd = this.applyPercentOff(breakdown.totalUsd, percentOff);

    if (percentOff >= 100 || amountEtb <= 0) {
      throw new BadRequestException(
        'Your coupon covers this plan — no invoice is needed.',
      );
    }

    const now = new Date();
    const periodStart = sub.currentPeriodEnd ?? now;
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 14);
    const invoiceNumber = await this.nextInvoiceNumber();

    const invoice = await this.prisma.platformInvoice.create({
      data: {
        schoolId,
        invoiceNumber,
        plan: sub.plan,
        periodStart,
        periodEnd,
        dueAt,
        amountUsd,
        amountEtb,
        currency: BillingCurrency.ETB,
        status: PlatformInvoiceStatus.SENT,
        billingInterval: 'month',
        initiatedBy: adminId ?? null,
        enabledModules: status.enabledModules,
        billingBundle: status.billingBundle,
        notes: `${status.planLabel} modular renewal`,
      },
    });

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountUsd: invoice.amountUsd,
        amountEtb: invoice.amountEtb,
        dueAt: invoice.dueAt.toISOString(),
      },
      message: `Invoice ${invoiceNumber} created. Pay ${amountEtb.toLocaleString()} ETB and submit your receipt below.`,
      created: true,
    };
  }

  async listInvoicesForSchool(schoolId: string) {
    const rows = await this.prisma.platformInvoice.findMany({
      where: { schoolId },
      orderBy: { issuedAt: 'desc' },
    });

    return rows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      plan: inv.plan,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      amountUsd: inv.amountUsd,
      amountEtb: inv.amountEtb,
      currency: inv.currency,
      status: inv.status,
      issuedAt: inv.issuedAt.toISOString(),
      dueAt: inv.dueAt.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes,
    }));
  }

  async submitPlatformPaymentProof(
    schoolId: string,
    userId: string,
    invoiceId: string,
    dto: SubmitPlatformPaymentDto,
  ) {
    const invoice = await this.prisma.platformInvoice.findFirst({
      where: { id: invoiceId, schoolId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === PlatformInvoiceStatus.PAID) {
      throw new BadRequestException('This invoice is already paid');
    }
    if (
      invoice.status !== PlatformInvoiceStatus.SENT &&
      invoice.status !== PlatformInvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException('This invoice is not open for payment');
    }

    const payout = await this.getPlatformPayout();
    if (dto.method === 'TELEBIRR' && !payout.telebirr) {
      throw new BadRequestException('Telebirr is not available yet');
    }
    if (dto.method === 'BANK_TRANSFER' && !payout.bank) {
      throw new BadRequestException('Bank transfer is not available yet');
    }

    const pending = await this.prisma.platformPaymentProof.findFirst({
      where: {
        invoiceId,
        status: PlatformPaymentProofStatus.PENDING,
      },
    });
    if (pending) {
      throw new BadRequestException(
        'A payment is already under review for this invoice.',
      );
    }

    const proof = await this.prisma.platformPaymentProof.create({
      data: {
        invoiceId,
        schoolId,
        method: dto.method,
        transactionId: dto.transactionId.trim(),
        proofUrl: dto.proofUrl.trim(),
        submittedById: userId,
      },
    });

    return {
      id: proof.id,
      status: proof.status,
      message:
        'Payment submitted. Chora will verify your receipt and confirm your invoice.',
    };
  }

  async listPlatformPaymentProofs(schoolId: string) {
    const rows = await this.prisma.platformPaymentProof.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { invoice: { select: { invoiceNumber: true } } },
    });

    return rows.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      method: p.method,
      transactionId: p.transactionId,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    }));
  }

  async listPlatformPaymentProofsForReview(
    status?: PlatformPaymentProofStatus,
  ) {
    const rows = await this.prisma.platformPaymentProof.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        invoice: {
          select: { invoiceNumber: true, amountEtb: true, amountUsd: true },
        },
        school: { select: { name: true, joinCode: true } },
      },
    });

    return rows.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      amountEtb: p.invoice.amountEtb,
      amountUsd: p.invoice.amountUsd,
      schoolId: p.schoolId,
      schoolName: p.school.name,
      joinCode: p.school.joinCode,
      method: p.method,
      transactionId: p.transactionId,
      proofUrl: p.proofUrl,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    }));
  }

  async reviewPlatformPaymentProof(
    proofId: string,
    dto: ReviewPlatformPaymentDto,
  ) {
    const proof = await this.prisma.platformPaymentProof.findUnique({
      where: { id: proofId },
      include: { invoice: true },
    });
    if (!proof) {
      throw new NotFoundException('Payment proof not found');
    }
    if (proof.status !== PlatformPaymentProofStatus.PENDING) {
      throw new BadRequestException('This payment has already been reviewed');
    }

    const now = new Date();
    if (dto.status === 'REJECTED') {
      const updated = await this.prisma.platformPaymentProof.update({
        where: { id: proofId },
        data: {
          status: PlatformPaymentProofStatus.REJECTED,
          reviewNote: dto.reviewNote?.trim() || null,
          reviewedAt: now,
        },
      });
      return {
        id: updated.id,
        status: updated.status,
        message: 'Payment rejected. The school can submit again.',
      };
    }

    const invoice = proof.invoice;
    if (!invoice.plan) {
      throw new BadRequestException('Invoice has no plan attached');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformPaymentProof.update({
        where: { id: proofId },
        data: {
          status: PlatformPaymentProofStatus.CONFIRMED,
          reviewNote: dto.reviewNote?.trim() || null,
          reviewedAt: now,
        },
      });
      await tx.platformInvoice.update({
        where: { id: invoice.id },
        data: {
          status: PlatformInvoiceStatus.PAID,
          paidAt: now,
          paymentReference: proof.transactionId,
        },
      });
      await tx.subscription.update({
        where: { schoolId: invoice.schoolId },
        data: {
          plan: invoice.plan!,
          isActive: true,
          trialEndsAt: null,
          currentPeriodEnd: invoice.periodEnd,
          ...(invoice.enabledModules != null
            ? {
                enabledModules: invoice.enabledModules,
                billingBundle: invoice.billingBundle,
              }
            : {}),
        },
      });
    });

    return {
      id: proofId,
      status: PlatformPaymentProofStatus.CONFIRMED,
      message: 'Payment confirmed and invoice marked paid.',
    };
  }

  private async countUsersByRole(schoolId: string) {
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { schoolId },
      _count: { _all: true },
    });

    const map = Object.fromEntries(
      counts.map((c) => [c.role, c._count._all]),
    ) as Record<string, number>;

    return {
      students: map.student ?? 0,
      teachers: map.teacher ?? 0,
      admins: map.admin ?? 0,
    };
  }
}
