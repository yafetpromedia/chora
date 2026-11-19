import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isSchoolUser } from '../auth.types';
import { AuthenticatedRequest } from '../http.types';
import { SCHOOL_MODULE_KEY } from '../decorators/require-school-module.decorator';
import type { SchoolModuleKey } from '../../subscriptions/module-catalog';
import { ModuleEntitlementService } from '../../subscriptions/module-entitlement.service';

@Injectable()
export class SchoolModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modules: ModuleEntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      SchoolModuleKey | undefined
    >(SCHOOL_MODULE_KEY, [context.getHandler(), context.getClass()]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || !isSchoolUser(user)) {
      throw new ForbiddenException('Authenticated school user is required');
    }

    await this.modules.assertModule(user.schoolId, required);
    return true;
  }
}
