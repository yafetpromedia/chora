import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan, SchoolStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsService } from '../schools/schools.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { PlanCatalogService } from '../subscriptions/plan-catalog.service';
import { CreateTenantSchoolDto } from './dto/create-tenant-school.dto';
import type { UpdatePlanCatalogDto } from './dto/update-plan-catalog.dto';
import type { UpdateSchoolPlanDto } from './dto/update-plan-catalog.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolsService: SchoolsService,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly planCatalogService: PlanCatalogService,
  ) {}

  listPlanCatalog() {
    return this.planCatalogService.findAll();
  }

  updatePlanCatalog(planKey: string, dto: UpdatePlanCatalogDto) {
    const plan = planKey as Plan;
    if (!Object.values(Plan).includes(plan)) {
      throw new NotFoundException('Invalid plan');
    }
    return this.planCatalogService.update(plan, {
      label: dto.label,
      description: dto.description,
      studentsLimit: dto.studentsLimit,
      teachersLimit: dto.teachersLimit,
      adminsLimit: dto.adminsLimit,
      usdMonthly: dto.usdMonthly,
      etbMonthly: dto.etbMonthly,
      features: dto.features,
      trialDays: dto.trialDays,
      sortOrder: dto.sortOrder,
      isListed: dto.isListed,
    });
  }

  async updateSchoolPlan(schoolId: string, dto: UpdateSchoolPlanDto) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const sub = await this.subscriptionsService.adminSetSchoolPlan(schoolId, {
      plan: dto.plan,
      isActive: dto.isActive,
      trialEndsAt: dto.trialEndsAt,
    });

    return {
      schoolId,
      subscription: {
        plan: sub.plan,
        isActive: sub.isActive,
        trialEndsAt: sub.trialEndsAt,
      },
    };
  }

  async getDashboard() {
    const [
      schoolCount,
      activeSchools,
      suspendedSchools,
      studentCount,
      teacherCount,
      subscriptions,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { status: SchoolStatus.ACTIVE } }),
      this.prisma.school.count({ where: { status: SchoolStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { role: UserRole.student } }),
      this.prisma.user.count({ where: { role: UserRole.teacher } }),
      this.prisma.subscription.findMany({
        include: { school: { select: { name: true } } },
      }),
    ]);

    const trialSchools = subscriptions.filter((s) => s.plan === Plan.TRIAL).length;
    const paidSchools = subscriptions.filter(
      (s) => s.plan !== Plan.TRIAL && s.isActive,
    ).length;

    return {
      schools: {
        total: schoolCount,
        active: activeSchools,
        suspended: suspendedSchools,
        trial: trialSchools,
        paid: paidSchools,
      },
      users: {
        students: studentCount,
        teachers: teacherCount,
      },
    };
  }

  async listSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        _count: {
          select: {
            grades: true,
          },
        },
      },
    });

    const usage = await this.prisma.user.groupBy({
      by: ['schoolId', 'role'],
      _count: { _all: true },
    });

    const usageMap = new Map<string, Record<string, number>>();
    for (const row of usage) {
      const bucket = usageMap.get(row.schoolId) ?? {};
      bucket[row.role] = row._count._all;
      usageMap.set(row.schoolId, bucket);
    }

    return schools.map((s) => {
      const counts = usageMap.get(s.id) ?? {};
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        joinCode: s.joinCode,
        status: s.status,
        createdAt: s.createdAt,
        subscription: s.subscription
          ? {
              plan: s.subscription.plan,
              isActive: s.subscription.isActive,
              trialEndsAt: s.subscription.trialEndsAt,
            }
          : null,
        usage: {
          students: counts.student ?? 0,
          teachers: counts.teacher ?? 0,
          admins: counts.admin ?? 0,
          parents: counts.parent ?? 0,
        },
        gradeCount: s._count.grades,
      };
    });
  }

  async getSchoolDetail(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const [users, studentProfiles, announcements] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: { schoolId },
        _count: { _all: true },
      }),
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.announcement.count({ where: { schoolId } }),
    ]);

    const usage = Object.fromEntries(
      users.map((u) => [u.role, u._count._all]),
    ) as Record<string, number>;

    return {
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        joinCode: school.joinCode,
        status: school.status,
        email: school.email,
        phone: school.phone,
        country: school.country,
        setupComplete: school.setupComplete,
        createdAt: school.createdAt,
      },
      subscription: school.subscription,
      usage: {
        ...usage,
        studentProfiles,
      },
      announcements,
    };
  }

  async updateSchoolStatus(schoolId: string, status: SchoolStatus) {
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: { status },
      select: { id: true, name: true, status: true },
    });
    return school;
  }

  async createTenantSchool(dto: CreateTenantSchoolDto) {
    const school = await this.schoolsService.createSchool({
      name: dto.schoolName,
      country: dto.country,
    });

    await this.prisma.school.update({
      where: { id: school.id },
      data: { status: SchoolStatus.TRIAL },
    });

    const admin = await this.usersService.createUser({
      email: dto.adminEmail,
      password: dto.adminPassword,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: 'admin',
      schoolId: school.id,
    });

    return {
      school: {
        id: school.id,
        name: school.name,
        joinCode: school.joinCode,
        status: SchoolStatus.TRIAL,
      },
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }
}
