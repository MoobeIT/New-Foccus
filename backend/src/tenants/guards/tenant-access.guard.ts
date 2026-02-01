import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export const TENANT_ROLES = 'tenantRoles';
export const ALLOW_CROSS_TENANT = 'allowCrossTenant';

export const TenantRoles = (...roles: string[]) => SetMetadata(TENANT_ROLES, roles);
export const AllowCrossTenant = () => SetMetadata(ALLOW_CROSS_TENANT, true);

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenantId;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    if (!tenantId) {
      throw new UnauthorizedException('Tenant não identificado');
    }

    // Verificar se permite acesso cross-tenant (para super admins)
    const allowCrossTenant = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CROSS_TENANT,
      [context.getHandler(), context.getClass()],
    );

    if (allowCrossTenant && user.role === 'super_admin') {
      return true;
    }

    // Verificar se o usuário pertence ao tenant
    if (user.tenantId !== tenantId) {
      this.logger.logSecurityEvent('cross_tenant_access_attempt', {
        userId: user.id,
        userTenantId: user.tenantId,
        requestedTenantId: tenantId,
        endpoint: request.url,
        method: request.method,
      }, 'TenantAccessGuard');

      throw new ForbiddenException('Acesso negado ao tenant');
    }

    // Verificar roles específicos do tenant se definidos
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      TENANT_ROLES,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = await this.checkUserTenantRole(user.id, tenantId, requiredRoles);
      if (!hasRole) {
        this.logger.logSecurityEvent('insufficient_tenant_permissions', {
          userId: user.id,
          tenantId,
          requiredRoles,
          userRole: user.role,
        }, 'TenantAccessGuard');

        throw new ForbiddenException('Permissões insuficientes no tenant');
      }
    }

    return true;
  }

  private async checkUserTenantRole(
    userId: string,
    tenantId: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    // Buscar usuário e verificar role
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        active: true,
      },
      select: {
        role: true,
      },
    });

    if (!user) {
      return false;
    }

    // Verificar se tem uma das roles necessárias
    return requiredRoles.includes(user.role);
  }
}