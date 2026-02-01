import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { PuppeteerService } from '../services/puppeteer.service';
import { PdfService } from '../services/pdf.service';
import { ProductionService } from '../services/production.service';
import { StorageService } from '../../assets/services/storage.service';
import { RenderJobData } from '../services/render.service';

@Processor('render-preview')
@Processor('render-final')
@Processor('render-3d')
@Injectable()
export class RenderProcessor {
  constructor(
    private puppeteerService: PuppeteerService,
    private pdfService: PdfService,
    private productionService: ProductionService,
    private storageService: StorageService,
    private logger: LoggerService,
  ) {}

  @Process('render')
  async handleRender(job: Job<RenderJobData>) {
    const { projectId, userId, tenantId, type, options, html, css } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Iniciando processamento do job ${job.id} - tipo: ${type}`,
        'RenderProcessor',
        { projectId, userId, type },
      );

      // Atualizar progresso
      await job.progress(10);

      let result: Buffer;
      let fileName: string;
      let contentType: string;

      if (type === 'preview') {
        // Renderizar preview
        result = await this.puppeteerService.renderHtml(html, css, options);
        fileName = `previews/${tenantId}/${projectId}/${job.id}.${options.format || 'png'}`;
        contentType = this.getContentType(options.format || 'png');
        
        await job.progress(80);
      } else if (type === 'final') {
        // Renderizar PDF final
        result = await this.puppeteerService.renderHtml(html, css, {
          ...options,
          format: 'pdf',
        });

        await job.progress(40);

        // Processar PDF para produção
        if ((options as any).includeBleed) {
          result = await this.pdfService.addBleedAndCropMarks(result);
        }

        await job.progress(60);

        // Validar PDF
        const validation = await this.pdfService.validatePdf(result);
        if (!validation.isValid) {
          throw new Error(`PDF inválido: ${validation.errors.join(', ')}`);
        }

        await job.progress(80);

        fileName = `renders/${tenantId}/${projectId}/${job.id}.pdf`;
        contentType = 'application/pdf';
      } else if ((type as string) === 'production') {
        // Renderizar PDF de produção com ProductionService
        const jobDataExtended = job.data as any;
        const productionResult = await this.productionService.generateProductionPdf(
          tenantId,
          projectId,
          jobDataExtended.pages,
          jobDataExtended.productSpecs,
          options as any,
        );

        await job.progress(90);

        // Retornar resultado específico de produção
        return {
          url: productionResult.pdfUrl,
          jobTicketUrl: productionResult.jobTicketUrl,
          processingTime: productionResult.processingTime,
          validation: productionResult.validation,
          metadata: productionResult.metadata,
        };
      } else if (type === '3d') {
        // Renderizar preview 3D (mock por enquanto)
        result = await this.render3DMock(projectId);
        fileName = `3d/${tenantId}/${projectId}/${job.id}.png`;
        contentType = 'image/png';
        
        await job.progress(80);
      }

      // Upload para storage
      const url = await this.storageService.uploadBuffer(result, fileName, {
        contentType,
        metadata: {
          projectId,
          userId,
          tenantId,
          type,
          jobId: job.id.toString(),
        },
      });

      await job.progress(100);

      const processingTime = Date.now() - startTime;

      this.logger.logUserAction(
        userId,
        `${type}_render_completed`,
        {
          projectId,
          jobId: job.id,
          processingTime,
          url,
        },
        'RenderProcessor',
      );

      return {
        url,
        processingTime,
        metadata: {
          size: result.length,
          type,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Erro no processamento do job ${job.id}`,
        error.stack,
        'RenderProcessor',
        { projectId, userId, type, processingTime },
      );

      // Log do erro para auditoria
      this.logger.logUserAction(
        userId,
        `${type}_render_failed`,
        {
          projectId,
          jobId: job.id,
          error: error.message,
          processingTime,
        },
        'RenderProcessor',
      );

      throw error;
    }
  }

  private async render3DMock(projectId: string): Promise<Buffer> {
    // Mock de renderização 3D
    // TODO: Implementar renderização 3D real com Three.js ou similar
    
    const sharp = require('sharp');
    
    const mockImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 1 },
      },
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="800" height="600">
            <rect width="800" height="600" fill="#f0f0f0"/>
            <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
              Preview 3D - Projeto ${projectId}
            </text>
            <rect x="200" y="200" width="400" height="200" fill="none" stroke="#999" stroke-width="2"/>
          </svg>
        `),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

    // Simular tempo de processamento 3D
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockImage;
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
}