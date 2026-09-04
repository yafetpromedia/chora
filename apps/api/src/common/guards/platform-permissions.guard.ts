import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PLATFORM_OWNER_ONLY_KEY,
  PLATFORM_PERMISSIONS_KEY,
} from '../decorators/require-platform-permissions.decorator';
import { isPlatformUser } from '../auth.types';
import type { PlatformPermissionKey } from '../permissions/platform-permissions';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class PlatformPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_OWNER_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const required = this.reflector.getAllAndOverride<PlatformPermissionKey[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownerOnly && (!required || required.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !isPlatformUser(user)) {
      throw new ForbiddenException('Platform admin access only');
    }

    if (user.role === 'OWNER') {
      return true;
    }

    if (ownerOnly) {
      throw new ForbiddenException('Only platform owners can access this area');
    }

    const granted = new Set(user.permissions ?? []);
    const ok = required.every((key) => granted.has(key));
    if (!ok) {
      throw new ForbiddenException('Insufficient platform permissions');
    }

    return true;
  }
}
