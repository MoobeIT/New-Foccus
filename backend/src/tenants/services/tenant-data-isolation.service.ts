import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export interface DataIsolationConfig {
  // Configurações de isolamento por modelo
  models: {
    [modelName: string]: {
      enabled: boolean;
      tenantField: string;
      cascadeDelete: boolean;
      allowCrossReference: boolean;
    };
  };
  
  // Configurações de auditoria
  audit: {
    logDataAccess: boolean;
    logCrossReferences: boolean;
    alertOnViolations: boolean;
  };
  
  // Configurações de backup
  backup: {
    separateByTenant: boolean;
    encryptionEnabled: boolean;
    retentionDays: number;
  };
}

@Injectable()
export class TenantDataIsolationService {
  private readonly defaultConfig: DataIsolationConfig = {
    models: {
      user: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      product: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      productVariant: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      project: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      asset: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      order: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: false, // Manter histórico
        allowCrossReference: false,
      },
      payment: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: false, // Manter histórico
        allowCrossReference: false,
      },
      notification: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: true,
        allowCrossReference: false,
      },
      auditLog: {
        enabled: true,
        tenantField: 'tenantId',
        cascadeDelete: false, // Nunca deletar logs
        allowCrossReference: false,
      },
    },
    audit: {
      logDataAccess: true,
      logCrossReferences: true,
      alertOnViolations: true,
    },
    backup: {
      separateByTenant: true,
      encryptionEnabled: true,
      retentionDays: 2555, // 7 anos
    },
  };

  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async getIsolationConfig(tenantId: string): Promise<DataIsolationConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant?.settings) {
      return this.defaultConfig;
    }

    try {
      const settings = typeof tenant.settings === 'string' 
        ? JSON.parse(tenant.settings) 
        : tenant.settings;
      
      if (settings.dataIsolationConfig) {
        return {
          ...this.defaultConfig,
          ...settings.dataIsolationConfig,
        };
      }
    } catch {
      // Ignore parse errors
    }

    return this.defaultConfig;
  }

  async updateIsolationConfig(
    tenantId: string,
    config: Partial<DataIsolationConfig>,
  ): Promise<DataIsolationConfig> {
    const currentConfig = await this.getIsolationConfig(tenantId);
    const newConfig = this.mergeConfigs(currentConfig, config);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const currentSettings = tenant?.settings 
      ? (typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings)
      : {};

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        settings: JSON.stringify({
          ...currentSettings,
          dataIsolationConfig: newConfig,
        }),
      },
    });

    this.logger.info('Data isolation config updated', 'TenantDataIsolationService', {
      tenantId,
    });

    return newConfig;
  }

  async validateDataAccess(
    tenantId: string,
    modelName: string,
    operation: 'read' | 'write' | 'delete',
    data: any,
  ): Promise<boolean> {
    const config = await this.getIsolationConfig(tenantId);
    const modelConfig = config.models[modelName];

    if (!modelConfig?.enabled) {
      return true; // Modelo não tem isolamento
    }

    const dataTenantId = data[modelConfig.tenantField];

    // Verificar se os dados pertencem ao tenant correto
    if (dataTenantId && dataTenantId !== tenantId) {
      if (config.audit.logDataAccess) {
        this.logger.logSecurityEvent('cross_tenant_data_access', {
          tenantId,
          dataTenantId,
          modelName,
          operation,
        }, 'TenantDataIsolationService');
      }

      if (config.audit.alertOnViolations) {
        await this.sendSecurityAlert(tenantId, {
          type: 'cross_tenant_access',
          modelName,
          operation,
          dataTenantId,
        });
      }

      return false;
    }

    return true;
  }

  async cleanupTenantData(tenantId: string): Promise<void> {
    const config = await this.getIsolationConfig(tenantId);
    
    this.logger.info('Starting tenant data cleanup', 'TenantDataIsolationService', {
      tenantId,
    });

    // Deletar dados de cada modelo configurado
    for (const [modelName, modelConfig] of Object.entries(config.models)) {
      if (modelConfig.enabled && modelConfig.cascadeDelete) {
        try {
          const result = await this.deleteModelData(modelName, tenantId, modelConfig.tenantField);
          
          this.logger.info(`Deleted ${modelName} data`, 'TenantDataIsolationService', {
            tenantId,
            modelName,
            deletedCount: result.count,
          });
        } catch (error) {
          this.logger.error(`Failed to delete ${modelName} data`, error.stack, 'TenantDataIsolationService');
        }
      }
    }

    this.logger.info('Tenant data cleanup completed', 'TenantDataIsolationService', {
      tenantId,
    });
  }

  async exportTenantData(tenantId: string): Promise<any> {
    const config = await this.getIsolationConfig(tenantId);
    const exportData: any = {};

    this.logger.info('Starting tenant data export', 'TenantDataIsolationService', {
      tenantId,
    });

    // Exportar dados de cada modelo
    for (const [modelName, modelConfig] of Object.entries(config.models)) {
      if (modelConfig.enabled) {
        try {
          const data = await this.exportModelData(modelName, tenantId, modelConfig.tenantField);
          exportData[modelName] = data;
          
          this.logger.info(`Exported ${modelName} data`, 'TenantDataIsolationService', {
            tenantId,
            modelName,
            recordCount: data.length,
          });
        } catch (error) {
          this.logger.error(`Failed to export ${modelName} data`, error.stack, 'TenantDataIsolationService');
        }
      }
    }

    return exportData;
  }

  private mergeConfigs(
    current: DataIsolationConfig,
    update: Partial<DataIsolationConfig>,
  ): DataIsolationConfig {
    return {
      models: { ...current.models, ...update.models },
      audit: { ...current.audit, ...update.audit },
      backup: { ...current.backup, ...update.backup },
    };
  }

  private async deleteModelData(
    modelName: string,
    tenantId: string,
    tenantField: string,
  ): Promise<{ count: number }> {
    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return await model.deleteMany({
      where: { [tenantField]: tenantId },
    });
  }

  private async exportModelData(
    modelName: string,
    tenantId: string,
    tenantField: string,
  ): Promise<any[]> {
    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return await model.findMany({
      where: { [tenantField]: tenantId },
    });
  }

  private async sendSecurityAlert(tenantId: string, alert: any): Promise<void> {
    this.logger.warn('Security alert triggered', 'TenantDataIsolationService', {
      tenantId,
      alertType: alert.type,
    });
  }
}