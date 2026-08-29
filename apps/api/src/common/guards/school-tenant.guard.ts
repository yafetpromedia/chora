import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SchoolStatus } from '@prisma/client';
import { isSchoolUser } from '../auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class SchoolTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  private getSchoolIdHeaderValue(
    schoolIdHeader: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(schoolIdHeader)) {
      return schoolIdHeader[0];
    }
    return schoolIdHeader;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !isSchoolUser(user)) {
      throw new ForbiddenException('School tenant access only');
    }

    const schoolIdParam = request.params?.schoolId as string | undefined;
    const schoolIdHeader = this.getSchoolIdHeaderValue(
      request.headers?.['x-school-id'],
    );
    const requestedSchoolId = schoolIdParam ?? schoolIdHeader;

    if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school access is not allowed');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { status: true },
    });

    if (!school) {
      throw new ForbiddenException('School not found');
    }

    if (school.status === SchoolStatus.SUSPENDED) {
      throw new ForbiddenException(
        'This school account is suspended. Contact Chora support.',
      );
    }

    request.schoolId = user.schoolId;
    request.user = { ...user, scope: 'school' };

    const method = request.method.toUpperCase();
    const path = (request.originalUrl || request.url || '').split('?')[0];
    const billingAllowed =
      path.includes('/schools/subscription') ||
      path.includes('/schools/billing') ||
      path.includes('/schools/plans');
    const identityAllowed =
      path === '/schools/me' || path.endsWith('/schools/me');

    if (
      (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') &&
      (billingAllowed || identityAllowed)
    ) {
      return true;
    }
    if (billingAllowed) {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { schoolId: user.schoolId },
    });
    if (!subscription) {
      return true;
    }
    const now = new Date();
    const trialEnded =
      subscription.plan === 'TRIAL' &&
      subscription.trialEndsAt != null &&
      subscription.trialEndsAt < now;
    const periodEnded =
      subscription.plan !== 'TRIAL' &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd < now;
    if (!subscription.isActive || trialEnded || periodEnded) {
      if (subscription.isActive && (trialEnded || periodEnded)) {
        await this.prisma.subscription.update({
          where: { schoolId: user.schoolId },
          data: { isActive: false },
        });
      }
      throw new ForbiddenException(
        'Your Chora trial has ended. Pay for a plan or enter a coupon code to continue.',
      );
    }

    return true;
  }
}
