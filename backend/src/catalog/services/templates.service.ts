import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateEntity } from '../entities/template.entity';

export interface TemplateFilters {
  tenantId: string;
  productType?: string;
  templateType?: string;
  category?: string;
  isActive?: boolean;
  isSystem?: boolean;
  search?: string;
}

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(tenantId: string, createTemplateDto: CreateTemplateDto): Promise<TemplateEntity> {
    try {
      const template = await this.prisma.template.create({
        data: {
          tenantId,
          name: createTemplateDto.name,
          productType: createTemplateDto.productType || 'photobook',
          templateType: createTemplateDto.templateType || 'page',
          category: createTemplateDto.category || 'default',
          description: createTemplateDto.description,
          previewUrl: createTemplateDto.previewUrl,
          thumbnailUrl: createTemplateDto.thumbnailUrl,
          dimensions: JSON.stringify(createTemplateDto.dimensions || {}),
          margins: JSON.stringify(createTemplateDto.margins || {}),
          safeArea: JSON.stringify(createTemplateDto.safeArea || {}),
          elements: JSON.stringify(createTemplateDto.elements || []),
          colors: JSON.stringify(createTemplateDto.colors || []),
          fonts: JSON.stringify(createTemplateDto.fonts || []),
          tags: JSON.stringify(createTemplateDto.tags || []),
          isSystem: createTemplateDto.isSystem ?? false,
          isActive: createTemplateDto.isActive ?? true,
        },
      });

      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'template_created', { 
        templateId: template.id, 
        tenantId 
      }, 'TemplatesService');

      return new TemplateEntity(template);
    } catch (error) {
      this.logger.error('Erro ao criar template', error.stack, 'TemplatesService');
      throw error;
    }
  }

  async findAll(filters: TemplateFilters): Promise<TemplateEntity[]> {
    const { tenantId, productType, templateType, category, isActive, isSystem, search } = filters;
    
    const cacheKey = `templates:${tenantId}:${productType || 'all'}:${templateType || 'all'}:${category || 'all'}`;
    const cached = await this.cacheManager.get<TemplateEntity[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const where: any = { tenantId };
    
    if (productType) where.productType = productType;
    if (templateType) where.templateType = templateType;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (isSystem !== undefined) where.isSystem = isSystem;
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const templates = await this.prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const result = templates.map(template => new TemplateEntity(template));

    await this.cacheManager.set(cacheKey, result, 600);

    return result;
  }

  async findOne(id: string, tenantId: string): Promise<TemplateEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const cacheKey = `template:${id}:${tenantId}`;
    const cached = await this.cacheManager.get<TemplateEntity>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const template = await this.prisma.template.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    const result = new TemplateEntity(template);

    await this.cacheManager.set(cacheKey, result, 600);

    return result;
  }

  async update(id: string, tenantId: string, updateTemplateDto: UpdateTemplateDto): Promise<TemplateEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    await this.findOne(id, tenantId);

    try {
      const updateData: any = {};
      
      if (updateTemplateDto.name !== undefined) updateData.name = updateTemplateDto.name;
      if (updateTemplateDto.productType !== undefined) updateData.productType = updateTemplateDto.productType;
      if (updateTemplateDto.templateType !== undefined) updateData.templateType = updateTemplateDto.templateType;
      if (updateTemplateDto.category !== undefined) updateData.category = updateTemplateDto.category;
      if (updateTemplateDto.description !== undefined) updateData.description = updateTemplateDto.description;
      if (updateTemplateDto.previewUrl !== undefined) updateData.previewUrl = updateTemplateDto.previewUrl;
      if (updateTemplateDto.thumbnailUrl !== undefined) updateData.thumbnailUrl = updateTemplateDto.thumbnailUrl;
      if (updateTemplateDto.dimensions !== undefined) updateData.dimensions = JSON.stringify(updateTemplateDto.dimensions);
      if (updateTemplateDto.margins !== undefined) updateData.margins = JSON.stringify(updateTemplateDto.margins);
      if (updateTemplateDto.safeArea !== undefined) updateData.safeArea = JSON.stringify(updateTemplateDto.safeArea);
      if (updateTemplateDto.elements !== undefined) updateData.elements = JSON.stringify(updateTemplateDto.elements);
      if (updateTemplateDto.colors !== undefined) updateData.colors = JSON.stringify(updateTemplateDto.colors);
      if (updateTemplateDto.fonts !== undefined) updateData.fonts = JSON.stringify(updateTemplateDto.fonts);
      if (updateTemplateDto.tags !== undefined) updateData.tags = JSON.stringify(updateTemplateDto.tags);
      if (updateTemplateDto.isActive !== undefined) updateData.isActive = updateTemplateDto.isActive;

      const template = await this.prisma.template.update({
        where: { id },
        data: updateData,
      });

      await this.clearTemplateCache(id, tenantId);
      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'template_updated', { 
        templateId: id, 
        tenantId 
      }, 'TemplatesService');

      return new TemplateEntity(template);
    } catch (error) {
      this.logger.error('Erro ao atualizar template', error.stack, 'TemplatesService');
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    await this.findOne(id, tenantId);

    try {
      await this.prisma.template.delete({
        where: { id },
      });

      await this.clearTemplateCache(id, tenantId);
      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'template_deleted', { 
        templateId: id, 
        tenantId 
      }, 'TemplatesService');
    } catch (error) {
      this.logger.error('Erro ao deletar template', error.stack, 'TemplatesService');
      throw error;
    }
  }

  async activate(id: string, tenantId: string): Promise<TemplateEntity> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<TemplateEntity> {
    return this.update(id, tenantId, { isActive: false });
  }

  async findByProductType(tenantId: string, productType: string): Promise<TemplateEntity[]> {
    return this.findAll({ tenantId, productType, isActive: true });
  }

  async findByCategory(tenantId: string, category: string): Promise<TemplateEntity[]> {
    return this.findAll({ tenantId, category, isActive: true });
  }

  private async clearTemplateCache(templateId: string, tenantId: string): Promise<void> {
    await this.cacheManager.del(`template:${templateId}:${tenantId}`);
  }

  private async clearCatalogCache(tenantId: string): Promise<void> {
    const keys = await this.cacheManager.store.keys?.(`templates:${tenantId}:*`);
    if (keys) {
      await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }
  }
}
