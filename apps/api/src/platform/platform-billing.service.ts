import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BillingCurrency,
  Plan,
  PlatformInvoiceStatus,
  PlatformPaymentProofStatus,
  SchoolStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanCatalogService } from '../subscriptions/plan-catalog.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import type { CreatePlatformInvoiceDto } from './dto/platform-invoice.dto';
import type { UpdatePlatformInvoiceDto } from './dto/platform-invoice.dto';
import type { ReviewPlatformPaymentDto } from '../subscriptions/dto/platform-payment.dto';

export type BillingSummaryDto = {
  mrrUsd: number;
  mrrEtb: number;
  paidSchools: number;
  trialSchools: number;
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    outstandingUsd: number;
    outstandingEtb: number;
  };
};

export type PlatformUsageRowDto = {
  schoolId: string;
  schoolName: string;
  joinCode: string;
  status: SchoolStatus;
  plan: Plan;
  billingActive: boolean;
  limits: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  usage: {
    students: number;
    teachers: number;
    admins: number;
    parents: number;
  };
  utilization: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  overLimit: {
    students: boolean;
    teachers: boolean;
    admins: boolean;
  };
};

@Injectable()
export class PlatformBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planCatalog: PlanCatalogService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async getBillingSummary(): Promise<BillingSummaryDto> {
    const [catalog, subscriptions, invoiceGroups] = await Promise.all([
      this.planCatalog.findAll(),
      this.prisma.subscription.findMany({
        where: { isActive: true, plan: { not: Plan.TRIAL } },
      }),
      this.prisma.platformInvoice.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amountUsd: true, amountEtb: true },
      }),
    ]);

    const priceByPlan = new Map(catalog.map((p) => [p.plan, p]));
    let mrrUsd = 0;
    let mrrEtb = 0;
    for (const sub of subscriptions) {
      const row = priceByPlan.get(sub.plan);
      if (row) {
        mrrUsd += row.usdMonthly;
        mrrEtb += row.etbMonthly;
      }
    }

    const allSubs = await this.prisma.subscription.findMany();
    const trialSchools = allSubs.filter((s) => s.plan === Plan.TRIAL).length;

    const counts = {
      total: 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    };
    let outstandingUsd = 0;
    let outstandingEtb = 0;

    for (const g of invoiceGroups) {
      const n = g._count._all;
      counts.total += n;
      if (g.status === PlatformInvoiceStatus.DRAFT) counts.draft = n;
      if (g.status === PlatformInvoiceStatus.SENT) counts.sent = n;
      if (g.status === PlatformInvoiceStatus.PAID) counts.paid = n;
      if (g.status === PlatformInvoiceStatus.OVERDUE) counts.overdue = n;
      if (
        g.status === PlatformInvoiceStatus.SENT ||
        g.status === PlatformInvoiceStatus.OVERDUE
      ) {
        outstandingUsd += g._sum.amountUsd ?? 0;
        outstandingEtb += g._sum.amountEtb ?? 0;
      }
    }

    return {
      mrrUsd,
      mrrEtb,
      paidSchools: subscriptions.length,
      trialSchools,
      invoices: {
        ...counts,
        outstandingUsd,
        outstandingEtb,
      },
    };
  }

  async listUsage(): Promise<PlatformUsageRowDto[]> {
    const [schools, usageRows, catalog] = await Promise.all([
      this.prisma.school.findMany({
        orderBy: { name: 'asc' },
        include: { subscription: true },
      }),
      this.prisma.user.groupBy({
        by: ['schoolId', 'role'],
        _count: { _all: true },
      }),
      this.planCatalog.findAll(),
    ]);

    const usageMap = new Map<string, Record<string, number>>();
    for (const row of usageRows) {
      const bucket = usageMap.get(row.schoolId) ?? {};
      bucket[row.role] = row._count._all;
      usageMap.set(row.schoolId, bucket);
    }

    const limitsByPlan = new Map(
      catalog.map((p) => [
        p.plan,
        {
          students: p.students,
          teachers: p.teachers,
          admins: p.admins,
        },
      ]),
    );

    return schools.map((s) => {
      const counts = usageMap.get(s.id) ?? {};
      const plan = s.subscription?.plan ?? Plan.TRIAL;
      const limits = limitsByPlan.get(plan) ?? {
        students: null,
        teachers: null,
        admins: null,
      };
      const usage = {
        students: counts.student ?? 0,
        teachers: counts.teacher ?? 0,
        admins: counts.admin ?? 0,
        parents: counts.parent ?? 0,
      };

      const pct = (used: number, cap: number | null) =>
        cap == null || cap <= 0 ? null : Math.min(1, used / cap);

      const over = (used: number, cap: number | null) =>
        cap != null && cap > 0 && used > cap;

      return {
        schoolId: s.id,
        schoolName: s.name,
        joinCode: s.joinCode,
        status: s.status,
        plan,
        billingActive: s.subscription?.isActive ?? false,
        limits,
        usage,
        utilization: {
          students: pct(usage.students, limits.students),
          teachers: pct(usage.teachers, limits.teachers),
          admins: pct(usage.admins, limits.admins),
        },
        overLimit: {
          students: over(usage.students, limits.students),
          teachers: over(usage.teachers, limits.teachers),
          admins: over(usage.admins, limits.admins),
        },
      };
    });
  }

  async listInvoices(filters?: { schoolId?: string; status?: PlatformInvoiceStatus }) {
    const rows = await this.prisma.platformInvoice.findMany({
      where: {
        schoolId: filters?.schoolId,
        status: filters?.status,
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, joinCode: true } },
      },
    });
    return rows.map((inv) => this.toInvoiceDto(inv));
  }

  async createInvoice(dto: CreatePlatformInvoiceDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
      include: { subscription: true },
    });
    if (!school) throw new NotFoundException('School not found');

    const plan =
      dto.plan ?? school.subscription?.plan ?? Plan.STARTER;
    const catalogRow = (await this.planCatalog.findAll()).find((p) => p.plan === plan);
    const amountUsd = dto.amountUsd ?? catalogRow?.usdMonthly ?? 0;
    const amountEtb = dto.amountEtb ?? catalogRow?.etbMonthly ?? 0;
    const settings = await this.platformSettings.getSettings();
    const currency = dto.currency ?? settings.defaultBillingCurrency;

    const invoiceNumber = await this.nextInvoiceNumber(settings.invoicePrefix);

    const created = await this.prisma.platformInvoice.create({
      data: {
        schoolId: dto.schoolId,
        invoiceNumber,
        plan,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        dueAt: new Date(dto.dueAt),
        amountUsd,
        amountEtb,
        currency,
        notes: dto.notes?.trim() || null,
        status: PlatformInvoiceStatus.DRAFT,
      },
      include: {
        school: { select: { id: true, name: true, joinCode: true } },
      },
    });

    return this.toInvoiceDto(created);
  }

  async updateInvoice(id: string, dto: UpdatePlatformInvoiceDto) {
    const existing = await this.prisma.platformInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Invoice not found');

    const status = dto.status ?? existing.status;
    let paidAt = existing.paidAt;
    if (dto.paidAt !== undefined) {
      paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    } else if (status === PlatformInvoiceStatus.PAID && !paidAt) {
      paidAt = new Date();
    }

    const updated = await this.prisma.platformInvoice.update({
      where: { id },
      data: {
        status,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        paidAt,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      },
      include: {
        school: { select: { id: true, name: true, joinCode: true } },
      },
    });

    if (
      status === PlatformInvoiceStatus.PAID &&
      existing.status !== PlatformInvoiceStatus.PAID
    ) {
      await this.subscriptions.activateFromPaidInvoice(
        updated.schoolId,
        updated.plan,
        updated.periodEnd,
        {
          enabledModules: updated.enabledModules,
          billingBundle: updated.billingBundle,
        },
      );
    }

    return this.toInvoiceDto(updated);
  }

  private async nextInvoiceNumber(prefixCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${prefixCode.trim().toUpperCase()}-${year}-`;
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

  private toInvoiceDto(
    inv: {
      id: string;
      schoolId: string;
      invoiceNumber: string;
      plan: Plan | null;
      periodStart: Date;
      periodEnd: Date;
      amountUsd: number;
      amountEtb: number;
      currency: BillingCurrency;
      status: PlatformInvoiceStatus;
      issuedAt: Date;
      dueAt: Date;
      paidAt: Date | null;
      notes: string | null;
      school: { id: string; name: string; joinCode: string };
    },
  ) {
    return {
      id: inv.id,
      schoolId: inv.schoolId,
      schoolName: inv.school.name,
      joinCode: inv.school.joinCode,
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
    };
  }

  listPaymentProofs(status?: PlatformPaymentProofStatus) {
    return this.subscriptions.listPlatformPaymentProofsForReview(status);
  }

  reviewPaymentProof(id: string, dto: ReviewPlatformPaymentDto) {
    return this.subscriptions.reviewPlatformPaymentProof(id, dto);
  }
}
