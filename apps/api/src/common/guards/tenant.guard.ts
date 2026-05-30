import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class TenantGuard implements CanActivate {
  private getSchoolIdHeaderValue(
    schoolIdHeader: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(schoolIdHeader)) {
      return schoolIdHeader[0];
    }
    return schoolIdHeader;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Tenant check requires authenticated user');
    }

    const schoolIdParam = request.params?.schoolId as string | undefined;
    const schoolIdHeader = this.getSchoolIdHeaderValue(
      request.headers?.['x-school-id'],
    );
    const requestedSchoolId = schoolIdParam ?? schoolIdHeader;

    if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school access is not allowed');
    }

    request.schoolId = user.schoolId;
    return true;
  }
}
