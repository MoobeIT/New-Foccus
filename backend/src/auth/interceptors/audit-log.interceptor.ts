import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../common/services/logger.service';
import { RequestWithTenant } from '../middleware/tenant-context.middleware';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const { method, url, user } = request;

    // Log apenas para rotas autenticadas
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        this.logger.logUserAction(
          user.id,
          'api_request',
          {
            method,
            url,
            duration,
            tenantId: user.tenantId,
          },
          'AuditLogInterceptor',
        );
      }),
    );
  }
}