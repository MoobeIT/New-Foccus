import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export interface TenantDataStats {
  users: number;
  products: number;
  projects: number;
  assets: number;
  orders: number;
  storageUsed: number; // em bytes
  apiCalls: number;
}

export interface TenantQuotas {
  maxUsers: number;
  maxProducts: number;
  maxProjects: number;
  maxAssets: number;
  maxStorageGB: number;
  maxApiCallsPerMonth: number;
}

@Injectable()
export class TenantDataService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  /**
   * Verifica se o usuário tem acesso aos dados do tenant
   */
  async verifyTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, role: true },
    });

    if (!user) {
      return false;
    }

    // Super admin tem acesso a todos os tenants
    if (user.role === 'super_admin') {
      return true;
    }

    // Usuários normais só têm acesso ao próprio tenant
    return user.tenantId === tenantId;
  }

  /**
   * Obtém estatísticas de uso do tenant
   */
  async getTenantStats(tenantId: string): Promise<TenantDataStats> {
    const [
      usersCount,
      productsCount,
      projectsCount,
      assetsCount,
      ordersCount,
      storageUsed,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.order.count({ where: { tenantId } }),
      this.calculateStorageUsed(tenantId),
    ]);

    // Obter chamadas de API do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const apiCalls = await this.prisma.auditLog.count({
      where: {
        tenantId,
        action: 'api_request',
        createdAt: { gte: lastMonth },
      },
    });

    return {
      users: usersCount,
      products: productsCount,
      projects: projectsCount,
      assets: assetsCount,
      orders: ordersCount,
      storageUsed,
      apiCalls,
    };
  }

  /**
   * Obtém as cotas do tenant
   */
  async getTenantQuotas(tenantId: string): Promise<TenantQuotas> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = tenant?.settings as any || {};

    return {
      maxUsers: settings.maxUsers || 100,
      maxProducts: settings.maxProducts || 1000,
      maxProjects: settings.maxProjects || 5000,
      maxAssets: settings.maxAssets || 10000,
      maxStorageGB: settings.maxStorageGB || 10,
      maxApiCallsPerMonth: settings.maxApiCallsPerMonth || 10000,
    };
  }

  /**
   * Verifica se o tenant está dentro das cotas
   */
  async checkTenantQuotas(tenantId: string): Promise<{
    withinLimits: boolean;
    violations: string[];
    stats: TenantDataStats;
    quotas: TenantQuotas;
  }> {
    const [stats, quotas] = await Promise.all([
      this.getTenantStats(tenantId),
      this.getTenantQuotas(tenantId),
    ]);

    const violations: string[] = [];

    if (stats.users > quotas.maxUsers) {
      violations.push(`Limite de usuários excedido: ${stats.users}/${quotas.maxUsers}`);
    }

    if (stats.products > quotas.maxProducts) {
      violations.push(`Limite de produtos excedido: ${stats.products}/${quotas.maxProducts}`);
    }

    if (stats.projects > quotas.maxProjects) {
      violations.push(`Limite de projetos excedido: ${stats.projects}/${quotas.maxProjects}`);
    }

    if (stats.assets > quotas.maxAssets) {
      violations.push(`Limite de assets excedido: ${stats.assets}/${quotas.maxAssets}`);
    }

    const storageGB = stats.storageUsed / (1024 * 1024 * 1024);
    if (storageGB > quotas.maxStorageGB) {
      violations.push(`Limite de armazenamento excedido: ${storageGB.toFixed(2)}GB/${quotas.maxStorageGB}GB`);
    }

    if (stats.apiCalls > quotas.maxApiCallsPerMonth) {
      violations.push(`Limite de chamadas API excedido: ${stats.apiCalls}/${quotas.maxApiCallsPerMonth}`);
    }

    return {
      withinLimits: violations.length === 0,
      violations,
      stats,
      quotas,
    };
  }

  /**
   * Migra dados de um tenant para outro (para fusões/aquisições)
   */
  async migrateTenantData(
    sourceTenantId: string,
    targetTenantId: string,
    userId: string,
  ): Promise<void> {
    // Verificar permissões (apenas super admin)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'super_admin') {
      throw new ForbiddenException('Apenas super admins podem migrar dados de tenant');
    }

    this.logger.info('Starting tenant data migration', 'TenantDataService', {
      sourceTenantId,
      targetTenantId,
      userId,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Migrar usuários
        await tx.user.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Migrar produtos
        await tx.product.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Migrar projetos
        await tx.project.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Migrar assets
        await tx.asset.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Migrar pedidos
        await tx.order.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Migrar logs de auditoria
        await tx.auditLog.updateMany({
          where: { tenantId: sourceTenantId },
          data: { tenantId: targetTenantId },
        });

        // Desativar tenant de origem
        await tx.tenant.update({
          where: { id: sourceTenantId },
          data: { active: false },
        });
      });

      this.logger.info('Tenant data migration completed', 'TenantDataService', {
        sourceTenantId,
        targetTenantId,
        userId,
      });
    } catch (error) {
      this.logger.error('Tenant data migration failed', error.stack, 'TenantDataService');
      throw error;
    }
  }

  /**
   * Remove todos os dados de um tenant (para exclusão)
   */
  async deleteTenantData(tenantId: string, userId: string): Promise<void> {
    // Verificar permissões (apenas super admin)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'super_admin') {
      throw new ForbiddenException('Apenas super admins podem deletar dados de tenant');
    }

    this.logger.info('Starting tenant data deletion', 'TenantDataService', {
      tenantId,
      userId,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Deletar em ordem para respeitar foreign keys
        await tx.auditLog.deleteMany({ where: { tenantId } });
        await tx.order.deleteMany({ where: { tenantId } });
        await tx.project.deleteMany({ where: { tenantId } });
        await tx.asset.deleteMany({ where: { tenantId } });
        await tx.product.deleteMany({ where: { tenantId } });
        await tx.user.deleteMany({ where: { tenantId } });
        
        // Deletar o tenant por último
        await tx.tenant.delete({ where: { id: tenantId } });
      });

      this.logger.info('Tenant data deletion completed', 'TenantDataService', {
        tenantId,
        userId,
      });
    } catch (error) {
      this.logger.error('Tenant data deletion failed', error.stack, 'TenantDataService');
      throw error;
    }
  }

  private async calculateStorageUsed(tenantId: string): Promise<number> {
    const assets = await this.prisma.asset.findMany({
      where: { tenantId },
      select: { sizeBytes: true },
    });

    return assets.reduce((total, asset) => total + (asset.sizeBytes || 0), 0);
  }
}