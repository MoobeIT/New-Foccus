import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Extrair tenantId do header X-Tenant-ID
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (tenantId) {
      // Validar formato do tenantId (deve ser UUID ou slug válido)
      if (this.isValidTenantId(tenantId)) {
        req.tenantId = tenantId;
      } else {
        throw new BadRequestException('Invalid tenant ID format');
      }
    } else {
      // Para desenvolvimento, usar tenant padrão
      req.tenantId = 'default';
    }
    
    next();
  }

  private isValidTenantId(tenantId: string): boolean {
    // Aceitar UUID ou slug válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const slugRegex = /^[a-z0-9-]+$/;
    
    return uuidRegex.test(tenantId) || (slugRegex.test(tenantId) && tenantId.length >= 3 && tenantId.length <= 50);
  }
}