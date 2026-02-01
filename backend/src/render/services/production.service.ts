import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { PuppeteerService, PdfRenderOptions } from './puppeteer.service';
import { PdfService, PdfProcessingOptions, PdfValidationResult } from './pdf.service';
import { TemplateService, ProjectPage } from './template.service';
import { StorageService } from '../../assets/services/storage.service';

export interface ProductionPdfOptions {
  // Configurações de qualidade
  dpi: number;
  colorProfile: 'CMYK' | 'PDF_X4';
  pdfStandard: 'PDF_X1A' | 'PDF_X3' | 'PDF_X4';
  
  // Marcas de produção
  includeBleed: boolean;
  bleedSize: number; // em mm
  includeCropMarks: boolean;
  includeColorBars: boolean;
  includeRegistrationMarks: boolean;
  
  // Processamento
  embedFonts: boolean;
  compressionLevel: number;
  
  // Validação
  strictValidation: boolean;
}

export interface ProductionResult {
  pdfUrl: string;
  jobTicketUrl?: string;
  validation: PdfValidationResult;
  processingTime: number;
  metadata: {
    fileSize: number;
    pageCount: number;
    colorSpace: string;
    resolution: number;
    pdfStandard: string;
    hasBleed: boolean;
    hasCropMarks: boolean;
  };
}

@Injectable()
export class ProductionService {
  private readonly DEFAULT_PRODUCTION_OPTIONS: ProductionPdfOptions = {
    dpi: 300,
    colorProfile: 'CMYK',
    pdfStandard: 'PDF_X4',
    includeBleed: true,
    bleedSize: 3,
    includeCropMarks: true,
    includeColorBars: true,
    includeRegistrationMarks: true,
    embedFonts: true,
    compressionLevel: 85,
    strictValidation: true,
  };

