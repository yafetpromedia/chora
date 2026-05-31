import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isSchoolUser, UserRole } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !isSchoolUser(user)) {
      throw new ForbiddenException('Authenticated school user is required');
    }

    const roleAllowed =
      requiredRoles.includes(user.role) ||
      (user.role === 'staff' && requiredRoles.includes('admin'));

    if (!roleAllowed) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    return true;
  }
}
