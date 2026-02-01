import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantsService } from '../tenants.service';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantsService: TenantsService,
    private logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não há usuário autenticado, deixar o AuthGuard lidar com isso
    if (!user) {
      return true;
    }

    // Obter tenant ID da requisição (pode vir de parâmetros, body, ou headers)
    const tenantId = this.extractTenantId(request);

    // Se não há tenant ID na requisição, usar o tenant do usuário
    const targetTenantId = tenantId || user.tenantId;

    if (!targetTenantId) {
      this.logger.logSecurityEvent('tenant_access_denied', {
        userId: user.id,
        reason: 'no_tenant_id',
      }, 'TenantGuard');
      throw new ForbiddenException('Tenant não especificado');
    }

    // Verificar se o usuário tem acesso ao tenant
    if (!this.hasAccessToTenant(user, targetTenantId)) {
      this.logger.logSecurityEvent('tenant_access_denied', {
        userId: user.id,
        userTenantId: user.tenantId,
        targetTenantId,
      }, 'TenantGuard');
      throw new ForbiddenException('Acesso negado ao tenant');
    }

    // Verificar se o tenant está ativo
    const isActive = await this.tenantsService.isActive(targetTenantId);
    if (!isActive) {
      this.logger.logSecurityEvent('inactive_tenant_access', {
        userId: user.id,
        tenantId: targetTenantId,
      }, 'TenantGuard');
      throw new ForbiddenException('Tenant inativo');
    }

    // Adicionar tenant ID ao request para uso posterior
    request.tenantId = targetTenantId;

    return true;
  }

  private extractTenantId(request: any): string | null {
    // Tentar obter tenant ID de diferentes fontes
    return (
      request.params?.tenantId ||
      request.body?.tenantId ||
      request.query?.tenantId ||
      request.headers['x-tenant-id'] ||
      null
    );
  }

  private hasAccessToTenant(user: any, tenantId: string): boolean {
    // Super admin tem acesso a todos os tenants
    if (user.role === 'super_admin') {
      return true;
    }

    // Usuários normais só têm acesso ao próprio tenant
    return user.tenantId === tenantId;
  }
}