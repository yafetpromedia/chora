import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformAuthUser } from '../auth.types';
import { AuthenticatedRequest } from '../http.types';

export const CurrentPlatformUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PlatformAuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as PlatformAuthUser;
  },
);
