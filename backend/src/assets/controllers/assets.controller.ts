import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AssetsService, AssetFilters } from '../services/assets.service';
import { StorageService } from '../services/storage.service';
import { DeduplicationService } from '../services/deduplication.service';
import { GetUploadUrlDto, CompleteUploadDto, UploadAssetDto } from '../dto/upload-asset.dto';
import { AssetEntity, AssetProcessingStatus } from '../entities/asset.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly storageService: StorageService,
    private readonly deduplicationService: DeduplicationService,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Obter URL para upload direto' })
  @ApiResponse({ status: 200, description: 'URL de upload gerada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async getUploadUrl(
    @Request() req,
    @Body() dto: GetUploadUrlDto,
  ) {
    return this.assetsService.getUploadUrl(req.user.id, req.user.tenantId, dto);
  }

  @Post('complete-upload')
  @ApiOperation({ summary: 'Completar upload e processar asset' })
  @ApiResponse({ status: 201, description: 'Asset criado e processamento iniciado', type: AssetEntity })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async completeUpload(
    @Request() req,
    @Body() dto: CompleteUploadDto,
  ): Promise<AssetEntity> {
    return this.assetsService.completeUpload(req.user.id, req.user.tenantId, dto);
  }

  @Post('upload-direct')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload direto de arquivos (para desenvolvimento local)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Assets criados', type: [AssetEntity] })
  async uploadDirect(
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<AssetEntity[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const results: AssetEntity[] = [];

    for (const file of files) {
      try {
        // Upload para storage
        const storageKey = await this.storageService.uploadFile(
          `assets/${req.user.id}/${Date.now()}_${file.originalname}`,
          file.buffer,
          file.mimetype,
        );

        // Completar upload
        const asset = await this.assetsService.completeUpload(req.user.id, req.user.tenantId, {
          storageKey,
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size.toString(),
          autoProcess: true,
        });

        results.push(asset);
      } catch (error) {
        // Log do erro mas continua com outros arquivos
        console.error(`Erro ao processar arquivo ${file.originalname}:`, error);
      }
    }

    return results;
  }

  @Get()
  @ApiOperation({ summary: 'Listar assets do usuário' })
  @ApiQuery({ name: 'status', required: false, enum: AssetProcessingStatus })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Filtrar por tipo MIME' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome do arquivo' })
  @ApiQuery({ name: 'hasfaces', required: false, description: 'Filtrar por presença de faces' })
  @ApiResponse({ status: 200, description: 'Lista de assets', type: [AssetEntity] })
  async findAll(
    @Request() req,
    @Query('status') status?: AssetProcessingStatus,
    @Query('mimeType') mimeType?: string,
    @Query('search') search?: string,
    @Query('hasfaces') hasfaces?: string,
  ): Promise<AssetEntity[]> {
    const filters: AssetFilters = {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      processingStatus: status,
      mimeType,
      search,
      hasfaces: hasfaces !== undefined ? hasfaces === 'true' : undefined,
    };

    return this.assetsService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas dos assets' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos assets' })
  async getStats(@Request() req) {
    return this.assetsService.getStats(req.user.id, req.user.tenantId);
  }

  @Get('by-project/:projectId')
  @ApiOperation({ summary: 'Listar assets de um projeto' })
  @ApiParam({ name: 'projectId', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Assets do projeto', type: [AssetEntity] })
  async findByProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<AssetEntity[]> {
    return this.assetsService.findByProject(req.user.id, req.user.tenantId, projectId);
  }

  @Get('duplicates/:storageKey')
  @ApiOperation({ summary: 'Buscar duplicatas por storage key' })
  @ApiParam({ name: 'storageKey', description: 'Storage key do asset' })
  @ApiResponse({ status: 200, description: 'Assets duplicados', type: [AssetEntity] })
  async findDuplicates(
    @Request() req,
    @Param('storageKey') storageKey: string,
  ): Promise<AssetEntity[]> {
    return this.assetsService.findDuplicates(req.user.id, req.user.tenantId, decodeURIComponent(storageKey));
  }

  @Get('duplication-stats')
  @ApiOperation({ summary: 'Obter estatísticas de duplicação' })
  @ApiResponse({ status: 200, description: 'Estatísticas de duplicação' })
  async getDuplicationStats(@Request() req) {
    return this.deduplicationService.getDuplicationStats(req.user.id, req.user.tenantId);
  }

  @Get('similar-groups')
  @ApiOperation({ summary: 'Agrupar assets similares' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Limite de similaridade (0-1)' })
  @ApiResponse({ status: 200, description: 'Grupos de assets similares' })
  async getSimilarGroups(
    @Request() req,
    @Query('threshold') threshold?: string,
  ) {
    const similarityThreshold = threshold ? parseFloat(threshold) : 0.8;
    return this.deduplicationService.groupSimilarAssets(
      req.user.id,
      req.user.tenantId,
      similarityThreshold,
    );
  }

  @Get('file/:storageKey')
  @ApiOperation({ summary: 'Servir arquivo do storage local' })
  @ApiParam({ name: 'storageKey', description: 'Chave do arquivo no storage' })
  async serveFile(
    @Param('storageKey') storageKey: string,
    @Res() res: Response,
  ) {
    try {
      const decodedKey = decodeURIComponent(storageKey);
      const fileBuffer = await this.storageService.downloadFile(decodedKey);
      
      // Determinar tipo de conteúdo baseado na extensão
      const extension = decodedKey.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'tiff':
        case 'tif':
          contentType = 'image/tiff';
          break;
      }

      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'Cache-Control': 'public, max-age=31536000', // 1 ano
      });

      res.send(fileBuffer);
    } catch (error) {
      res.status(404).json({ message: 'Arquivo não encontrado' });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar asset por ID' })
  @ApiParam({ name: 'id', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Asset encontrado', type: AssetEntity })
  @ApiResponse({ status: 404, description: 'Asset não encontrado' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<AssetEntity> {
    return this.assetsService.findOne(id, req.user.id, req.user.tenantId);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Processar asset manualmente' })
  @ApiParam({ name: 'id', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Asset processado', type: AssetEntity })
  @ApiResponse({ status: 404, description: 'Asset não encontrado' })
  async processAsset(
    @Param('id') id: string,
  ): Promise<AssetEntity> {
    return this.assetsService.processAsset(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar asset' })
  @ApiParam({ name: 'id', description: 'ID do asset' })
  @ApiResponse({ status: 204, description: 'Asset deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Asset não encontrado' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.assetsService.remove(id, req.user.id, req.user.tenantId);
  }
}