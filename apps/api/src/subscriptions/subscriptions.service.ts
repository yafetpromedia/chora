import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Plan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, TRIAL_DAYS, UPGRADE_PLANS } from './plan-limits';

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
  constructor(private readonly prisma: PrismaService) {}

  async createTrial(schoolId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

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
    return this.prisma.subscription.create({
      data: {
        schoolId,
        plan,
        isActive: true,
        trialEndsAt: plan === Plan.TRIAL ? this.trialEndDate() : null,
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
    const limits = PLAN_LIMITS[sub.plan];

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
        'Your CampusOne trial has ended. Upgrade to continue managing your school.',
      );
    }
    return status;
  }

  async assertCanAddUser(schoolId: string, role: UserRole) {
    const status = await this.assertActive(schoolId);
    const limits = PLAN_LIMITS[status.plan];

    if (role === 'student' && limits.students !== null) {
      if (status.usage.students >= limits.students) {
        throw new ForbiddenException(
          status.plan === Plan.TRIAL
            ? `Trial limit reached (${limits.students} students). Upgrade your plan to add more.`
            : `Student limit reached for your ${limits.label} plan.`,
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

  async upgradePlan(schoolId: string, plan: Plan) {
    if (!UPGRADE_PLANS.includes(plan)) {
      throw new ForbiddenException('Invalid upgrade plan');
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

  listPlans() {
    return UPGRADE_PLANS.map((plan) => ({
      plan,
      ...PLAN_LIMITS[plan],
    }));
  }

  private trialEndDate() {
    const d = new Date();
    d.setDate(d.getDate() + TRIAL_DAYS);
    return d;
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
