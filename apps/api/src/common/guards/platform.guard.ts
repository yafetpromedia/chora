import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isPlatformUser } from '../auth.types';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!isPlatformUser(request.user)) {
      throw new ForbiddenException('Platform admin access only');
    }
    return true;
  }
}
