import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingCurrency,
  Plan,
  PlatformInvoiceStatus,
  UserRole,
} from '@prisma/client';
import { ChapaService } from '../payments/chapa.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanCatalogService } from './plan-catalog.service';
import { UPGRADE_PLANS } from './plan-limits';

const YEARLY_BILLING_MULTIPLIER = 10;

export type SubscriptionStatus = {
  plan: Plan;
  isActive: boolean;
  trialEndsAt: string | null;
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
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planCatalog: PlanCatalogService,
    private readonly chapaService: ChapaService,
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

    if (trialExpired && sub.isActive) {
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
    }

    return {
      plan: sub.plan,
      isActive: sub.isActive,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      daysRemaining,
      expired: trialExpired || !sub.isActive,
      limits: {
        students: limits.students,
        teachers: limits.teachers,
        admins: limits.admins,
      },
      usage,
      planLabel: limits.label,
      planDescription: limits.description,
    };
  }

  async assertActive(schoolId: string) {
    const status = await this.getStatus(schoolId);
    if (!status.isActive || status.expired) {
      throw new ForbiddenException(
        'Your Chora trial has ended. Upgrade to continue managing your school.',
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
        throw new ForbiddenException('Only one school administrator is allowed on the trial.');
      }
    }

    return status;
  }

  getPaymentConfig() {
    return {
      chapaEnabled: this.chapaService.isConfigured(),
      currency: 'ETB' as const,
      provider: 'chapa' as const,
    };
  }

  async upgradePlan(schoolId: string, plan: Plan) {
    if (!UPGRADE_PLANS.includes(plan)) {
      throw new ForbiddenException('Invalid upgrade plan');
    }

    if (this.chapaService.isConfigured()) {
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

    return this.prisma.subscription.update({
      where: { schoolId },
      data: {
        plan,
        isActive: true,
        trialEndsAt: null,
      },
    });
  }

  async initializePlanCheckout(
    schoolId: string,
    adminId: string,
    plan: Plan,
    interval: 'month' | 'year',
  ) {
    if (!this.chapaService.isConfigured()) {
      throw new BadRequestException('Chapa payments are not configured');
    }
    if (!UPGRADE_PLANS.includes(plan)) {
      throw new ForbiddenException('Invalid plan for checkout');
    }

    const status = await this.getStatus(schoolId);
    if (status.plan === plan) {
      throw new BadRequestException('You are already on this plan');
    }

    const catalog = await this.planCatalog.findAll();
    const planRow = catalog.find((p) => p.plan === plan);
    if (!planRow || planRow.etbMonthly <= 0) {
      throw new BadRequestException('Plan pricing is not available');
    }

    const factor = interval === 'year' ? YEARLY_BILLING_MULTIPLIER : 1;
    const amountEtb = planRow.etbMonthly * factor;
    const amountUsd = planRow.usdMonthly * factor;

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
        notes: `Chora ${planRow.label} plan (${interval}ly)`,
      },
    });

    const webAppUrl = process.env.WEB_APP_URL?.trim() || 'http://localhost:3000';
    const apiUrl = process.env.API_PUBLIC_URL?.trim() || 'http://localhost:3001';
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

  private normalizeEthiopianPhone(phone: string | null | undefined): string | null {
    if (!phone?.trim()) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && /^0[79]/.test(digits)) return digits;
    if (digits.length === 12 && digits.startsWith('251')) {
      return `0${digits.slice(3)}`;
    }
    return null;
  }

  async adminSetSchoolPlan(
    schoolId: string,
    data: { plan: Plan; isActive?: boolean; trialEndsAt?: string | null },
  ) {
    let sub = await this.prisma.subscription.findUnique({ where: { schoolId } });
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

    return {
      subscription,
      planPrice: planRow
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
      currency: inv.currency as BillingCurrency,
      status: inv.status,
      issuedAt: inv.issuedAt.toISOString(),
      dueAt: inv.dueAt.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes,
    }));
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
