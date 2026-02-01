import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { PuppeteerService, RenderOptions, PdfRenderOptions } from './puppeteer.service';
import { QueueService } from './queue.service';
import { PdfService } from './pdf.service';
import { PreviewService, PreviewOptions } from './preview.service';
import { ProductionService, ProductionPdfOptions } from './production.service';
import { ProjectPage } from './template.service';
import { StorageService } from '../../assets/services/storage.service';
import { PrismaService } from '../../database/prisma.service';

export interface RenderJobData {
  projectId: string;
  userId: string;
  tenantId: string;
  type: 'preview' | 'final' | '3d';
  options: RenderOptions | PdfRenderOptions;
  html: string;
  css: string;
  priority?: number;
}

export interface RenderResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
  processingTime?: number;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class RenderService {
  constructor(
    private puppeteerService: PuppeteerService,
    private queueService: QueueService,
    private pdfService: PdfService,
    private previewService: PreviewService,
    private productionService: ProductionService,
    private storageService: StorageService,
    private configService: ConfigService,
    private logger: LoggerService,
    private prisma: PrismaService,
  ) {}

  async renderPreview(
    projectId: string,
    userId: string,
    tenantId: string,
    html: string,
    css: string,
    options: RenderOptions,
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      // Validar opções de renderização
      this.validateRenderOptions(options);

      // Para previews, renderizar diretamente (sem fila)
      const buffer = await this.puppeteerService.renderHtml(html, css, options);

      // Salvar preview no storage
      const fileName = `previews/${tenantId}/${projectId}/${Date.now()}.${options.format || 'png'}`;
      const url = await this.storageService.uploadBuffer(buffer, fileName, {
        contentType: this.getContentType(options.format || 'png'),
        metadata: {
          projectId,
          userId,
          tenantId,
          type: 'preview',
          width: options.width.toString(),
          height: options.height.toString(),
        },
      });

      const processingTime = Date.now() - startTime;

      this.logger.logUserAction(
        userId,
        'preview_generated',
        {
          projectId,
          processingTime,
          dimensions: `${options.width}x${options.height}`,
        },
        'RenderService',
      );

      return {
        jobId: `preview-${Date.now()}`,
        status: 'completed',
        url,
        processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro na geração de preview',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      return {
        jobId: `preview-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }

  async renderHiDPIPreview(
    projectId: string,
    userId: string,
    tenantId: string,
    page: ProjectPage,
    version: number,
    options: PreviewOptions = {},
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const result = await this.previewService.generateHiDPIPreview(
        tenantId,
        projectId,
        page,
        version,
      );

      const processingTime = Date.now() - startTime;

      this.logger.logUserAction(
        userId,
        'hidpi_preview_generated',
        {
          projectId,
          pageId: page.id,
          processingTime,
          cached: result.cached,
          dpi: result.metadata.dpi,
        },
        'RenderService',
      );

      return {
        jobId: `hidpi-preview-${Date.now()}`,
        status: 'completed',
        url: result.url,
        processingTime: result.processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro na geração de preview HiDPI',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      return {
        jobId: `hidpi-preview-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }

  async renderThumbnail(
    projectId: string,
    userId: string,
    tenantId: string,
    page: ProjectPage,
    version: number,
    maxSize: number = 300,
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const result = await this.previewService.generateThumbnail(
        tenantId,
        projectId,
        page,
        version,
        maxSize,
      );

      const processingTime = Date.now() - startTime;

      this.logger.logUserAction(
        userId,
        'thumbnail_generated',
        {
          projectId,
          pageId: page.id,
          processingTime,
          cached: result.cached,
          maxSize,
        },
        'RenderService',
      );

      return {
        jobId: `thumbnail-${Date.now()}`,
        status: 'completed',
        url: result.url,
        processingTime: result.processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro na geração de thumbnail',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      return {
        jobId: `thumbnail-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }

  async renderFinal(
    projectId: string,
    userId: string,
    tenantId: string,
    html: string,
    css: string,
    options: PdfRenderOptions,
  ): Promise<RenderResult> {
    try {
      // Validar opções de PDF
      this.validatePdfOptions(options);

      // Para render final, usar fila devido ao tempo de processamento
      const jobData: RenderJobData = {
        projectId,
        userId,
        tenantId,
        type: 'final',
        options,
        html,
        css,
        priority: 1, // Alta prioridade para renders finais
      };

      const job = await this.queueService.addRenderJob('render-final', jobData);

      this.logger.logUserAction(
        userId,
        'final_render_queued',
        { projectId, jobId: job.id },
        'RenderService',
      );

      return {
        jobId: job.id.toString(),
        status: 'queued',
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar render final',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      throw new BadRequestException('Erro ao processar solicitação de render final');
    }
  }

  async renderProductionPdf(
    projectId: string,
    userId: string,
    tenantId: string,
    pages: ProjectPage[],
    productSpecs: any,
    options: Partial<ProductionPdfOptions> = {},
  ): Promise<RenderResult> {
    try {
      // Para PDFs de produção, usar fila devido ao tempo de processamento
      const jobData: RenderJobData = {
        projectId,
        userId,
        tenantId,
        type: 'final',
        options: options as any,
        html: '', // Será gerado pelo processor
        css: '',
        priority: 2, // Prioridade máxima para produção
      };

      // Adicionar dados específicos de produção
      (jobData as any).pages = pages;
      (jobData as any).productSpecs = productSpecs;

      const job = await this.queueService.addRenderJob('render-final', jobData);

      this.logger.logUserAction(
        userId,
        'production_pdf_queued',
        { 
          projectId, 
          jobId: job.id,
          pages: pages.length,
          productType: productSpecs?.type,
        },
        'RenderService',
      );

      return {
        jobId: job.id.toString(),
        status: 'queued',
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar PDF de produção',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      throw new BadRequestException('Erro ao processar solicitação de PDF de produção');
    }
  }

  async renderProductionPdfSync(
    projectId: string,
    userId: string,
    tenantId: string,
    pages: ProjectPage[],
    productSpecs: any,
    options: Partial<ProductionPdfOptions> = {},
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const result = await this.productionService.generateProductionPdf(
        tenantId,
        projectId,
        pages,
        productSpecs,
        options,
      );

      const processingTime = Date.now() - startTime;

      this.logger.logUserAction(
        userId,
        'production_pdf_completed',
        {
          projectId,
          processingTime,
          fileSize: result.metadata.fileSize,
          validation: result.validation.isValid,
          pages: pages.length,
        },
        'RenderService',
      );

      return {
        jobId: `production-sync-${Date.now()}`,
        status: 'completed',
        url: result.pdfUrl,
        processingTime: result.processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        'Erro na geração síncrona de PDF de produção',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId, processingTime },
      );

      return {
        jobId: `production-sync-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }

  async render3D(
    projectId: string,
    userId: string,
    tenantId: string,
    productType: string,
    pages: any[],
  ): Promise<RenderResult> {
    try {
      const jobData: RenderJobData = {
        projectId,
        userId,
        tenantId,
        type: '3d',
        options: {
          width: 800,
          height: 600,
          format: 'png',
        },
        html: '', // Será gerado pelo processor
        css: '',
      };

      const job = await this.queueService.addRenderJob('render-3d', jobData);

      this.logger.logUserAction(
        userId,
        '3d_render_queued',
        { projectId, jobId: job.id, productType },
        'RenderService',
      );

      return {
        jobId: job.id.toString(),
        status: 'queued',
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar render 3D',
        error.stack,
        'RenderService',
        { projectId, userId, tenantId },
      );

      throw new BadRequestException('Erro ao processar solicitação de render 3D');
    }
  }

  async getRenderStatus(jobId: string): Promise<RenderResult | null> {
    try {
      return await this.queueService.getJobStatus(jobId);
    } catch (error) {
      this.logger.error('Erro ao consultar status do job', error.stack, 'RenderService');
      return null;
    }
  }

  async cancelRender(jobId: string, userId: string): Promise<boolean> {
    try {
      const success = await this.queueService.cancelJob(jobId);
      
      if (success) {
        this.logger.logUserAction(
          userId,
          'render_cancelled',
          { jobId },
          'RenderService',
        );
      }

      return success;
    } catch (error) {
      this.logger.error('Erro ao cancelar job', error.stack, 'RenderService');
      return false;
    }
  }

  private validateRenderOptions(options: RenderOptions): void {
    if (!options.width || !options.height) {
      throw new BadRequestException('Dimensões width e height são obrigatórias');
    }

    if (options.width < 100 || options.width > 10000) {
      throw new BadRequestException('Width deve estar entre 100 e 10000 pixels');
    }

    if (options.height < 100 || options.height > 10000) {
      throw new BadRequestException('Height deve estar entre 100 e 10000 pixels');
    }

    if (options.dpi && (options.dpi < 72 || options.dpi > 600)) {
      throw new BadRequestException('DPI deve estar entre 72 e 600');
    }

    if (options.quality && (options.quality < 1 || options.quality > 100)) {
      throw new BadRequestException('Quality deve estar entre 1 e 100');
    }
  }

  private validatePdfOptions(options: PdfRenderOptions): void {
    this.validateRenderOptions(options);

    if (options.format && options.format !== 'pdf') {
      throw new BadRequestException('Formato deve ser PDF para render final');
    }
  }

  private getContentType(format: string): string {
    const contentTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      pdf: 'application/pdf',
    };

    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  // Método para health check do serviço
  async healthCheck(): Promise<{
    puppeteer: boolean;
    queue: boolean;
    storage: boolean;
  }> {
    const [puppeteerHealth, queueHealth, storageHealth] = await Promise.allSettled([
      this.puppeteerService.healthCheck(),
      this.queueService.healthCheck(),
      this.storageService.healthCheck(),
    ]);

    return {
      puppeteer: puppeteerHealth.status === 'fulfilled' && puppeteerHealth.value,
      queue: queueHealth.status === 'fulfilled' && queueHealth.value,
      storage: storageHealth.status === 'fulfilled' && storageHealth.value,
    };
  }

  // Método para obter estatísticas de renderização
  async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    return this.queueService.getQueueStats();
  }

  // Métodos para gerenciar cache de previews
  async invalidatePreviewCache(
    tenantId: string,
    projectId: string,
    pageId?: string,
  ): Promise<void> {
    await this.previewService.invalidateCache(tenantId, projectId, pageId);
  }

  async getPreviewStats(tenantId: string): Promise<{
    cache: {
      totalFiles: number;
      totalSize: number;
      oldestFile: Date | null;
      newestFile: Date | null;
    };
  }> {
    return this.previewService.getPreviewStats(tenantId);
  }

  // ==================== PROJECT PDF GENERATION ====================

  async generateProjectPdf(
    projectId: string,
    type: 'full' | 'cover' | 'content',
    token?: string,
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      // Buscar projeto com páginas
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          pages: { orderBy: { pageNumber: 'asc' } },
          format: true,
        },
      });

      if (!project) {
        return {
          jobId: `pdf-${type}-${Date.now()}`,
          status: 'failed',
          error: 'Projeto não encontrado',
          createdAt: new Date(),
        };
      }

      // Log para debug
      console.log('📄 Páginas do projeto:', project.pages?.map((p: any) => ({
        pageNumber: p.pageNumber,
        pageType: p.pageType,
      })));

      // Filtrar páginas baseado no tipo
      let pages = project.pages || [];
      
      // Tipos de página de capa
      const coverTypes = ['cover_front', 'cover_back', 'spine', 'cover', 'capa', 'capa_frente', 'capa_verso', 'lombada'];
      
      if (type === 'cover') {
        // Primeiro tentar filtrar por pageType
        let coverPages = pages.filter((p: any) => coverTypes.includes(p.pageType?.toLowerCase()));
        
        // Se não encontrou páginas de capa por tipo, usar página 0 (ou 1) como capa
        if (coverPages.length === 0) {
          // Página 0 ou primeira página é a capa
          coverPages = pages.filter((p: any) => p.pageNumber === 0 || p.pageNumber === 1);
          // Se ainda não tem, pegar as 2 primeiras páginas (frente e verso da capa)
          if (coverPages.length === 0 && pages.length > 0) {
            coverPages = pages.slice(0, Math.min(2, pages.length));
          }
        }
        pages = coverPages;
        console.log('📕 Páginas de capa filtradas:', pages.length);
      } else if (type === 'content') {
        // Primeiro tentar filtrar excluindo por pageType
        let contentPages = pages.filter((p: any) => !coverTypes.includes(p.pageType?.toLowerCase()));
        
        // Se todas as páginas são "regular", excluir as 2 primeiras (capa frente/verso)
        if (contentPages.length === pages.length && pages.length > 2) {
          // Pular as 2 primeiras páginas (capa)
          contentPages = pages.slice(2);
        }
        pages = contentPages;
        console.log('📖 Páginas de miolo filtradas:', pages.length);
      }
      // type === 'full' mantém todas as páginas

      if (pages.length === 0) {
        return {
          jobId: `pdf-${type}-${Date.now()}`,
          status: 'failed',
          error: `Nenhuma página encontrada para o tipo: ${type}`,
          createdAt: new Date(),
        };
      }

      // Dimensões do formato (em mm, converter para pixels a 300 DPI)
      const dpi = 300;
      const mmToPixels = (mm: number) => Math.round((mm / 25.4) * dpi);
      
      const width = project.format?.width || 300;
      const height = project.format?.height || 300;
      const widthPx = mmToPixels(width);
      const heightPx = mmToPixels(height);

      // Gerar HTML para cada página
      const pagesHtml = pages.map((page: any, index: number) => {
        const elements = this.parseElements(page.elements);
        const elementsHtml = this.renderElements(elements, widthPx, heightPx);
        
        return `
          <div class="page" style="
            width: ${widthPx}px;
            height: ${heightPx}px;
            background-color: ${page.backgroundColor || '#ffffff'};
            position: relative;
            overflow: hidden;
            page-break-after: ${index < pages.length - 1 ? 'always' : 'auto'};
          ">
            ${elementsHtml}
          </div>
        `;
      }).join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { 
              size: ${widthPx}px ${heightPx}px; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .page {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .element {
              position: absolute;
            }
            .element-image img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .element-text {
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `;

      // Gerar PDF usando Puppeteer
      const pdfBuffer = await this.puppeteerService.renderHtml(fullHtml, '', {
        width: widthPx,
        height: heightPx,
        format: 'pdf',
        dpi: 300,
      });

      // Salvar PDF localmente
      const fs = await import('fs');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs', projectId);
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      
      const fileName = `${type}-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      await fs.promises.writeFile(filePath, pdfBuffer);
      
      // URL para download
      const baseUrl = this.configService.get('API_BASE_URL') || 'http://localhost:8080';
      const pdfUrl = `${baseUrl}/uploads/pdfs/${projectId}/${fileName}`;

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `PDF ${type} gerado para projeto ${projectId} - ${pages.length} páginas em ${processingTime}ms`,
        'RenderService',
      );

      return {
        jobId: `pdf-${type}-${Date.now()}`,
        status: 'completed',
        url: pdfUrl,
        processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao gerar PDF ${type}`,
        error.stack,
        'RenderService',
        { projectId },
      );

      return {
        jobId: `pdf-${type}-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }

  private parseElements(elements: any): any[] {
    if (!elements) return [];
    if (typeof elements === 'string') {
      try {
        return JSON.parse(elements);
      } catch {
        return [];
      }
    }
    if (Array.isArray(elements)) return elements;
    return [];
  }

  private renderElements(elements: any[], pageWidth: number, pageHeight: number): string {
    return elements.map((el: any) => {
      const style = `
        position: absolute;
        left: ${(el.x || 0) * (pageWidth / 100)}px;
        top: ${(el.y || 0) * (pageHeight / 100)}px;
        width: ${(el.width || 10) * (pageWidth / 100)}px;
        height: ${(el.height || 10) * (pageHeight / 100)}px;
        transform: rotate(${el.rotation || 0}deg);
      `;

      if (el.type === 'image' && el.src) {
        return `<div class="element element-image" style="${style}">
          <img src="${el.src}" alt="" />
        </div>`;
      }

      if (el.type === 'text') {
        const textStyle = `
          font-size: ${el.fontSize || 16}px;
          font-family: ${el.fontFamily || 'Arial'};
          color: ${el.color || '#000000'};
          text-align: ${el.textAlign || 'center'};
        `;
        return `<div class="element element-text" style="${style}; ${textStyle}">
          ${el.text || ''}
        </div>`;
      }

      if (el.type === 'shape') {
        const shapeStyle = `
          background-color: ${el.fill || '#cccccc'};
          border: ${el.strokeWidth || 0}px solid ${el.stroke || '#000000'};
          border-radius: ${el.borderRadius || 0}px;
        `;
        return `<div class="element" style="${style}; ${shapeStyle}"></div>`;
      }

      return '';
    }).join('');
  }

  async generatePageImage(
    pageId: string,
    token?: string,
  ): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const baseUrl = this.configService.get('API_BASE_URL') || 'http://localhost:8080';
      
      // Simular geração de imagem
      const imageUrl = `${baseUrl}/api/v1/assets/pages/${pageId}/image.png`;
      
      const processingTime = Date.now() - startTime;

      return {
        jobId: `page-image-${Date.now()}`,
        status: 'completed',
        url: imageUrl,
        processingTime,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao gerar imagem da página',
        error.stack,
        'RenderService',
        { pageId },
      );

      return {
        jobId: `page-image-${Date.now()}`,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      };
    }
  }
}