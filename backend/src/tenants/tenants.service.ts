import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ValidationService } from '../common/services/validation.service';
import { LoggerService } from '../common/services/logger.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantEntity } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    const { name, slug, themeConfig, settings, active } = createTenantDto;

    // Validar slug
    if (!this.validationService.isValidTenantSlug(slug)) {
      throw new BadRequestException('Slug inválido. Use apenas letras minúsculas, números e hífens.');
    }

    // Verificar se slug já existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException('Slug já está em uso');
    }

    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          name,
          slug,
          themeConfig: JSON.stringify(themeConfig || {}),
          settings: JSON.stringify(settings || {}),
          active: active ?? true,
        },
      });

      this.logger.logUserAction('system', 'tenant_created', { tenantId: tenant.id, slug }, 'TenantsService');

      return this.mapToEntity(tenant);
    } catch (error) {
      this.logger.error('Erro ao criar tenant', error.stack, 'TenantsService');
      throw error;
    }
  }

  async findAll(active?: boolean): Promise<TenantEntity[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: active !== undefined ? { active } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map(tenant => this.mapToEntity(tenant));
  }

  async findOne(id: string): Promise<TenantEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.mapToEntity(tenant);
  }

  async findBySlug(slug: string): Promise<TenantEntity> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.mapToEntity(tenant);
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se tenant existe
    await this.findOne(id);

    const { slug, ...updateData } = updateTenantDto;

    // Se está atualizando slug, verificar se não existe
    if (slug) {
      if (!this.validationService.isValidTenantSlug(slug)) {
        throw new BadRequestException('Slug inválido. Use apenas letras minúsculas, números e hífens.');
      }

      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug },
      });

      if (existingTenant && existingTenant.id !== id) {
        throw new ConflictException('Slug já está em uso');
      }
    }

    try {
      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: {
          ...updateData,
          ...(slug && { slug }),
        },
      });

      this.logger.logUserAction('system', 'tenant_updated', { tenantId: id }, 'TenantsService');

      return this.mapToEntity(tenant);
    } catch (error) {
      this.logger.error('Erro ao atualizar tenant', error.stack, 'TenantsService');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se tenant existe
    await this.findOne(id);

    try {
      await this.prisma.tenant.delete({
        where: { id },
      });

      this.logger.logUserAction('system', 'tenant_deleted', { tenantId: id }, 'TenantsService');
    } catch (error) {
      this.logger.error('Erro ao deletar tenant', error.stack, 'TenantsService');
      throw error;
    }
  }

  async activate(id: string): Promise<TenantEntity> {
    return this.update(id, { active: true });
  }

  async deactivate(id: string): Promise<TenantEntity> {
    return this.update(id, { active: false });
  }

  // Método para verificar se tenant está ativo
  async isActive(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { active: true },
    });

    return tenant?.active || false;
  }

  // Método para obter configurações do tenant
  async getTenantConfig(tenantId: string): Promise<{ themeConfig: any; settings: any }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { themeConfig: true, settings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return {
      themeConfig: tenant.themeConfig,
      settings: tenant.settings,
    };
  }

  // Método para atualizar apenas configurações de tema
  async updateThemeConfig(tenantId: string, themeConfig: Record<string, any>): Promise<TenantEntity> {
    return this.update(tenantId, { themeConfig });
  }

  // Método para atualizar apenas configurações gerais
  async updateSettings(tenantId: string, settings: Record<string, any>): Promise<TenantEntity> {
    return this.update(tenantId, { settings });
  }

  private mapToEntity(tenant: any): TenantEntity {
    return new TenantEntity({
      ...tenant,
      themeConfig: typeof tenant.themeConfig === 'string' 
        ? JSON.parse(tenant.themeConfig || '{}') 
        : tenant.themeConfig,
      settings: typeof tenant.settings === 'string' 
        ? JSON.parse(tenant.settings || '{}') 
        : tenant.settings,
    });
  }
}