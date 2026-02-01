import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { PageContentService } from '../services/page-content.service';
import { SpineCalculatorService } from '../services/spine-calculator.service';
import { SavePagesDto, ValidateImageDto, CalculateSpineDto } from '../dto/save-pages.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { StorageService } from '../../assets/services/storage.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('editor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('editor')
export class EditorController {
  constructor(
    private readonly pageContentService: PageContentService,
    private readonly spineCalculator: SpineCalculatorService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // PROJETO
  // ==========================================

  @Get('project/:id')
  @ApiOperation({ summary: 'Carregar projeto completo para o editor' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Projeto carregado com páginas' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async loadProject(@Request() req, @Param('id') id: string) {
    return this.pageContentService.loadPages(id, req.user.id, req.user.tenantId);
  }

  @Post('project/:id/save')
  @ApiOperation({ summary: 'Salvar páginas do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Projeto salvo com sucesso' })
  @ApiResponse({ status: 409, description: 'Conflito de versão' })
  async saveProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SavePagesDto,
  ) {
    return this.pageContentService.savePages(id, req.user.id, req.user.tenantId, dto);
  }

  @Post('project/:id/version')
  @ApiOperation({ summary: 'Criar versão de backup do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  async createVersion(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { description?: string },
  ) {
    return this.pageContentService.createVersion(
      id,
      req.user.id,
      req.user.tenantId,
      body.description,
    );
  }

  @Post('project/:id/restore/:version')
  @ApiOperation({ summary: 'Restaurar versão anterior do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiParam({ name: 'version', description: 'Número da versão' })
  async restoreVersion(
    @Request() req,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.pageContentService.restoreVersion(
      id,
      req.user.id,
      req.user.tenantId,
      parseInt(version, 10),
    );
  }

  @Get('project/:id/versions')
  @ApiOperation({ summary: 'Listar versões do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  async listVersions(@Request() req, @Param('id') id: string) {
    const versions = await this.prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: 'desc' },
      select: {
        versionNumber: true,
        changesSummary: true,
        createdAt: true,
        isProduction: true,
      },
    });
    return versions;
  }

  // ==========================================
  // UPLOAD DE FOTOS
  // ==========================================

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de foto para o editor' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Foto enviada com sucesso' })
  async uploadPhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { projectId?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // Validar tipo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.');
    }

    // Validar tamanho (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Máximo 50MB.');
    }

    // Gerar nome único
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `editor/${req.user.id}/${timestamp}_${safeName}`;

    // Upload para storage
    await this.storageService.uploadFile(storageKey, file.buffer, file.mimetype);

    // Obter URL
    const url = await this.storageService.getFileUrl(storageKey);

    // Extrair dimensões da imagem (simplificado)
    let width = 0;
    let height = 0;
    try {
      // Tentar extrair dimensões do buffer (para JPEG/PNG)
      const dimensions = this.getImageDimensions(file.buffer, file.mimetype);
      width = dimensions.width;
      height = dimensions.height;
    } catch (e) {
      // Ignorar erro de dimensões
    }

    // Criar registro no banco
    const asset = await this.prisma.asset.create({
      data: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        projectId: body.projectId || null,
        filename: safeName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        url,
        width: width || null,
        height: height || null,
        processingStatus: 'completed',
      },
    });

    return {
      id: asset.id,
      url,
      storageKey,
      filename: file.originalname,
      width,
      height,
      size: file.size,
    };
  }

  @Post('upload-batch')
  @UseInterceptors(FileInterceptor('files'))
  @ApiOperation({ summary: 'Upload de múltiplas fotos' })
  @ApiConsumes('multipart/form-data')
  async uploadPhotoBatch(
    @Request() req,
    @UploadedFile() files: Express.Multer.File[],
    @Body() body: { projectId?: string },
  ) {
    // Este endpoint seria para upload em lote
    // Por simplicidade, redireciona para upload individual
    throw new BadRequestException('Use o endpoint /editor/upload para cada arquivo');
  }

  // ==========================================
  // VALIDAÇÃO DE QUALIDADE
  // ==========================================

  @Post('validate-dpi')
  @ApiOperation({ summary: 'Validar DPI de imagem para impressão' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  validateDpi(@Body() dto: ValidateImageDto) {
    return this.pageContentService.validateImageDpi(dto);
  }

  @Post('validate-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Validar imagem completa (DPI, cores, etc)' })
  @ApiConsumes('multipart/form-data')
  async validateImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { elementWidth: string; elementHeight: string },
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const elementWidth = parseFloat(body.elementWidth);
    const elementHeight = parseFloat(body.elementHeight);

    if (isNaN(elementWidth) || isNaN(elementHeight)) {
      throw new BadRequestException('Dimensões do elemento inválidas');
    }

    // Extrair dimensões
    const dimensions = this.getImageDimensions(file.buffer, file.mimetype);

    // Validar DPI
    const dpiResult = this.pageContentService.validateImageDpi({
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      elementWidth,
      elementHeight,
    });

    return {
      ...dpiResult,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      elementWidth,
      elementHeight,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  // ==========================================
  // CÁLCULO DE LOMBADA
  // ==========================================

  @Post('calculate-spine')
  @ApiOperation({ summary: 'Calcular largura da lombada' })
  @ApiResponse({ status: 200, description: 'Largura da lombada calculada' })
  async calculateSpine(@Body() dto: CalculateSpineDto) {
    return this.pageContentService.calculateSpine(
      dto.pageCount,
      dto.paperId,
      dto.coverTypeId,
      dto.paperThickness,
      dto.bindingTolerance,
    );
  }

  @Get('spine-presets')
  @ApiOperation({ summary: 'Obter presets de lombada por tipo de papel' })
  async getSpinePresets(@Request() req) {
    // Buscar papéis e capas disponíveis
    const papers = await this.prisma.paper.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      select: { id: true, name: true, thickness: true, weight: true },
    });

    const coverTypes = await this.prisma.coverType.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      select: { id: true, name: true, bindingTolerance: true, type: true },
    });

    // Calcular exemplos de lombada
    const examples = [];
    for (const paper of papers.slice(0, 3)) {
      for (const cover of coverTypes.slice(0, 2)) {
        const spine20 = this.spineCalculator.calculateSpineWidthRaw(20, paper.thickness, cover.bindingTolerance);
        const spine40 = this.spineCalculator.calculateSpineWidthRaw(40, paper.thickness, cover.bindingTolerance);
        const spine60 = this.spineCalculator.calculateSpineWidthRaw(60, paper.thickness, cover.bindingTolerance);

        examples.push({
          paper: paper.name,
          paperId: paper.id,
          cover: cover.name,
          coverTypeId: cover.id,
          spines: {
            '20_pages': spine20,
            '40_pages': spine40,
            '60_pages': spine60,
          },
        });
      }
    }

    return {
      papers,
      coverTypes,
      examples,
    };
  }

  // ==========================================
  // CONFIGURAÇÕES DO PRODUTO
  // ==========================================

  @Get('product-config/:productId')
  @ApiOperation({ summary: 'Obter configurações do produto para o editor' })
  @ApiParam({ name: 'productId', description: 'ID do produto' })
  async getProductConfig(@Request() req, @Param('productId') productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: req.user.tenantId, isActive: true },
      include: {
        formats: {
          where: { isActive: true },
        },
        productPapers: {
          where: { isActive: true },
          include: { paper: true },
        },
        productCoverTypes: {
          where: { isActive: true },
          include: { coverType: true },
        },
      },
    });

    if (!product) {
      throw new BadRequestException('Produto não encontrado');
    }

    return {
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        minPages: product.minPages,
        maxPages: product.maxPages,
        pageIncrement: product.pageIncrement,
        basePagesIncluded: product.basePagesIncluded,
      },
      formats: product.formats.map(f => ({
        id: f.id,
        name: f.name,
        width: f.width,
        height: f.height,
        orientation: f.orientation,
        bleed: f.bleed,
        safeMargin: f.safeMargin,
        gutterMargin: f.gutterMargin,
      })),
      papers: product.productPapers.map(pp => ({
        id: pp.paper.id,
        name: pp.paper.name,
        type: pp.paper.type,
        weight: pp.paper.weight,
        thickness: pp.paper.thickness,
        finish: pp.paper.finish,
        isDefault: pp.isDefault,
        priceAdjustment: pp.priceAdjustment,
      })),
      coverTypes: product.productCoverTypes.map(pc => ({
        id: pc.coverType.id,
        name: pc.coverType.name,
        type: pc.coverType.type,
        material: pc.coverType.material,
        bindingTolerance: pc.coverType.bindingTolerance,
        isDefault: pc.isDefault,
        priceAdjustment: pc.priceAdjustment,
      })),
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } {
    // Implementação simplificada para JPEG e PNG
    if (mimeType === 'image/jpeg') {
      return this.getJpegDimensions(buffer);
    } else if (mimeType === 'image/png') {
      return this.getPngDimensions(buffer);
    }
    return { width: 0, height: 0 };
  }

  private getJpegDimensions(buffer: Buffer): { width: number; height: number } {
    // JPEG: procurar marcador SOF0 (0xFFC0) ou SOF2 (0xFFC2)
    let i = 2; // Pular SOI marker
    while (i < buffer.length) {
      if (buffer[i] !== 0xFF) {
        i++;
        continue;
      }
      const marker = buffer[i + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        // SOF0 ou SOF2
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      // Pular para próximo marcador
      const length = buffer.readUInt16BE(i + 2);
      i += 2 + length;
    }
    return { width: 0, height: 0 };
  }

  private getPngDimensions(buffer: Buffer): { width: number; height: number } {
    // PNG: dimensões estão no chunk IHDR (bytes 16-23)
    if (buffer.length < 24) return { width: 0, height: 0 };
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
}
