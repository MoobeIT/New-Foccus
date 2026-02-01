import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RenderService, RenderResult } from '../services/render.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import { RenderOptions, PdfRenderOptions } from '../services/puppeteer.service';
import { ProjectPage } from '../services/template.service';
import { PreviewOptions } from '../services/preview.service';
import { ProductionPdfOptions } from '../services/production.service';
import { Public } from '../../auth/decorators/public.decorator';

class RenderPreviewDto {
  projectId: string;
  html: string;
  css: string;
  options: RenderOptions;
}

class RenderFinalDto {
  projectId: string;
  html: string;
  css: string;
  options: PdfRenderOptions;
}

class Render3DDto {
  projectId: string;
  productType: string;
  pages: any[];
}

class RenderHiDPIPreviewDto {
  projectId: string;
  page: ProjectPage;
  version: number;
  options?: PreviewOptions;
}

class RenderThumbnailDto {
  projectId: string;
  page: ProjectPage;
  version: number;
  maxSize?: number;
}

class RenderProductionPdfDto {
  projectId: string;
  pages: ProjectPage[];
  productSpecs: any;
  options?: Partial<ProductionPdfOptions>;
  async?: boolean;
}

@ApiTags('render')
@Controller('render')
export class RenderController {
  constructor(private renderService: RenderService) {}

  // ==================== PROJECT PDF ENDPOINTS ====================

