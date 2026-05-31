import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PLAN_CATALOG, type PlanCatalogRow } from './plan-catalog.defaults';
import type { PlanLimits } from './plan-limits';

export type PlanCatalogDto = {
  plan: Plan;
  label: string;
  description: string;
  students: number | null;
  teachers: number | null;
  admins: number | null;
  usdMonthly: number;
  etbMonthly: number;
  features: string[];
  trialDays: number | null;
  sortOrder: number;
  isListed: boolean;
};

@Injectable()
export class PlanCatalogService implements OnModuleInit {
  private cache: PlanCatalogDto[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureSeeded();
  }

  async ensureSeeded() {
    const count = await this.prisma.planCatalog.count();
    if (count > 0) return;
    for (const row of DEFAULT_PLAN_CATALOG) {
      await this.prisma.planCatalog.create({ data: this.toCreate(row) });
    }
    this.cache = null;
  }

  async findAll(): Promise<PlanCatalogDto[]> {
    if (this.cache) return this.cache;
    await this.ensureSeeded();
    const rows = await this.prisma.planCatalog.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    this.cache = rows.map((r) => this.toDto(r));
    return this.cache;
  }

  async findListed(): Promise<PlanCatalogDto[]> {
    const all = await this.findAll();
    return all.filter((p) => p.isListed && p.plan !== Plan.TRIAL);
  }

  async getLimits(plan: Plan): Promise<PlanLimits> {
    const row = (await this.findAll()).find((p) => p.plan === plan);
    if (!row) {
      const fallback = DEFAULT_PLAN_CATALOG.find((p) => p.plan === plan);
      if (!fallback) throw new NotFoundException('Plan not found');
      return this.rowToLimits(fallback);
    }
    return this.dtoToLimits(row);
  }

  async getTrialDays(): Promise<number> {
    const trial = (await this.findAll()).find((p) => p.plan === Plan.TRIAL);
    return trial?.trialDays ?? 14;
  }

  async update(plan: Plan, data: Partial<PlanCatalogRow>): Promise<PlanCatalogDto> {
    const existing = await this.prisma.planCatalog.findUnique({ where: { plan } });
    if (!existing) throw new NotFoundException('Plan not found');

    const patch: Record<string, unknown> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.description !== undefined) patch.description = data.description;
    if (data.studentsLimit !== undefined) patch.studentsLimit = data.studentsLimit;
    if (data.teachersLimit !== undefined) patch.teachersLimit = data.teachersLimit;
    if (data.adminsLimit !== undefined) patch.adminsLimit = data.adminsLimit;
    if (data.usdMonthly !== undefined) patch.usdMonthly = data.usdMonthly;
    if (data.etbMonthly !== undefined) patch.etbMonthly = data.etbMonthly;
    if (data.features !== undefined) patch.features = data.features;
    if (data.trialDays !== undefined) patch.trialDays = data.trialDays;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.isListed !== undefined) patch.isListed = data.isListed;

    const updated = await this.prisma.planCatalog.update({
      where: { plan },
      data: patch,
    });
    this.cache = null;
    return this.toDto(updated);
  }

  private toCreate(row: PlanCatalogRow) {
    return {
      plan: row.plan,
      label: row.label,
      description: row.description,
      studentsLimit: row.studentsLimit,
      teachersLimit: row.teachersLimit,
      adminsLimit: row.adminsLimit,
      usdMonthly: row.usdMonthly,
      etbMonthly: row.etbMonthly,
      features: row.features,
      trialDays: row.trialDays,
      sortOrder: row.sortOrder,
      isListed: row.isListed,
    };
  }

  private toDto(row: {
    plan: Plan;
    label: string;
    description: string;
    studentsLimit: number | null;
    teachersLimit: number | null;
    adminsLimit: number | null;
    usdMonthly: number;
    etbMonthly: number;
    features: unknown;
    trialDays: number | null;
    sortOrder: number;
    isListed: boolean;
  }): PlanCatalogDto {
    return {
      plan: row.plan,
      label: row.label,
      description: row.description,
      students: row.studentsLimit,
      teachers: row.teachersLimit,
      admins: row.adminsLimit,
      usdMonthly: row.usdMonthly,
      etbMonthly: row.etbMonthly,
      features: Array.isArray(row.features)
        ? (row.features as string[])
        : [],
      trialDays: row.trialDays,
      sortOrder: row.sortOrder,
      isListed: row.isListed,
    };
  }

  private dtoToLimits(row: PlanCatalogDto): PlanLimits {
    return {
      students: row.students,
      teachers: row.teachers,
      admins: row.admins,
      label: row.label,
      description: row.description,
    };
  }

  private rowToLimits(row: PlanCatalogRow): PlanLimits {
    return {
      students: row.studentsLimit,
      teachers: row.teachersLimit,
      admins: row.adminsLimit,
      label: row.label,
      description: row.description,
    };
  }
}
