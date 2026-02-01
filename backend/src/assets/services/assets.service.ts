import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { StorageService } from './storage.service';
import { ImageProcessingService } from './image-processing.service';
import { FaceDetectionService } from './face-detection.service';
import { DeduplicationService } from './deduplication.service';
import { AssetEntity, AssetProcessingStatus } from '../entities/asset.entity';
import { GetUploadUrlDto, CompleteUploadDto } from '../dto/upload-asset.dto';

export interface AssetFilters {
  userId: string;
  tenantId: string;
  processingStatus?: AssetProcessingStatus;
  mimeType?: string;
  search?: string;
  hasfaces?: boolean;
}

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
    private storageService: StorageService,
    private imageProcessingService: ImageProcessingService,
    private faceDetectionService: FaceDetectionService,
    private deduplicationService: DeduplicationService,
  ) {}

  async getUploadUrl(userId: string, tenantId: string, dto: GetUploadUrlDto) {
    const { filename, mimeType, size } = dto;
    const sizeBytes = parseInt(size, 10);

    // Validar tipo de arquivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }

    // Validar tamanho
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (sizeBytes > maxSize) {
      throw new BadRequestException('Arquivo muito grande (máximo 50MB)');
    }

    try {
      const uploadInfo = await this.storageService.getUploadUrl(
        userId,
        filename,
        mimeType,
        sizeBytes,
      );

      this.logger.logUserAction(userId, 'upload_url_generated', {
        filename,
        mimeType,
        size: sizeBytes,
      }, 'AssetsService');

      return uploadInfo;
    } catch (error) {
      this.logger.error('Erro ao gerar URL de upload', error.stack, 'AssetsService');
      throw error;
    }
  }

  async completeUpload(userId: string, tenantId: string, dto: CompleteUploadDto): Promise<AssetEntity> {
    const { storageKey, filename, mimeType, sizeBytes, autoProcess = true } = dto;

    try {
      // Criar registro do asset no banco
      const asset = await this.prisma.asset.create({
        data: {
          userId,
          tenantId,
          storageKey,
          filename,
          originalName: filename,
          mimeType,
          sizeBytes: parseInt(sizeBytes, 10),
          processingStatus: AssetProcessingStatus.PENDING,
        },
      });

      this.logger.logUserAction(userId, 'asset_uploaded', {
        assetId: asset.id,
        filename,
        storageKey,
      }, 'AssetsService');

      // Processar automaticamente se solicitado
      if (autoProcess) {
        // Processar em background (não aguardar)
        this.processAssetAsync(asset.id).catch(error => {
          this.logger.error(`Erro no processamento automático do asset ${asset.id}`, error.stack, 'AssetsService');
        });
      }

      return this.buildAssetEntity(asset);
    } catch (error) {
      this.logger.error('Erro ao completar upload', error.stack, 'AssetsService');
      throw error;
    }
  }

  async processAsset(assetId: string): Promise<AssetEntity> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset não encontrado');
    }

    if (asset.processingStatus === AssetProcessingStatus.PROCESSING) {
      throw new BadRequestException('Asset já está sendo processado');
    }

    try {
      // Marcar como processando
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { processingStatus: AssetProcessingStatus.PROCESSING },
      });

      // Baixar arquivo do storage
      const fileBuffer = await this.storageService.downloadFile(asset.storageKey);

      // Processar imagem
      const processingResult = await this.imageProcessingService.processImage(
        fileBuffer,
        asset.filename,
      );

      // Detectar faces
      const faceDetectionResult = await this.faceDetectionService.detectFaces(
        fileBuffer,
        asset.filename,
      );

      // Upload dos thumbnails
      const thumbnailUrls: Record<string, string> = {};
      for (const [size, thumbnailBuffer] of Object.entries(processingResult.thumbnails)) {
        const thumbnailKey = `${asset.storageKey}_thumb_${size}.jpg`;
        await this.storageService.uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg');
        thumbnailUrls[size] = await this.storageService.getFileUrl(thumbnailKey);
      }

      // Calcular DPI se possível
      let dpi: number | null = null;
      if (processingResult.exifData.density) {
        dpi = processingResult.exifData.density;
      } else if (processingResult.metadata.density) {
        dpi = processingResult.metadata.density;
      }

      // Atualizar asset com dados processados
      const updatedAsset = await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          width: processingResult.metadata.width,
          height: processingResult.metadata.height,
          dpi,
          exifData: JSON.stringify(processingResult.exifData),
          thumbnailSmall: thumbnailUrls['small'] || null,
          thumbnailMedium: thumbnailUrls['medium'] || null,
          thumbnailLarge: thumbnailUrls['large'] || null,
          processingStatus: AssetProcessingStatus.COMPLETED,
        },
      });

      this.logger.logUserAction(asset.userId, 'asset_processed', {
        assetId,
        width: processingResult.metadata.width,
        height: processingResult.metadata.height,
        facesCount: faceDetectionResult.faces?.length || 0,
      }, 'AssetsService');

      return this.buildAssetEntity(updatedAsset);
    } catch (error) {
      // Marcar como falha
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { processingStatus: AssetProcessingStatus.FAILED },
      });

      this.logger.error(`Erro ao processar asset ${assetId}`, error.stack, 'AssetsService');
      throw error;
    }
  }

  async findAll(filters: AssetFilters): Promise<AssetEntity[]> {
    const { userId, tenantId, processingStatus, mimeType, search } = filters;

    const where: any = {
      userId,
      tenantId,
    };

    if (processingStatus) {
      where.processingStatus = processingStatus;
    }

    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (search) {
      where.filename = {
        contains: search,
      };
    }

    // Note: hasfaces filter removed - field not in schema

    const assets = await this.prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(assets.map(asset => this.buildAssetEntity(asset)));
  }

  async findOne(id: string, userId: string, tenantId: string): Promise<AssetEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const asset = await this.prisma.asset.findFirst({
      where: { id, userId, tenantId },
    });

    if (!asset) {
      throw new NotFoundException('Asset não encontrado');
    }

    return this.buildAssetEntity(asset);
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    const asset = await this.findOne(id, userId, tenantId);

    try {
      // Deletar arquivo do storage
      await this.storageService.deleteFile(asset.storageKey);

      // Deletar thumbnails
      if (asset.thumbnailUrls) {
        for (const size of Object.keys(asset.thumbnailUrls)) {
          const thumbnailKey = `${asset.storageKey}_thumb_${size}.jpg`;
          try {
            await this.storageService.deleteFile(thumbnailKey);
          } catch (error) {
            // Ignorar erros de thumbnail não encontrado
            this.logger.warn(`Thumbnail não encontrado: ${thumbnailKey}`, 'AssetsService');
          }
        }
      }

      // Deletar registro do banco
      await this.prisma.asset.delete({
        where: { id },
      });

      this.logger.logUserAction(userId, 'asset_deleted', { assetId: id }, 'AssetsService');
    } catch (error) {
      this.logger.error(`Erro ao deletar asset ${id}`, error.stack, 'AssetsService');
      throw error;
    }
  }

  async findDuplicates(userId: string, tenantId: string, storageKey: string): Promise<AssetEntity[]> {
    // Note: phash field not in schema, using storageKey for basic duplicate check
    if (!storageKey) {
      return [];
    }

    const assets = await this.prisma.asset.findMany({
      where: {
        userId,
        tenantId,
        storageKey,
        processingStatus: AssetProcessingStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(assets.map(asset => this.buildAssetEntity(asset)));
  }

  async findByProject(userId: string, tenantId: string, projectId: string): Promise<AssetEntity[]> {
    // Note: faces field not in schema, replaced with findByProject
    const assets = await this.prisma.asset.findMany({
      where: {
        userId,
        tenantId,
        projectId,
        processingStatus: AssetProcessingStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(assets.map(asset => this.buildAssetEntity(asset)));
  }

  async getStats(userId: string, tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byMimeType: Record<string, number>;
    totalSize: number;
    byProject: number;
  }> {
    const assets = await this.prisma.asset.findMany({
      where: { userId, tenantId },
      select: {
        processingStatus: true,
        mimeType: true,
        sizeBytes: true,
        projectId: true,
      },
    });

    const stats = {
      total: assets.length,
      byStatus: {} as Record<string, number>,
      byMimeType: {} as Record<string, number>,
      totalSize: 0,
      byProject: 0,
    };

    assets.forEach(asset => {
      // Por status
      stats.byStatus[asset.processingStatus] = (stats.byStatus[asset.processingStatus] || 0) + 1;

      // Por tipo MIME
      stats.byMimeType[asset.mimeType] = (stats.byMimeType[asset.mimeType] || 0) + 1;

      // Tamanho total
      stats.totalSize += Number(asset.sizeBytes);

      // Com projeto associado
      if (asset.projectId) {
        stats.byProject++;
      }
    });

    return stats;
  }

  // Método privado para processar asset em background
  private async processAssetAsync(assetId: string): Promise<void> {
    try {
      await this.processAsset(assetId);
    } catch (error) {
      this.logger.error(`Erro no processamento automático do asset ${assetId}`, error.stack, 'AssetsService');
    }
  }

  // Método privado para construir entidade com URLs
  private async buildAssetEntity(asset: any): Promise<AssetEntity> {
    const entity = new AssetEntity(asset);

    // Adicionar URLs computadas
    try {
      entity.url = await this.storageService.getFileUrl(asset.storageKey);

      // Usar campos do schema diretamente
      if (asset.thumbnailSmall) {
        entity.thumbnailSmall = asset.thumbnailSmall;
      }
      if (asset.thumbnailMedium) {
        entity.thumbnailMedium = asset.thumbnailMedium;
      }
      if (asset.thumbnailLarge) {
        entity.thumbnailLarge = asset.thumbnailLarge;
      }
    } catch (error) {
      this.logger.warn(`Erro ao gerar URLs para asset ${asset.id}`, 'AssetsService');
    }

    return entity;
  }
}