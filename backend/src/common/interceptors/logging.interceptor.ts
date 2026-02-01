import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;
    const userId = request.user?.id || 'anonymous';
    const tenantId = request.user?.tenantId || request.tenantId || 'unknown';

    const now = Date.now();

    // Log da requisição
    this.logger.log(
      `📥 ${method} ${url} - User: ${userId} - Tenant: ${tenantId} - IP: ${ip}`,
    );

    if (Object.keys(body || {}).length > 0) {
      // Remover dados sensíveis do log
      const sanitizedBody = this.sanitizeData(body);
      this.logger.debug(`📦 Body: ${JSON.stringify(sanitizedBody)}`);
    }

    if (Object.keys(query || {}).length > 0) {
      this.logger.debug(`🔍 Query: ${JSON.stringify(query)}`);
    }

    if (Object.keys(params || {}).length > 0) {
      this.logger.debug(`📋 Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - now;
        this.logger.log(
          `📤 ${method} ${url} - ${response.statusCode} - ${duration}ms - User: ${userId}`,
        );

        // Log de dados de resposta apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development' && data) {
          const sanitizedData = this.sanitizeData(data);
          this.logger.debug(`📊 Response: ${JSON.stringify(sanitizedData).substring(0, 500)}...`);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        this.logger.error(
          `❌ ${method} ${url} - ERROR - ${duration}ms - User: ${userId} - Error: ${error.message}`,
        );
        return throwError(() => error);
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }
}