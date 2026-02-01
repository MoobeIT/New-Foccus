import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AutoSaveDto } from '../dto/auto-save.dto';
import { ProjectEntity, ProjectStatus } from '../entities/project.entity';

export interface ProjectFilters {
  userId: string;
  tenantId: string;
  status?: ProjectStatus;
  productId?: string;
  search?: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, tenantId: string, createProjectDto: CreateProjectDto): Promise<ProjectEntity> {
    const { name, productId, formatId, paperId, coverTypeId, pageCount, settings } = createProjectDto;

    try {
      // Buscar formato para copiar dimensões
      let formatData: { width?: number; height?: number; bleed?: number; safeMargin?: number; gutterMargin?: number } = {};
      if (formatId) {
        const format = await this.prisma.format.findUnique({
          where: { id: formatId },
          select: { width: true, height: true, bleed: true, safeMargin: true, gutterMargin: true }
        });
        if (format) {
          formatData = {
            width: format.width,
            height: format.height,
            bleed: format.bleed || 3,
            safeMargin: format.safeMargin || 5,
            gutterMargin: format.gutterMargin || 10,
          };
        }
      }

      const project = await this.prisma.project.create({
        data: {
          userId,
          tenantId,
          name,
          status: ProjectStatus.DRAFT,
          productId: productId || null,
          formatId: formatId || null,
          paperId: paperId || null,
          coverTypeId: coverTypeId || null,
          pageCount: pageCount || 20,
          settings: settings ? JSON.stringify(settings) : '{}',
          // Copiar dimensões do formato
          width: formatData.width || 200,
          height: formatData.height || 200,
          bleed: formatData.bleed || 3,
          safeMargin: formatData.safeMargin || 5,
          gutterMargin: formatData.gutterMargin || 10,
        },
        include: {
          product: true,
          format: true,
          paper: true,
          coverType: true,
        },
      });

      this.logger.logUserAction(userId, 'project_created', {
        projectId: project.id,
        productId,
        name,
      }, 'ProjectsService');

      return this.buildProjectEntity(project);
    } catch (error) {
      this.logger.error('Erro ao criar projeto', error.stack, 'ProjectsService');
      throw error;
    }
  }

  async findAll(filters: ProjectFilters): Promise<ProjectEntity[]> {
    const { userId, tenantId, status, productId, search } = filters;

    // Tentar buscar no cache primeiro
    const cacheKey = `projects:${userId}:${tenantId}:${status || 'all'}:${productId || 'all'}:${search || 'all'}`;
    const cached = await this.cacheManager.get<ProjectEntity[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: any = { userId, tenantId };

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.name = {
        contains: search,
      };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        product: true,
        format: true,
        paper: true,
        coverType: true,
        pages: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = projects.map(project => this.buildProjectEntity(project));

    // Cachear resultado por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300);

    return result;
  }

  async findOne(id: string, userId: string, tenantId: string): Promise<ProjectEntity> {
    if (!this.validationService.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Tentar buscar no cache primeiro
    const cacheKey = `project:${id}:${userId}:${tenantId}`;
    const cached = await this.cacheManager.get<ProjectEntity>(cacheKey);

    if (cached) {
      return cached;
    }

    const project = await this.prisma.project.findFirst({
      where: { id, userId, tenantId },
      include: {
        product: true,
        format: true,
        paper: true,
        coverType: true,
        pages: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const result = this.buildProjectEntity(project);

    // Cachear resultado por 5 minutos
    await this.cacheManager.set(cacheKey, result, 300);

    return result;
  }

  async update(id: string, userId: string, tenantId: string, updateProjectDto: UpdateProjectDto): Promise<ProjectEntity> {
    if (!this.validationService.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se projeto existe
    const existingProject = await this.findOne(id, userId, tenantId);

    try {
      const updateData: any = {};
      
      if (updateProjectDto.name !== undefined) updateData.name = updateProjectDto.name;
      if (updateProjectDto.status !== undefined) updateData.status = updateProjectDto.status;
      if (updateProjectDto.productId !== undefined) updateData.productId = updateProjectDto.productId;
      if (updateProjectDto.formatId !== undefined) updateData.formatId = updateProjectDto.formatId;
      if (updateProjectDto.paperId !== undefined) updateData.paperId = updateProjectDto.paperId;
      if (updateProjectDto.coverTypeId !== undefined) updateData.coverTypeId = updateProjectDto.coverTypeId;
      if (updateProjectDto.pageCount !== undefined) updateData.pageCount = updateProjectDto.pageCount;
      if (updateProjectDto.settings !== undefined) {
        updateData.settings = typeof updateProjectDto.settings === 'string' 
          ? updateProjectDto.settings 
          : JSON.stringify(updateProjectDto.settings);
      }
      
      // Increment version
      updateData.currentVersion = existingProject.currentVersion + 1;

      const project = await this.prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          product: true,
          format: true,
          paper: true,
          coverType: true,
          pages: true,
        },
      });

      // Limpar cache
      await this.clearProjectCache(id, userId, tenantId);

      this.logger.logUserAction(userId, 'project_updated', {
        projectId: id,
        changes: Object.keys(updateProjectDto),
      }, 'ProjectsService');

      return this.buildProjectEntity(project);
    } catch (error) {
      this.logger.error('Erro ao atualizar projeto', error.stack, 'ProjectsService');
      throw error;
    }
  }

  async autoSave(id: string, userId: string, tenantId: string, autoSaveDto: AutoSaveDto): Promise<ProjectEntity> {
    const { settings, version } = autoSaveDto;

    // Verificar se projeto existe
    const existingProject = await this.findOne(id, userId, tenantId);

    // Verificar controle de concorrência
    if (version !== undefined && version !== existingProject.currentVersion) {
      throw new ConflictException('Projeto foi modificado por outra sessão. Recarregue e tente novamente.');
    }

    try {
      const updateData: any = {
        currentVersion: existingProject.currentVersion + 1,
      };

      if (settings !== undefined) {
        updateData.settings = typeof settings === 'string' ? settings : JSON.stringify(settings);
      }

      const project = await this.prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          product: true,
          format: true,
          paper: true,
          coverType: true,
          pages: true,
        },
      });

      // Limpar cache
      await this.clearProjectCache(id, userId, tenantId);

      this.logger.logUserAction(userId, 'project_auto_saved', {
        projectId: id,
        version: project.currentVersion,
      }, 'ProjectsService');

      return this.buildProjectEntity(project);
    } catch (error) {
      this.logger.error('Erro no auto-save do projeto', error.stack, 'ProjectsService');
      throw error;
    }
  }

  async duplicate(id: string, userId: string, tenantId: string, newName?: string): Promise<ProjectEntity> {
    const originalProject = await this.findOne(id, userId, tenantId);

    const createDto: CreateProjectDto = {
      name: newName || `${originalProject.name} (Cópia)`,
      productId: originalProject.productId,
      formatId: originalProject.formatId,
      paperId: originalProject.paperId,
      coverTypeId: originalProject.coverTypeId,
      pageCount: originalProject.pageCount,
      settings: originalProject.settings,
    };

    return this.create(userId, tenantId, createDto);
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    if (!this.validationService.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se projeto existe
    await this.findOne(id, userId, tenantId);

    try {
      await this.prisma.project.delete({
        where: { id },
      });

      // Limpar cache
      await this.clearProjectCache(id, userId, tenantId);

      this.logger.logUserAction(userId, 'project_deleted', {
        projectId: id,
      }, 'ProjectsService');
    } catch (error) {
      this.logger.error('Erro ao deletar projeto', error.stack, 'ProjectsService');
      throw error;
    }
  }

  async changeStatus(id: string, userId: string, tenantId: string, status: ProjectStatus): Promise<ProjectEntity> {
    // Se o status for 'production', adicionar paymentStatus: 'pending' nas settings
    if (status === ProjectStatus.PRODUCTION) {
      const project = await this.findOne(id, userId, tenantId);
      let currentSettings: Record<string, any> = {};
      
      try {
        if (typeof project.settings === 'string') {
          currentSettings = JSON.parse(project.settings);
        } else if (project.settings && typeof project.settings === 'object') {
          currentSettings = project.settings as Record<string, any>;
        }
      } catch {
        currentSettings = {};
      }
      
      const newSettings = {
        ...currentSettings,
        paymentStatus: 'pending',
        productionStatus: 'waiting',
        sentToProductionAt: new Date().toISOString(),
      };
      
      // Atualizar diretamente via Prisma para evitar problemas de tipo
      const updated = await this.prisma.project.update({
        where: { id },
        data: {
          status: status as string,
          settings: JSON.stringify(newSettings),
        },
        include: {
          product: true,
          format: true,
          paper: true,
          coverType: true,
        },
      });
      
      return updated as unknown as ProjectEntity;
    }
    
    return this.update(id, userId, tenantId, { status } as UpdateProjectDto);
  }

  async getStats(userId: string, tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProduct: Record<string, number>;
    totalPages: number;
  }> {
    const projects = await this.prisma.project.findMany({
      where: { userId, tenantId },
      select: {
        status: true,
        productId: true,
        pageCount: true,
        product: {
          select: { name: true },
        },
      },
    });

    const stats = {
      total: projects.length,
      byStatus: {} as Record<string, number>,
      byProduct: {} as Record<string, number>,
      totalPages: 0,
    };

    projects.forEach(project => {
      // Por status
      stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;

      // Por produto
      const productName = project.product?.name || 'Sem produto';
      stats.byProduct[productName] = (stats.byProduct[productName] || 0) + 1;

      // Total de páginas
      stats.totalPages += project.pageCount || 0;
    });

    return stats;
  }

  // Método privado para construir entidade com dados computados
  private buildProjectEntity(project: any): ProjectEntity {
    // Criar objeto simples em vez de instância de classe para evitar problemas de serialização
    const entity: any = {
      id: project.id,
      userId: project.userId,
      tenantId: project.tenantId,
      name: project.name,
      status: project.status,
      productId: project.productId,
      formatId: project.formatId,
      paperId: project.paperId,
      coverTypeId: project.coverTypeId,
      pageCount: project.pageCount,
      spineWidth: project.spineWidth,
      width: project.width,
      height: project.height,
      bleed: project.bleed,
      safeMargin: project.safeMargin,
      gutterMargin: project.gutterMargin,
      settings: typeof project.settings === 'string' ? JSON.parse(project.settings) : (project.settings || {}),
      currentVersion: project.currentVersion,
      lockedAt: project.lockedAt,
      lockedVersionId: project.lockedVersionId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    // Adicionar dados computados
    if (project.product) {
      entity.product = project.product;
      entity.productName = project.product.name;
    }

    if (project.format) {
      entity.format = project.format;
      entity.formatName = project.format.name;
    }

    if (project.paper) {
      entity.paper = project.paper;
      entity.paperName = project.paper.name;
    }

    if (project.coverType) {
      entity.coverType = project.coverType;
      entity.coverTypeName = project.coverType.name;
    }

    // Calcular estatísticas de páginas
    if (Array.isArray(project.pages)) {
      entity.totalPages = project.pages.length;
      entity.totalElements = project.pages.reduce((total: number, page: any) => {
        const elements = page.elements ? JSON.parse(page.elements) : [];
        return total + (Array.isArray(elements) ? elements.length : 0);
      }, 0);
    }

    return entity as ProjectEntity;
  }

  // Método privado para limpar cache
  private async clearProjectCache(projectId: string, userId: string, tenantId: string): Promise<void> {
    await this.cacheManager.del(`project:${projectId}:${userId}:${tenantId}`);

    // Limpar cache de listagens também
    const keys = await this.cacheManager.store.keys?.(`projects:${userId}:${tenantId}:*`);
    if (keys) {
      await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }
  }
}