  @Public()
  @Get('project/:projectId/pdf')
  @ApiOperation({ summary: 'Gerar PDF completo do projeto' })
  @ApiResponse({ status: 200, description: 'PDF gerado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async getProjectPdf(
    @Param('projectId') projectId: string,
    @Query('token') token: string,
  ): Promise<RenderResult> {
    return this.renderService.generateProjectPdf(projectId, 'full', token);
  }

  @Public()
  @Get('project/:projectId/cover-pdf')
  @ApiOperation({ summary: 'Gerar PDF da capa do projeto' })
  @ApiResponse({ status: 200, description: 'PDF da capa gerado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async getProjectCoverPdf(
    @Param('projectId') projectId: string,
    @Query('token') token: string,
  ): Promise<RenderResult> {
    return this.renderService.generateProjectPdf(projectId, 'cover', token);
  }

  @Public()
  @Get('project/:projectId/content-pdf')
  @ApiOperation({ summary: 'Gerar PDF do miolo do projeto' })
  @ApiResponse({ status: 200, description: 'PDF do miolo gerado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async getProjectContentPdf(
    @Param('projectId') projectId: string,
    @Query('token') token: string,
  ): Promise<RenderResult> {
    return this.renderService.generateProjectPdf(projectId, 'content', token);
  }

  @Public()
  @Get('page/:pageId/image')
  @ApiOperation({ summary: 'Gerar imagem de uma página' })
  @ApiResponse({ status: 200, description: 'Imagem gerada' })
  @ApiResponse({ status: 404, description: 'Página não encontrada' })
  async getPageImage(
    @Param('pageId') pageId: string,
    @Query('token') token: string,
  ): Promise<RenderResult> {
    return this.renderService.generatePageImage(pageId, token);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar preview de projeto' })
  @ApiBody({ type: RenderPreviewDto })
  @ApiResponse({ status: 200, description: 'Preview gerado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async renderPreview(
    @Body() body: RenderPreviewDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, html, css, options } = body;

    if (!projectId || !html || !options) {
      throw new BadRequestException('projectId, html e options são obrigatórios');
    }

    return this.renderService.renderPreview(
      projectId,
      user.id,
      tenantId,
      html,
      css || '',
      options,
    );
  }

  @Post('final')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Gerar PDF final para produção' })
  @ApiBody({ type: RenderFinalDto })
  @ApiResponse({ status: 202, description: 'Render final enfileirado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async renderFinal(
    @Body() body: RenderFinalDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, html, css, options } = body;

    if (!projectId || !html || !options) {
      throw new BadRequestException('projectId, html e options são obrigatórios');
    }

    // Garantir que é PDF
    options.format = 'pdf';

    return this.renderService.renderFinal(
      projectId,
      user.id,
      tenantId,
      html,
      css || '',
      options,
    );
  }

  @Post('3d')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Gerar preview 3D do produto' })
  @ApiBody({ type: Render3DDto })
  @ApiResponse({ status: 202, description: 'Render 3D enfileirado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async render3D(
    @Body() body: Render3DDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, productType, pages } = body;

    if (!projectId || !productType || !pages) {
      throw new BadRequestException('projectId, productType e pages são obrigatórios');
    }

    return this.renderService.render3D(
      projectId,
      user.id,
      tenantId,
      productType,
      pages,
    );
  }

  @Post('preview/hidpi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar preview HiDPI com cache' })
  @ApiBody({ type: RenderHiDPIPreviewDto })
  @ApiResponse({ status: 200, description: 'Preview HiDPI gerado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async renderHiDPIPreview(
    @Body() body: RenderHiDPIPreviewDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, page, version, options } = body;

    if (!projectId || !page || version === undefined) {
      throw new BadRequestException('projectId, page e version são obrigatórios');
    }

    return this.renderService.renderHiDPIPreview(
      projectId,
      user.id,
      tenantId,
      page,
      version,
      options,
    );
  }

  @Post('thumbnail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar thumbnail da página' })
  @ApiBody({ type: RenderThumbnailDto })
  @ApiResponse({ status: 200, description: 'Thumbnail gerado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async renderThumbnail(
    @Body() body: RenderThumbnailDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, page, version, maxSize } = body;

    if (!projectId || !page || version === undefined) {
      throw new BadRequestException('projectId, page e version são obrigatórios');
    }

    return this.renderService.renderThumbnail(
      projectId,
      user.id,
      tenantId,
      page,
      version,
      maxSize,
    );
  }

  @Post('production')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Gerar PDF final para produção com PDF-X4' })
  @ApiBody({ type: RenderProductionPdfDto })
  @ApiResponse({ status: 202, description: 'PDF de produção enfileirado' })
  @ApiResponse({ status: 200, description: 'PDF de produção gerado (síncrono)' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async renderProductionPdf(
    @Body() body: RenderProductionPdfDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<RenderResult> {
    const { projectId, pages, productSpecs, options, async = true } = body;

    if (!projectId || !pages || !pages.length) {
      throw new BadRequestException('projectId e pages são obrigatórios');
    }

    if (async) {
      return this.renderService.renderProductionPdf(
        projectId,
        user.id,
        tenantId,
        pages,
        productSpecs,
        options,
      );
    } else {
      return this.renderService.renderProductionPdfSync(
        projectId,
        user.id,
        tenantId,
        pages,
        productSpecs,
        options,
      );
    }
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Consultar status de renderização' })
  @ApiResponse({ status: 200, description: 'Status do job' })
  @ApiResponse({ status: 404, description: 'Job não encontrado' })
  async getRenderStatus(@Param('jobId') jobId: string): Promise<RenderResult | null> {
    return this.renderService.getRenderStatus(jobId);
  }

  @Delete('cancel/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar renderização' })
  @ApiResponse({ status: 204, description: 'Job cancelado' })
  @ApiResponse({ status: 400, description: 'Não foi possível cancelar' })
  async cancelRender(
    @Param('jobId') jobId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    const success = await this.renderService.cancelRender(jobId, user.id);
    
    if (!success) {
      throw new BadRequestException('Não foi possível cancelar o job');
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de renderização' })
  @ApiResponse({ status: 200, description: 'Estatísticas das filas' })
  async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    return this.renderService.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check do serviço de renderização' })
  @ApiResponse({ status: 200, description: 'Status dos componentes' })
  async healthCheck(): Promise<{
    puppeteer: boolean;
    queue: boolean;
    storage: boolean;
  }> {
    return this.renderService.healthCheck();
  }

  @Delete('cache/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidar cache de previews do projeto' })
  @ApiResponse({ status: 204, description: 'Cache invalidado' })
  async invalidateProjectCache(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    await this.renderService.invalidatePreviewCache(tenantId, projectId);
  }

  @Delete('cache/:projectId/:pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidar cache de previews da página' })
  @ApiResponse({ status: 204, description: 'Cache invalidado' })
  async invalidatePageCache(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    await this.renderService.invalidatePreviewCache(tenantId, projectId, pageId);
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Estatísticas do cache de previews' })
  @ApiResponse({ status: 200, description: 'Estatísticas do cache' })
  async getCacheStats(
    @CurrentTenant() tenantId: string,
  ): Promise<{
    cache: {
      totalFiles: number;
      totalSize: number;
      oldestFile: Date | null;
      newestFile: Date | null;
    };
  }> {
    return this.renderService.getPreviewStats(tenantId);
  }

  // Endpoint para testar renderização com dados mock
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar renderização com dados mock' })
  @ApiResponse({ status: 200, description: 'Teste realizado' })
  async testRender(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Query('type') type: 'preview' | 'final' | '3d' = 'preview',
  ): Promise<RenderResult> {
    const mockHtml = `
      <div class="page">
        <h1>Teste de Renderização</h1>
        <p>Este é um teste do sistema de renderização.</p>
        <div class="photo-placeholder" style="width: 200px; height: 150px; background: #ddd; margin: 20px 0;">
          Foto aqui
        </div>
      </div>
    `;

    const mockCss = `
      .page {
        width: 100%;
        height: 100%;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      
      .photo-placeholder {
        border: 2px dashed #999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
      }
    `;

    const mockOptions: RenderOptions = {
      width: 800,
      height: 600,
      format: type === 'final' ? 'pdf' : 'png',
      dpi: 300,
    };

    if (type === 'preview') {
      return this.renderService.renderPreview(
        `test-${Date.now()}`,
        user.id,
        tenantId,
        mockHtml,
        mockCss,
        mockOptions,
      );
    } else if (type === 'final') {
      return this.renderService.renderFinal(
        `test-${Date.now()}`,
        user.id,
        tenantId,
        mockHtml,
        mockCss,
        mockOptions as PdfRenderOptions,
      );
    } else {
      return this.renderService.render3D(
        `test-${Date.now()}`,
        user.id,
        tenantId,
        'fotolivro',
        [{ html: mockHtml, css: mockCss }],
      );
    }
  }
}