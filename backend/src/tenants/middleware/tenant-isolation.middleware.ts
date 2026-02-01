import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    settings: any;
    themeConfig: any;
  };
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    try {
      const tenantId = await this.extractTenantId(req);
      
      if (!tenantId) {
        // Permitir rotas públicas sem tenant
        next();
        return;
      }

      // Buscar dados do tenant
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          settings: true,
          themeConfig: true,
        },
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant não encontrado');
      }

      if (!tenant.active) {
        throw new UnauthorizedException('Tenant inativo');
      }

      // Adicionar dados do tenant à requisição
      req.tenantId = tenantId;
      req.tenant = tenant;

      // Log da requisição com contexto de tenant
      this.logger.info('Request with tenant context', 'TenantIsolationMiddleware', {
        tenantId,
        tenantName: tenant.name,
        method: req.method,
        url: req.url,
      });

      next();
    } catch (error) {
      this.logger.error('Tenant isolation failed', error.stack, 'TenantIsolationMiddleware');
      throw error;
    }
  }

  private async extractTenantId(req: RequestWithTenant): Promise<string | null> {
    // 1. Verificar header X-Tenant-ID (para APIs)
    const headerTenantId = req.get('X-Tenant-ID');
    if (headerTenantId) {
      return headerTenantId;
    }

    // 2. Verificar se há usuário autenticado com tenantId
    if (req.user?.tenantId) {
      return req.user.tenantId;
    }

    // 3. Verificar slug no subdomínio
    const host = req.get('Host');
    if (host) {
      const subdomain = this.extractSubdomain(host);
      if (subdomain) {
        const tenant = await this.prisma.tenant.findFirst({
          where: { slug: subdomain },
          select: { id: true },
        });
        if (tenant) {
          return tenant.id;
        }
      }
    }

    // 4. Verificar query parameter (para desenvolvimento)
    const queryTenantId = req.query.tenantId as string;
    if (queryTenantId) {
      return queryTenantId;
    }

    return null;
  }

  private extractSubdomain(host: string): string | null {
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}