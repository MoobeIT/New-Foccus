import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { PuppeteerService, RenderOptions } from './puppeteer.service';
import { TemplateService, ProjectPage } from './template.service';
import { PreviewCacheService, PreviewCacheKey } from './preview-cache.service';

export interface PreviewOptions {
  dpi?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  includeGuides?: boolean;
  useCache?: boolean;
  forceRefresh?: boolean;
}

export interface PreviewResult {
  url: string;
  cached: boolean;
  processingTime: number;
  metadata: {
    width: number;
    height: number;
    dpi: number;
    format: string;
    size: number;
  };
}

@Injectable()
export class PreviewService {
  private readonly DEFAULT_DPI = 150; // DPI padrão para previews
  private readonly HIDPI_DPI = 300; // DPI para previews HiDPI
  private readonly MAX_PREVIEW_SIZE = 4096; // Máximo 4K pixels

  constructor(
    private puppeteerService: PuppeteerService,
    private templateService: TemplateService,
    private previewCacheService: PreviewCacheService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async generatePreview(
    tenantId: string,
    projectId: string,
    page: ProjectPage,
    version: number,
    options: PreviewOptions = {},
  ): Promise<PreviewResult> {
    const startTime = Date.now();

    try {
      // Configurar opções padrão
      const previewOptions = this.normalizeOptions(options);
      
      // Validar entrada
      this.validatePreviewRequest(page, previewOptions);

      // Verificar cache se habilitado
      if (previewOptions.useCache && !previewOptions.forceRefresh) {
        const cached = await this.getCachedPreview(
          tenantId,
          projectId,
          page,
          version,
          previewOptions,
        );

        if (cached) {
          const processingTime = Date.now() - startTime;
          
          this.logger.debug(
            `Preview servido do cache: ${projectId}/${page.id}`,
            'PreviewService',
            { processingTime, cached: true },
          );

          return {
            ...cached,
            cached: true,
            processingTime,
          };
        }
      }

      // Gerar template de renderização
      const template = this.templateService.generateRenderTemplate(page, {
        dpi: previewOptions.dpi,
        includeGuides: previewOptions.includeGuides,
        safeAreaSize: 5,
      });

      // Configurar opções de renderização
      const renderOptions: RenderOptions = {
        width: template.metadata.width,
        height: template.metadata.height,
        format: previewOptions.format,
        quality: previewOptions.quality,
        dpi: previewOptions.dpi,
        timeout: this.configService.get('render.previewTimeout') || 30000,
      };

      // Renderizar preview
      const previewBuffer = await this.puppeteerService.renderHtml(
        template.html,
        template.css,
        renderOptions,
      );

      const processingTime = Date.now() - startTime;

      // Verificar SLA de 30 segundos
      if (processingTime > 30000) {
        this.logger.warn(
          `Preview excedeu SLA de 30s: ${processingTime}ms`,
          'PreviewService',
          { projectId, pageId: page.id, processingTime },
        );
      }

      // Salvar no cache se habilitado
      let previewUrl: string;
      if (previewOptions.useCache) {
        const cached = await this.setCachedPreview(
          tenantId,
          projectId,
          page,
          version,
          previewOptions,
          previewBuffer,
        );
        previewUrl = cached.url;
      } else {
        // Upload direto sem cache
        const fileName = `previews/temp/${tenantId}/${projectId}/${Date.now()}.${previewOptions.format}`;
        previewUrl = await this.uploadPreview(previewBuffer, fileName, previewOptions.format);
      }

      this.logger.debug(
        `Preview gerado: ${projectId}/${page.id}`,
        'PreviewService',
        {
          processingTime,
          dpi: previewOptions.dpi,
          size: previewBuffer.length,
          cached: false,
        },
      );

      return {
        url: previewUrl,
        cached: false,
        processingTime,
        metadata: {
          width: template.metadata.width,
          height: template.metadata.height,
          dpi: previewOptions.dpi,
          format: previewOptions.format,
          size: previewBuffer.length,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        'Erro na geração de preview',
        error.stack,
        'PreviewService',
        { projectId, pageId: page.id, processingTime },
      );

      throw new BadRequestException(`Erro na geração de preview: ${error.message}`);
    }
  }

  async generateHiDPIPreview(
    tenantId: string,
    projectId: string,
    page: ProjectPage,
    version: number,
  ): Promise<PreviewResult> {
    return this.generatePreview(tenantId, projectId, page, version, {
      dpi: this.HIDPI_DPI,
      format: 'png',
      includeGuides: false,
      useCache: true,
    });
  }

  async generateThumbnail(
    tenantId: string,
    projectId: string,
    page: ProjectPage,
    version: number,
    maxSize: number = 300,
  ): Promise<PreviewResult> {
    // Calcular DPI para thumbnail
    const aspectRatio = page.width / page.height;
    let thumbnailWidth: number;
    let thumbnailHeight: number;

    if (aspectRatio > 1) {
      thumbnailWidth = maxSize;
      thumbnailHeight = Math.round(maxSize / aspectRatio);
    } else {
      thumbnailHeight = maxSize;
      thumbnailWidth = Math.round(maxSize * aspectRatio);
    }

    // Calcular DPI necessário
    const dpi = Math.round((thumbnailWidth * 25.4) / page.width);

    return this.generatePreview(tenantId, projectId, page, version, {
      dpi: Math.max(72, Math.min(dpi, 150)), // Entre 72 e 150 DPI
      format: 'jpeg',
      quality: 85,
      includeGuides: false,
      useCache: true,
    });
  }

  async invalidateCache(tenantId: string, projectId: string, pageId?: string): Promise<void> {
    if (pageId) {
      await this.previewCacheService.invalidatePageCache(tenantId, projectId, pageId);
    } else {
      await this.previewCacheService.invalidateProjectCache(tenantId, projectId);
    }

    this.logger.debug(
      `Cache invalidado: ${projectId}${pageId ? `/${pageId}` : ''}`,
      'PreviewService',
      { tenantId, projectId, pageId },
    );
  }

  async getPreviewStats(tenantId: string): Promise<{
    cache: {
      totalFiles: number;
      totalSize: number;
      oldestFile: Date | null;
      newestFile: Date | null;
    };
  }> {
    const cacheStats = await this.previewCacheService.getCacheStats(tenantId);

    return {
      cache: cacheStats,
    };
  }

  private normalizeOptions(options: PreviewOptions): Required<PreviewOptions> {
    return {
      dpi: options.dpi || this.DEFAULT_DPI,
      format: options.format || 'png',
      quality: options.quality || (options.format === 'jpeg' ? 90 : undefined),
      includeGuides: options.includeGuides ?? false,
      useCache: options.useCache ?? true,
      forceRefresh: options.forceRefresh ?? false,
    };
  }

  private validatePreviewRequest(page: ProjectPage, options: Required<PreviewOptions>): void {
    // Validar dimensões da página
    if (!page.width || !page.height) {
      throw new BadRequestException('Dimensões da página são obrigatórias');
    }

    if (page.width < 10 || page.width > 1000) {
      throw new BadRequestException('Largura da página deve estar entre 10mm e 1000mm');
    }

    if (page.height < 10 || page.height > 1000) {
      throw new BadRequestException('Altura da página deve estar entre 10mm e 1000mm');
    }

    // Validar DPI
    if (options.dpi < 72 || options.dpi > 600) {
      throw new BadRequestException('DPI deve estar entre 72 e 600');
    }

    // Calcular tamanho final em pixels
    const pixelWidth = Math.round((page.width * options.dpi) / 25.4);
    const pixelHeight = Math.round((page.height * options.dpi) / 25.4);

    if (pixelWidth > this.MAX_PREVIEW_SIZE || pixelHeight > this.MAX_PREVIEW_SIZE) {
      throw new BadRequestException(
        `Dimensões do preview muito grandes: ${pixelWidth}x${pixelHeight}px (máximo: ${this.MAX_PREVIEW_SIZE}px)`,
      );
    }

    // Validar qualidade JPEG
    if (options.format === 'jpeg' && options.quality) {
      if (options.quality < 1 || options.quality > 100) {
        throw new BadRequestException('Qualidade JPEG deve estar entre 1 e 100');
      }
    }
  }

  private async getCachedPreview(
    tenantId: string,
    projectId: string,
    page: ProjectPage,
    version: number,
    options: Required<PreviewOptions>,
  ): Promise<Omit<PreviewResult, 'cached' | 'processingTime'> | null> {
    const cacheKey: PreviewCacheKey = {
      projectId,
      pageId: page.id,
      version,
      options: {
        width: page.width,
        height: page.height,
        dpi: options.dpi,
        format: options.format,
      },
    };

    const cached = await this.previewCacheService.getCachedPreview(tenantId, cacheKey);

    if (cached) {
      return {
        url: cached.url,
        metadata: {
          width: Math.round((page.width * options.dpi) / 25.4),
          height: Math.round((page.height * options.dpi) / 25.4),
          dpi: options.dpi,
          format: options.format,
          size: cached.size,
        },
      };
    }

    return null;
  }

  private async setCachedPreview(
    tenantId: string,
    projectId: string,
    page: ProjectPage,
    version: number,
    options: Required<PreviewOptions>,
    previewBuffer: Buffer,
  ): Promise<{ url: string }> {
    const cacheKey: PreviewCacheKey = {
      projectId,
      pageId: page.id,
      version,
      options: {
        width: page.width,
        height: page.height,
        dpi: options.dpi,
        format: options.format,
      },
    };

    const contentType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';

    const cached = await this.previewCacheService.setCachedPreview(
      tenantId,
      cacheKey,
      previewBuffer,
      contentType,
    );

    return { url: cached.url };
  }

  private async uploadPreview(
    previewBuffer: Buffer,
    fileName: string,
    format: string,
  ): Promise<string> {
    const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // Usar o StorageService através do PuppeteerService ou injetar diretamente
    // Por simplicidade, vou assumir que temos acesso ao StorageService
    const { StorageService } = await import('../../assets/services/storage.service');
    const storageService = new StorageService(this.configService, this.logger);

    return storageService.uploadBuffer(previewBuffer, fileName, {
      contentType,
      metadata: {
        type: 'preview-temp',
        format,
      },
    });
  }
}