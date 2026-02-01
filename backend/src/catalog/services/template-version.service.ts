import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { TemplateEntity } from '../entities/template.entity';

// Note: ProjectVersion is used for project versioning, not template versioning
// This service provides basic template operations without versioning

export interface TemplateVersionInfo {
  id: string;
  templateId: string;
  version: number;
  changelog?: string;
  createdAt: Date;
}

@Injectable()
export class TemplateVersionService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {}

  // Get template by ID
  async getTemplate(templateId: string, tenantId: string): Promise<TemplateEntity> {
    if (!this.validationService.isValidUuid(templateId)) {
      throw new BadRequestException('ID inválido');
    }

    const template = await this.prisma.template.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return new TemplateEntity(template);
  }

  // Duplicate template (creates a copy)
  async duplicateTemplate(templateId: string, tenantId: string, newName?: string): Promise<TemplateEntity> {
    const original = await this.getTemplate(templateId, tenantId);

    const duplicate = await this.prisma.template.create({
      data: {
        tenantId,
        name: newName || `${original.name} (cópia)`,
        productType: original.productType,
        templateType: original.templateType,
        category: original.category,
        description: original.description,
        previewUrl: original.previewUrl,
        thumbnailUrl: original.thumbnailUrl,
        dimensions: JSON.stringify(original.dimensions),
        margins: JSON.stringify(original.margins),
        safeArea: JSON.stringify(original.safeArea),
        elements: JSON.stringify(original.elements),
        colors: JSON.stringify(original.colors),
        fonts: JSON.stringify(original.fonts),
        tags: JSON.stringify(original.tags),
        isSystem: false,
        isActive: true,
      },
    });

    this.logger.logUserAction('system', 'template_duplicated', {
      originalId: templateId,
      newId: duplicate.id,
      tenantId,
    }, 'TemplateVersionService');

    return new TemplateEntity(duplicate);
  }

  // Update template elements
  async updateElements(templateId: string, tenantId: string, elements: any[]): Promise<TemplateEntity> {
    await this.getTemplate(templateId, tenantId);

    const template = await this.prisma.template.update({
      where: { id: templateId },
      data: {
        elements: JSON.stringify(elements),
      },
    });

    this.logger.logUserAction('system', 'template_elements_updated', {
      templateId,
      tenantId,
    }, 'TemplateVersionService');

    return new TemplateEntity(template);
  }

  // Get templates by type
  async getTemplatesByType(tenantId: string, templateType: string): Promise<TemplateEntity[]> {
    const templates = await this.prisma.template.findMany({
      where: { tenantId, templateType, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(t => new TemplateEntity(t));
  }

  // Get system templates
  async getSystemTemplates(tenantId: string): Promise<TemplateEntity[]> {
    const templates = await this.prisma.template.findMany({
      where: { tenantId, isSystem: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(t => new TemplateEntity(t));
  }
}
