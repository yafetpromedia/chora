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
        'This school account is suspended. Contact CampusOne support.',
      );
    }

    request.schoolId = user.schoolId;
    request.user = { ...user, scope: 'school' };
    return true;
  }
}
