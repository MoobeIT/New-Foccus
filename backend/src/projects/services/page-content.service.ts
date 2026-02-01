import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { SavePagesDto, PageDto, ValidateImageDto } from '../dto/save-pages.dto';
import { SpineCalculatorService } from './spine-calculator.service';

export interface DpiValidationResult {
  dpi: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'low' | 'very_low';
  message: string;
  canPrint: boolean;
}

export interface SaveResult {
  projectId: string;
  version: number;
  savedAt: Date;
  pageCount: number;
  spineWidth?: number;
}

@Injectable()
export class PageContentService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private spineCalculator: SpineCalculatorService,
  ) {}

  /**
   * Salvar páginas completas do projeto
   */
  async savePages(
    projectId: string,
    userId: string,
    tenantId: string,
    dto: SavePagesDto,
  ): Promise<SaveResult> {
    // Verificar se projeto existe e pertence ao usuário
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, tenantId },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verificar controle de concorrência
    if (dto.version !== undefined && dto.version !== project.currentVersion) {
      throw new ConflictException(
        `Conflito de versão: esperado ${dto.version}, atual ${project.currentVersion}. Recarregue o projeto.`
      );
    }

    const newVersion = project.currentVersion + 1;

    try {
      // Usar transação para garantir consistência
      await this.prisma.$transaction(async (tx) => {
        // Deletar páginas existentes
        await tx.page.deleteMany({
          where: { projectId },
        });

        // Criar novas páginas
        for (let i = 0; i < dto.pages.length; i++) {
          const page = dto.pages[i];
          await tx.page.create({
            data: {
              projectId,
              pageNumber: i,
              pageType: this.mapPageType(page.type),
              elements: JSON.stringify(page.elements),
              backgroundColor: page.background || '#ffffff',
            },
          });
        }

        // Atualizar projeto
        await tx.project.update({
          where: { id: projectId },
          data: {
            name: dto.name,
            currentVersion: newVersion,
            pageCount: dto.pages.length,
            settings: dto.settings ? JSON.stringify(dto.settings) : project.settings,
          },
        });
      });

      // Calcular lombada se tiver papel e capa definidos
      let spineWidth: number | undefined;
      if (project.paperId && project.coverTypeId) {
        try {
          const spineResult = await this.spineCalculator.calculateSpineWidth({
            pageCount: dto.pages.length - 2, // Excluir capas
            paperId: project.paperId,
            coverTypeId: project.coverTypeId,
          });
          spineWidth = spineResult.spineWidth;

          // Atualizar lombada no projeto
          await this.prisma.project.update({
            where: { id: projectId },
            data: { spineWidth },
          });
        } catch (e) {
          this.logger.warn(`Não foi possível calcular lombada: ${e.message}`, 'PageContentService');
        }
      }

      this.logger.logUserAction(userId, 'pages_saved', {
        projectId,
        pageCount: dto.pages.length,
        version: newVersion,
      }, 'PageContentService');

      return {
        projectId,
        version: newVersion,
        savedAt: new Date(),
        pageCount: dto.pages.length,
        spineWidth,
      };
    } catch (error) {
      this.logger.error(`Erro ao salvar páginas do projeto ${projectId}`, error.stack, 'PageContentService');
      throw error;
    }
  }

  /**
   * Carregar páginas do projeto
   */
  async loadPages(
    projectId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ project: any; pages: PageDto[] }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, tenantId },
      include: {
        product: true,
        format: true,
        paper: true,
        coverType: true,
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Converter páginas do banco para formato do editor
    const pages: PageDto[] = project.pages.map((page) => ({
      id: page.id,
      type: this.reverseMapPageType(page.pageType),
      elements: JSON.parse(page.elements || '[]'),
      background: page.backgroundColor,
    }));

    return {
      project: {
        id: project.id,
        name: project.name,
        version: project.currentVersion,
        status: project.status,
        pageCount: project.pageCount,
        spineWidth: project.spineWidth,
        width: project.width,
        height: project.height,
        bleed: project.bleed,
        safeMargin: project.safeMargin,
        product: project.product,
        format: project.format,
        paper: project.paper,
        coverType: project.coverType,
        settings: project.settings ? JSON.parse(project.settings) : {},
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      pages,
    };
  }

  /**
   * Validar DPI de uma imagem para impressão
   */
  validateImageDpi(dto: ValidateImageDto): DpiValidationResult {
    const { imageWidth, imageHeight, elementWidth, elementHeight } = dto;

    // Converter mm para polegadas (1 polegada = 25.4mm)
    const elementWidthInches = elementWidth / 25.4;
    const elementHeightInches = elementHeight / 25.4;

    // Calcular DPI em cada dimensão
    const dpiWidth = imageWidth / elementWidthInches;
    const dpiHeight = imageHeight / elementHeightInches;

    // Usar o menor DPI (pior caso)
    const dpi = Math.min(dpiWidth, dpiHeight);
    const roundedDpi = Math.round(dpi);

    // Classificar qualidade
    let quality: DpiValidationResult['quality'];
    let message: string;
    let canPrint: boolean;

    if (dpi >= 300) {
      quality = 'excellent';
      message = `Excelente qualidade para impressão (${roundedDpi} DPI)`;
      canPrint = true;
    } else if (dpi >= 250) {
      quality = 'good';
      message = `Boa qualidade para impressão (${roundedDpi} DPI)`;
      canPrint = true;
    } else if (dpi >= 150) {
      quality = 'acceptable';
      message = `Qualidade aceitável, mas não ideal (${roundedDpi} DPI). Recomendado 300 DPI.`;
      canPrint = true;
    } else if (dpi >= 100) {
      quality = 'low';
      message = `Baixa qualidade - imagem pode ficar pixelada (${roundedDpi} DPI). Mínimo recomendado: 150 DPI.`;
      canPrint = true; // Permite mas avisa
    } else {
      quality = 'very_low';
      message = `Qualidade muito baixa para impressão (${roundedDpi} DPI). Use uma imagem maior ou reduza o tamanho do elemento.`;
      canPrint = false;
    }

    return { dpi: roundedDpi, quality, message, canPrint };
  }

  /**
   * Calcular lombada dinamicamente
   */
  async calculateSpine(
    pageCount: number,
    paperId?: string,
    coverTypeId?: string,
    paperThickness?: number,
    bindingTolerance?: number,
  ): Promise<{ spineWidth: number; formula: string }> {
    // Se tiver IDs, buscar do banco
    if (paperId && coverTypeId) {
      const result = await this.spineCalculator.calculateSpineWidth({
        pageCount,
        paperId,
        coverTypeId,
      });
      return {
        spineWidth: result.spineWidth,
        formula: result.formula,
      };
    }

    // Usar valores padrão ou fornecidos
    const thickness = paperThickness ?? 0.1; // 0.1mm padrão (papel 150g)
    const tolerance = bindingTolerance ?? 2; // 2mm padrão

    const spineWidth = this.spineCalculator.calculateSpineWidthRaw(
      pageCount,
      thickness,
      tolerance,
    );

    return {
      spineWidth,
      formula: `(${pageCount} páginas × ${thickness}mm) + ${tolerance}mm = ${spineWidth}mm`,
    };
  }

  /**
   * Criar versão de backup do projeto
   */
  async createVersion(
    projectId: string,
    userId: string,
    tenantId: string,
    description?: string,
  ): Promise<{ versionNumber: number }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, tenantId },
      include: { pages: true },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Criar snapshot completo
    const snapshot = {
      name: project.name,
      pageCount: project.pageCount,
      settings: project.settings,
      pages: project.pages.map(p => ({
        pageNumber: p.pageNumber,
        pageType: p.pageType,
        elements: p.elements,
        backgroundColor: p.backgroundColor,
      })),
    };

    // Buscar última versão
    const lastVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await this.prisma.projectVersion.create({
      data: {
        projectId,
        versionNumber: newVersionNumber,
        data: JSON.stringify(snapshot),
        changesSummary: description || `Versão ${newVersionNumber}`,
      },
    });

    this.logger.logUserAction(userId, 'version_created', {
      projectId,
      versionNumber: newVersionNumber,
    }, 'PageContentService');

    return { versionNumber: newVersionNumber };
  }

  /**
   * Restaurar versão anterior
   */
  async restoreVersion(
    projectId: string,
    userId: string,
    tenantId: string,
    versionNumber: number,
  ): Promise<SaveResult> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { projectId, versionNumber },
    });

    if (!version) {
      throw new NotFoundException(`Versão ${versionNumber} não encontrada`);
    }

    const snapshot = JSON.parse(version.data);

    // Converter para formato do DTO
    const pages: PageDto[] = snapshot.pages.map((p: any) => ({
      id: `restored-${p.pageNumber}`,
      type: this.reverseMapPageType(p.pageType),
      elements: JSON.parse(p.elements || '[]'),
      background: p.backgroundColor,
    }));

    return this.savePages(projectId, userId, tenantId, {
      name: snapshot.name,
      pages,
      settings: snapshot.settings ? JSON.parse(snapshot.settings) : undefined,
    });
  }

  // Helpers
  private mapPageType(type: string): string {
    switch (type) {
      case 'cover-front': return 'title';
      case 'cover-back': return 'dedication';
      default: return 'regular';
    }
  }

  private reverseMapPageType(type: string): string {
    switch (type) {
      case 'title': return 'cover-front';
      case 'dedication': return 'cover-back';
      default: return 'page';
    }
  }
}
