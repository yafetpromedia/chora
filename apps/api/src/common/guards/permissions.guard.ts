import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { isSchoolUser } from '../auth.types';
import { SchoolPermissionKey } from '../permissions/school-permissions';
import { permissionMatches } from '../permissions/permission-catalog';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SchoolPermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !isSchoolUser(user)) {
      throw new ForbiddenException('Authenticated school user is required');
    }

    if (!permissionMatches(user.permissions, required)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
