import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '../../common/services/logger.service';

export const SKIP_TENANT_ISOLATION = 'skipTenantIsolation';
export const SkipTenantIsolation = () => Reflector.createDecorator<boolean>();

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenantId || user?.tenantId;

    // Verificar se deve pular o isolamento de tenant
    const skipIsolation = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_ISOLATION,
      [context.getHandler(), context.getClass()],
    );

    if (skipIsolation || !tenantId) {
      return next.handle();
    }

    // Adicionar tenant ID ao contexto da requisição
    request.tenantContext = {
      tenantId,
      userId: user?.id,
      userRole: user?.role,
    };

    return next.handle().pipe(
      map((data) => {
        // Filtrar dados de resposta se necessário
        return this.filterResponseByTenant(data, tenantId, user);
      }),
    );
  }

  private filterResponseByTenant(data: any, tenantId: string, user: any): any {
    // Se é super admin, não filtrar dados
    if (user?.role === 'super_admin') {
      return data;
    }

    // Se os dados têm propriedade tenantId, verificar se corresponde
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        // Filtrar arrays
        return data.filter(item => 
          !item.tenantId || item.tenantId === tenantId
        );
      } else if (data.tenantId && data.tenantId !== tenantId) {
        // Bloquear acesso a dados de outro tenant
        this.logger.logSecurityEvent('tenant_data_access_blocked', {
          userId: user?.id,
          userTenantId: tenantId,
          dataTenantId: data.tenantId,
        }, 'TenantIsolationInterceptor');
        
        throw new ForbiddenException('Acesso negado aos dados');
      }
    }

    return data;
  }
}