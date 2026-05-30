import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../http.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const durationMs = Date.now() - start;
        const user = request.user as
          | { id?: string; schoolId?: string; role?: string }
          | undefined;

        this.logger.log(
          JSON.stringify({
            event: 'audit_request',
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            durationMs,
            userId: user?.id ?? null,
            schoolId: user?.schoolId ?? null,
            role: user?.role ?? null,
          }),
        );
      }),
    );
  }
}