  constructor(
    private puppeteerService: PuppeteerService,
    private pdfService: PdfService,
    private templateService: TemplateService,
    private storageService: StorageService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async generateProductionPdf(
    tenantId: string,
    projectId: string,
    pages: ProjectPage[],
    productSpecs: any,
    options: Partial<ProductionPdfOptions> = {},
  ): Promise<ProductionResult> {
    const startTime = Date.now();
    const finalOptions = { ...this.DEFAULT_PRODUCTION_OPTIONS, ...options };

    try {
      this.logger.debug(
        `Iniciando geração de PDF de produção: ${projectId}`,
        'ProductionService',
        { pages: pages.length, options: finalOptions },
      );

      // Validar entrada
      this.validateProductionRequest(pages, finalOptions);

      // Gerar PDF para cada página
      const pdfBuffers: Buffer[] = [];
      
      for (const [index, page] of pages.entries()) {
        this.logger.debug(
          `Renderizando página ${index + 1}/${pages.length}`,
          'ProductionService',
          { pageId: page.id },
        );

        const pageBuffer = await this.renderProductionPage(page, finalOptions);
        pdfBuffers.push(pageBuffer);
      }

      // Combinar PDFs se múltiplas páginas
      let finalPdf: Buffer;
      if (pdfBuffers.length === 1) {
        finalPdf = pdfBuffers[0];
      } else {
        finalPdf = await this.combinePdfs(pdfBuffers);
      }

      // Processar PDF para produção
      finalPdf = await this.processPdfForProduction(finalPdf, finalOptions);

      // Validar PDF final
      const validation = await this.validateProductionPdf(finalPdf, finalOptions);

      if (finalOptions.strictValidation && !validation.isValid) {
        throw new BadRequestException(
          `PDF não passou na validação: ${validation.errors.join(', ')}`,
        );
      }

      // Upload do PDF final
      const pdfFileName = `production/${tenantId}/${projectId}/${Date.now()}.pdf`;
      const pdfUrl = await this.storageService.uploadBuffer(finalPdf, pdfFileName, {
        contentType: 'application/pdf',
        metadata: {
          type: 'production-pdf',
          projectId,
          tenantId,
          standard: finalOptions.pdfStandard,
          colorProfile: finalOptions.colorProfile,
          pages: pages.length.toString(),
        },
      });

      // Gerar job ticket
      let jobTicketUrl: string | undefined;
      if (productSpecs) {
        const jobTicket = await this.pdfService.generateJobTicket(
          projectId,
          validation.metadata,
          productSpecs,
        );

        const ticketFileName = `production/${tenantId}/${projectId}/${Date.now()}.jdf`;
        jobTicketUrl = await this.storageService.uploadBuffer(
          Buffer.from(jobTicket),
          ticketFileName,
          {
            contentType: 'application/xml',
            metadata: {
              type: 'job-ticket',
              projectId,
              tenantId,
            },
          },
        );
      }

      const processingTime = Date.now() - startTime;

      // Verificar SLA de 120 segundos
      if (processingTime > 120000) {
        this.logger.warn(
          `PDF de produção excedeu SLA de 120s: ${processingTime}ms`,
          'ProductionService',
          { projectId, processingTime },
        );
      }

      this.logger.debug(
        `PDF de produção gerado: ${projectId}`,
        'ProductionService',
        {
          processingTime,
          fileSize: finalPdf.length,
          validation: validation.isValid,
        },
      );

      return {
        pdfUrl,
        jobTicketUrl,
        validation,
        processingTime,
        metadata: {
          fileSize: finalPdf.length,
          pageCount: pages.length,
          colorSpace: finalOptions.colorProfile,
          resolution: finalOptions.dpi,
          pdfStandard: finalOptions.pdfStandard,
          hasBleed: finalOptions.includeBleed,
          hasCropMarks: finalOptions.includeCropMarks,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        'Erro na geração de PDF de produção',
        error.stack,
        'ProductionService',
        { projectId, processingTime },
      );

      throw error;
    }
  }

  private async renderProductionPage(
    page: ProjectPage,
    options: ProductionPdfOptions,
  ): Promise<Buffer> {
    // Gerar template com configurações de produção
    const template = this.templateService.generateRenderTemplate(page, {
      dpi: options.dpi,
      includeGuides: false, // Não incluir guias no PDF final
      includeBleed: options.includeBleed,
      bleedSize: options.bleedSize,
    });

    // Configurar opções de renderização PDF
    const renderOptions: PdfRenderOptions = {
      width: template.metadata.width,
      height: template.metadata.height,
      format: 'pdf',
      dpi: options.dpi,
      includeBleed: options.includeBleed,
      includeCropMarks: options.includeCropMarks,
      colorProfile: options.colorProfile,
      timeout: this.configService.get('render.timeout') || 120000,
    };

    return this.puppeteerService.renderHtml(
      template.html,
      template.css,
      renderOptions,
    );
  }

  private async combinePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
    try {
      // Usar mock para desenvolvimento
      if (this.configService.get('render.useMock')) {
        return this.mockCombinePdfs(pdfBuffers);
      }

      // TODO: Implementar combinação real de PDFs com PDFtk ou similar
      this.logger.debug(
        `Combinando ${pdfBuffers.length} PDFs`,
        'ProductionService',
      );

      // Por enquanto, retornar o primeiro PDF
      return pdfBuffers[0];
    } catch (error) {
      this.logger.error('Erro ao combinar PDFs', error.stack, 'ProductionService');
      throw error;
    }
  }

  private async processPdfForProduction(
    pdfBuffer: Buffer,
    options: ProductionPdfOptions,
  ): Promise<Buffer> {
    const processingOptions: PdfProcessingOptions = {
      addBleed: options.includeBleed,
      addCropMarks: options.includeCropMarks,
      colorProfile: options.colorProfile,
      pdfStandard: options.pdfStandard,
      embedFonts: options.embedFonts,
      compressionLevel: options.compressionLevel,
      bleedSize: options.bleedSize,
      includeColorBars: options.includeColorBars,
      includeRegistrationMarks: options.includeRegistrationMarks,
    };

    return this.pdfService.processPdf(pdfBuffer, processingOptions);
  }

  private async validateProductionPdf(
    pdfBuffer: Buffer,
    options: ProductionPdfOptions,
  ): Promise<PdfValidationResult> {
    if (options.strictValidation) {
      return this.pdfService.validateProductionPdf(pdfBuffer);
    } else {
      return this.pdfService.validatePdf(pdfBuffer);
    }
  }

  private validateProductionRequest(
    pages: ProjectPage[],
    options: ProductionPdfOptions,
  ): void {
    if (!pages || pages.length === 0) {
      throw new BadRequestException('Pelo menos uma página é obrigatória');
    }

    if (pages.length > 500) {
      throw new BadRequestException('Máximo de 500 páginas por PDF');
    }

    // Validar DPI
    if (options.dpi < 150 || options.dpi > 600) {
      throw new BadRequestException('DPI deve estar entre 150 e 600 para produção');
    }

    // Validar sangria
    if (options.includeBleed && (options.bleedSize < 1 || options.bleedSize > 10)) {
      throw new BadRequestException('Sangria deve estar entre 1mm e 10mm');
    }

    // Validar compressão
    if (options.compressionLevel < 50 || options.compressionLevel > 100) {
      throw new BadRequestException('Nível de compressão deve estar entre 50 e 100');
    }

    // Validar dimensões das páginas
    for (const page of pages) {
      if (!page.width || !page.height) {
        throw new BadRequestException(`Página ${page.id} não possui dimensões válidas`);
      }

      if (page.width < 50 || page.width > 1000) {
        throw new BadRequestException(
          `Largura da página ${page.id} deve estar entre 50mm e 1000mm`,
        );
      }

      if (page.height < 50 || page.height > 1000) {
        throw new BadRequestException(
          `Altura da página ${page.id} deve estar entre 50mm e 1000mm`,
        );
      }
    }
  }

  private async mockCombinePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
    // Simular tempo de combinação
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.logger.debug(
      `Mock: ${pdfBuffers.length} PDFs combinados`,
      'ProductionService',
    );

    // Retornar o primeiro PDF como mock
    return pdfBuffers[0];
  }

  // Método para obter configurações padrão de produção por tipo de produto
  getProductionDefaults(productType: string): Partial<ProductionPdfOptions> {
    const defaults: Record<string, Partial<ProductionPdfOptions>> = {
      fotolivro: {
        dpi: 300,
        colorProfile: 'CMYK',
        pdfStandard: 'PDF_X4',
        includeBleed: true,
        bleedSize: 3,
        includeCropMarks: true,
        includeColorBars: false,
        strictValidation: true,
      },
      calendario: {
        dpi: 300,
        colorProfile: 'CMYK',
        pdfStandard: 'PDF_X3',
        includeBleed: true,
        bleedSize: 2,
        includeCropMarks: true,
        includeColorBars: true,
        strictValidation: true,
      },
      cartao: {
        dpi: 300,
        colorProfile: 'CMYK',
        pdfStandard: 'PDF_X1A',
        includeBleed: true,
        bleedSize: 2,
        includeCropMarks: true,
        includeColorBars: false,
        strictValidation: true,
      },
    };

    return defaults[productType] || defaults.fotolivro;
  }
}