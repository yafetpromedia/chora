import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  AttendanceConcernStatus,
  Plan,
  PlatformPaymentProofStatus,
  PlatformRole,
  SchoolStatus,
  SupportTicketStatus,
  UserRole,
} from '@prisma/client';
import { CurriculumCatalogService } from '../provisioning/curriculum-catalog.service';
import { SchoolProvisioningService } from '../provisioning/school-provisioning.service';
import { DEFAULT_CURRICULUM_PACKAGE_KEY } from '../provisioning/curriculum-packages.data';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsService } from '../schools/schools.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { PlanCatalogService } from '../subscriptions/plan-catalog.service';
import { EmailService } from '../email/email.service';
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
    private readonly curriculumCatalog: CurriculumCatalogService,
    private readonly provisioning: SchoolProvisioningService,
    @Optional() private readonly email?: EmailService,
  ) {}

  listCurriculumPackages() {
    return this.curriculumCatalog.listPackages();
  }

  getCurriculumPackage(key: string) {
    return this.curriculumCatalog.getPackageByKey(key);
  }

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
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
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
      openConcernCount,
      pendingPaymentProofs,
      openSupportTickets,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { status: SchoolStatus.ACTIVE } }),
      this.prisma.school.count({ where: { status: SchoolStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { role: UserRole.student } }),
      this.prisma.user.count({ where: { role: UserRole.teacher } }),
      this.prisma.subscription.findMany({
        include: { school: { select: { name: true } } },
      }),
      this.prisma.attendanceConcern.count({
        where: {
          status: {
            in: [
              AttendanceConcernStatus.OPEN,
              AttendanceConcernStatus.UNDER_REVIEW,
            ],
          },
        },
      }),
      this.prisma.platformPaymentProof.count({
        where: { status: PlatformPaymentProofStatus.PENDING },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: {
            in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS],
          },
        },
      }),
    ]);

    const trialSchools = subscriptions.filter(
      (s) => s.plan === Plan.TRIAL,
    ).length;
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
      alerts: {
        openAttendanceConcerns: openConcernCount,
        pendingPaymentProofs,
        openSupportTickets,
      },
    };
  }

  /** Cross-tenant open attendance concerns for platform ops visibility. */
  async getAttendanceConcernSummary() {
    const openStatuses = [
      AttendanceConcernStatus.OPEN,
      AttendanceConcernStatus.UNDER_REVIEW,
    ];
    const [grouped, recent] = await Promise.all([
      this.prisma.attendanceConcern.groupBy({
        by: ['schoolId'],
        where: { status: { in: openStatuses } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      this.prisma.attendanceConcern.findMany({
        where: { status: { in: openStatuses } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          schoolId: true,
          status: true,
          concernType: true,
          description: true,
          createdAt: true,
          date: true,
          subjectNameSnapshot: true,
          periodLabel: true,
          school: { select: { name: true, joinCode: true } },
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
      }),
    ]);

    const schoolIds = grouped.map((g) => g.schoolId);
    const schools = schoolIds.length
      ? await this.prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, name: true, joinCode: true },
        })
      : [];
    const schoolMap = new Map(schools.map((s) => [s.id, s]));

    return {
      totalOpen: grouped.reduce((sum, g) => sum + g._count._all, 0),
      bySchool: grouped
        .map((g) => {
          const school = schoolMap.get(g.schoolId);
          return {
            schoolId: g.schoolId,
            schoolName: school?.name ?? 'Unknown school',
            joinCode: school?.joinCode ?? '',
            openCount: g._count._all,
            latestAt: g._max.createdAt?.toISOString() ?? null,
          };
        })
        .sort((a, b) => b.openCount - a.openCount),
      recent: recent.map((row) => ({
        id: row.id,
        schoolId: row.schoolId,
        schoolName: row.school.name,
        joinCode: row.school.joinCode,
        status: row.status,
        concernType: row.concernType,
        description: row.description,
        subjectName: row.subjectNameSnapshot,
        periodLabel: row.periodLabel,
        classLabel: [row.grade.name, row.section?.name]
          .filter(Boolean)
          .join(' · '),
        date: row.date.toISOString().slice(0, 10),
        createdAt: row.createdAt.toISOString(),
      })),
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
        logoUrl: s.logoUrl,
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
        logoUrl: school.logoUrl,
        joinCode: school.joinCode,
        status: school.status,
        email: school.email,
        phone: school.phone,
        country: school.country,
        setupComplete: school.setupComplete,
        curriculumPackageKey: school.curriculumPackageKey,
        gradePreset: school.gradePreset,
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
    const statusLabel =
      status === SchoolStatus.ACTIVE
        ? 'Active'
        : status === SchoolStatus.SUSPENDED
          ? 'Suspended'
          : 'Trial';
    const message =
      status === SchoolStatus.ACTIVE
        ? `${school.name} is active on Chora.`
        : status === SchoolStatus.SUSPENDED
          ? `${school.name} is suspended on Chora. Sign-in for this school is paused.`
          : `${school.name} is on a Chora trial.`;
    try {
      await this.email?.notifySchoolAdmins({
        schoolId,
        category: 'school_decision',
        templateId: 'school_decision',
        idempotencyPrefix: `school-status:${schoolId}:${status}:${new Date().toISOString().slice(0, 13)}`,
        vars: { statusLabel, message, schoolName: school.name },
      });
    } catch {
      // Status change already succeeded.
    }
    return school;
  }

  async deleteTenantSchool(schoolId: string, role: PlatformRole) {
    if (role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can remove tenants');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.announcement.deleteMany({ where: { schoolId } });
      await tx.user.deleteMany({ where: { schoolId } });
      await tx.school.delete({ where: { id: schoolId } });
    });

    return { removed: true, id: schoolId, name: school.name };
  }

  async createTenantSchool(dto: CreateTenantSchoolDto) {
    const school = await this.schoolsService.createSchool({
      name: dto.schoolName,
      country: dto.country,
      schoolType: dto.schoolType,
      curriculumPackageKey:
        dto.curriculumPackageKey?.trim() || DEFAULT_CURRICULUM_PACKAGE_KEY,
      gradePreset: dto.gradePreset,
    });

    await this.prisma.school.update({
      where: { id: school.id },
      data: { status: SchoolStatus.TRIAL },
    });

    const adminUsername =
      dto.adminEmail
        .split('@')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || 'admin';
    const admin = await this.usersService.createUser({
      username: adminUsername,
      email: dto.adminEmail,
      password: dto.adminPassword,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: 'admin',
      schoolId: school.id,
      schoolJoinCode: school.joinCode,
    });
    const actionUrl =
      process.env.WEB_APP_URL?.replace(/\/$/, '') ?? '';
    await this.email?.enqueueSafe({
      to: admin.email,
      category: 'welcome',
      templateId: 'welcome',
      schoolId: school.id,
      idempotencyKey: `welcome:${admin.id}`,
      vars: { firstName: admin.firstName, schoolName: school.name, actionUrl },
    });
    await this.email?.enqueueSafe({
      to: admin.email,
      category: 'trial_activation',
      templateId: 'trial_activation',
      schoolId: school.id,
      idempotencyKey: `trial:${school.id}`,
      vars: { firstName: admin.firstName, schoolName: school.name, actionUrl },
    });

    return {
      school: {
        id: school.id,
        name: school.name,
        joinCode: school.joinCode,
        status: SchoolStatus.TRIAL,
        setupComplete: school.setupComplete,
        curriculumPackageKey: school.curriculumPackageKey,
      },
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  reprovisionSchool(schoolId: string, curriculumPackageKey: string) {
    return this.provisioning.reprovisionSchool(schoolId, curriculumPackageKey);
  }
}
