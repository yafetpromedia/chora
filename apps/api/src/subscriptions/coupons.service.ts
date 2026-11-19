import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponKind, Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(from: Date, days: number) {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  list() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { redemptions: true } },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            school: { select: { id: true, name: true, joinCode: true } },
          },
        },
      },
    });
  }

  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('That coupon code already exists');
    }
    if (dto.kind === CouponKind.PERCENT_OFF && (dto.percentOff ?? 0) <= 0) {
      throw new BadRequestException('Percent-off coupons need a percent between 1 and 100');
    }
    if (dto.kind === CouponKind.EXTRA_TRIAL_DAYS && (dto.extraDays ?? 0) <= 0) {
      throw new BadRequestException('Trial coupons need extra days');
    }
    if (dto.kind === CouponKind.COMPLIMENTARY && !dto.plan) {
      throw new BadRequestException('Complimentary coupons must grant a paid plan');
    }
    if (dto.plan === Plan.TRIAL) {
      throw new BadRequestException('Coupons cannot grant the trial plan');
    }

    return this.prisma.coupon.create({
      data: {
        code,
        kind: dto.kind,
        percentOff: dto.percentOff ?? (dto.kind === CouponKind.PERCENT_OFF ? 50 : 0),
        extraDays: dto.extraDays ?? (dto.kind === CouponKind.EXTRA_TRIAL_DAYS ? 14 : 0),
        complimentaryMonths: dto.complimentaryMonths ?? 1,
        plan: dto.plan ?? null,
        maxRedemptions: dto.maxRedemptions ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');
    if (dto.plan === Plan.TRIAL) {
      throw new BadRequestException('Coupons cannot grant the trial plan');
    }
    if (existing.kind === CouponKind.COMPLIMENTARY) {
      const nextPlan = dto.plan === undefined ? existing.plan : dto.plan;
      if (!nextPlan || nextPlan === Plan.TRIAL) {
        throw new BadRequestException('Complimentary coupons must grant a paid plan');
      }
    }
    if (
      existing.kind === CouponKind.PERCENT_OFF &&
      dto.percentOff !== undefined &&
      dto.percentOff <= 0
    ) {
      throw new BadRequestException('Percent-off coupons need a percent between 1 and 100');
    }
    if (
      existing.kind === CouponKind.EXTRA_TRIAL_DAYS &&
      dto.extraDays !== undefined &&
      dto.extraDays <= 0
    ) {
      throw new BadRequestException('Trial coupons need extra days');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        maxRedemptions:
          dto.maxRedemptions === undefined ? undefined : dto.maxRedemptions,
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
        notes:
          dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        percentOff: dto.percentOff,
        extraDays: dto.extraDays,
        complimentaryMonths: dto.complimentaryMonths,
        plan: dto.plan === undefined ? undefined : dto.plan,
      },
      include: {
        _count: { select: { redemptions: true } },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            school: { select: { id: true, name: true, joinCode: true } },
          },
        },
      },
    });
  }

  async redeem(schoolId: string, rawCode: string, appliedBy?: string) {
    const code = this.normalizeCode(rawCode);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('That coupon code is not valid');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('That coupon has expired');
    }
    if (
      coupon.maxRedemptions != null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      throw new BadRequestException('That coupon has reached its redemption limit');
    }

    const already = await this.prisma.couponRedemption.findUnique({
      where: { couponId_schoolId: { couponId: coupon.id, schoolId } },
    });
    if (already) {
      throw new BadRequestException('This school has already used that coupon');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    let result = '';
    let activated = false;
    let paymentRequired = false;
    let percentOff = 0;

    if (coupon.kind === CouponKind.EXTRA_TRIAL_DAYS) {
      const base =
        sub.trialEndsAt && sub.trialEndsAt > now ? sub.trialEndsAt : now;
      const trialEndsAt = addDays(base, coupon.extraDays);
      await this.prisma.subscription.update({
        where: { schoolId },
        data: {
          plan: Plan.TRIAL,
          isActive: true,
          trialEndsAt,
          couponCode: coupon.code,
        },
      });
      result = `Trial extended by ${coupon.extraDays} days`;
      activated = true;
    } else if (
      coupon.kind === CouponKind.COMPLIMENTARY ||
      (coupon.kind === CouponKind.PERCENT_OFF && coupon.percentOff >= 100)
    ) {
      const plan = coupon.plan ?? Plan.STARTER;
      if (plan === Plan.TRIAL) {
        throw new BadRequestException('Complimentary coupons must grant a paid plan');
      }
      const months = Math.max(1, coupon.complimentaryMonths);
      const currentPeriodEnd = addMonths(now, months);
      await this.prisma.subscription.update({
        where: { schoolId },
        data: {
          plan,
          isActive: true,
          trialEndsAt: null,
          currentPeriodEnd,
          couponCode: coupon.code,
        },
      });
      result = `Complimentary ${plan} access for ${months} month${months === 1 ? '' : 's'}`;
      activated = true;
    } else {
      percentOff = Math.min(100, Math.max(1, coupon.percentOff));
      await this.prisma.subscription.update({
        where: { schoolId },
        data: { couponCode: coupon.code },
      });
      result = `${percentOff}% off the next invoice — payment is still required`;
      paymentRequired = true;
    }

    await this.prisma.$transaction([
      this.prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          schoolId,
          appliedBy: appliedBy ?? null,
          result,
        },
      }),
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { redeemedCount: { increment: 1 } },
      }),
    ]);

    return {
      code: coupon.code,
      kind: coupon.kind,
      result,
      activated,
      paymentRequired,
      percentOff,
    };
  }

  async discountForSchool(schoolId: string): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
      select: { couponCode: true },
    });
    if (!sub?.couponCode) return 0;
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: sub.couponCode },
    });
    if (!coupon || !coupon.isActive) return 0;
    if (coupon.kind !== CouponKind.PERCENT_OFF) return 0;
    return Math.min(100, Math.max(0, coupon.percentOff));
  }
}
