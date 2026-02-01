import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

export interface RequestWithTenantContext extends Request {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
  prisma?: PrismaService;
}

@Injectable()
export class TenantPrismaMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  use(req: RequestWithTenantContext, res: Response, next: NextFunction) {
    const tenantId = req.tenantId || req.user?.tenantId;

    if (tenantId) {
      // Criar uma instância do Prisma com contexto de tenant
      // Isso permite filtrar automaticamente por tenant em todas as queries
      req.prisma = this.createTenantPrisma(tenantId);
    } else {
      req.prisma = this.prisma;
    }

    next();
  }

  private createTenantPrisma(tenantId: string): PrismaService {
    // Criar um proxy do Prisma que automaticamente adiciona filtros de tenant
    return new Proxy(this.prisma, {
      get: (target, prop) => {
        const originalMethod = target[prop];

        // Se é um método de modelo (user, product, etc.)
        if (typeof originalMethod === 'object' && originalMethod !== null) {
          return new Proxy(originalMethod, {
            get: (modelTarget, modelProp) => {
              const modelMethod = modelTarget[modelProp];

              // Se é um método de query (findMany, findFirst, etc.)
              if (typeof modelMethod === 'function') {
                return (...args: any[]) => {
                  // Adicionar filtro de tenant automaticamente
                  if (args[0] && typeof args[0] === 'object') {
                    // Verificar se o modelo tem campo tenantId
                    if (this.modelHasTenantId(prop as string)) {
                      args[0].where = {
                        ...args[0].where,
                        tenantId,
                      };
                    }
                  } else if (this.modelHasTenantId(prop as string)) {
                    // Se não há argumentos, criar objeto com filtro de tenant
                    args[0] = { where: { tenantId } };
                  }

                  return modelMethod.apply(modelTarget, args);
                };
              }

              return modelMethod;
            },
          });
        }

        return originalMethod;
      },
    });
  }

  private modelHasTenantId(modelName: string): boolean {
    // Lista de modelos que têm campo tenantId
    const modelsWithTenantId = [
      'user',
      'product',
      'productVariant',
      'project',
      'asset',
      'order',
      'payment',
      'notification',
      'auditLog',
    ];

    return modelsWithTenantId.includes(modelName);
  }
}