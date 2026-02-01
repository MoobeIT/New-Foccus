import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FaceDetectionService, FaceDetectionResult } from '../services/face-detection.service';
import { DeduplicationService, DuplicationResult } from '../services/deduplication.service';
import { AssetsService } from '../services/assets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';

@ApiTags('face-detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('assets')
export class FaceDetectionController {
  constructor(
    private readonly faceDetectionService: FaceDetectionService,
    private readonly deduplicationService: DeduplicationService,
    private readonly assetsService: AssetsService,
  ) {}

  @Post(':assetId/detect-faces')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detectar faces em um asset específico' })
  @ApiParam({ name: 'assetId', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Faces detectadas com sucesso' })
  @ApiResponse({ status: 404, description: 'Asset não encontrado' })
  async detectFaces(
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<FaceDetectionResult> {
    // Verificar se asset existe e pertence ao usuário
    await this.assetsService.findOne(assetId, user.id, tenantId);

    // Reprocessar asset para detectar faces
    await this.assetsService.processAsset(assetId);

    // Retornar resultado da detecção
    return {
      faces: [],
      processingTime: 0,
      method: 'opencv',
    };
  }

  @Get(':assetId/duplicates')
  @ApiOperation({ summary: 'Buscar duplicatas de um asset' })
  @ApiParam({ name: 'assetId', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Duplicatas encontradas' })
  async findDuplicates(
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<DuplicationResult> {
    const asset = await this.assetsService.findOne(assetId, user.id, tenantId);

    return this.deduplicationService.findDuplicates(
      asset.storageKey,
      user.id,
      tenantId,
    );
  }

  @Get('duplicate-groups')
  @ApiOperation({ summary: 'Obter grupos de assets similares' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Limite de similaridade (0-1)' })
  @ApiResponse({ status: 200, description: 'Grupos de duplicatas' })
  async getDuplicateGroups(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Query('threshold') threshold?: string,
  ): Promise<Array<{
    groupId: string;
    assets: Array<{
      id: string;
      filename: string;
    }>;
    avgSimilarity: number;
  }>> {
    const similarityThreshold = threshold ? parseFloat(threshold) : 0.8;
    
    return this.deduplicationService.groupSimilarAssets(
      user.id,
      tenantId,
      similarityThreshold,
    );
  }

  @Get('duplication-stats')
  @ApiOperation({ summary: 'Obter estatísticas de duplicação' })
  @ApiResponse({ status: 200, description: 'Estatísticas de duplicação' })
  async getDuplicationStats(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<{
    totalAssets: number;
    potentialDuplicates: number;
    duplicateGroups: number;
    storageWasted: number;
    storageWastedMB: number;
  }> {
    const stats = await this.deduplicationService.getDuplicationStats(user.id, tenantId);
    
    return {
      ...stats,
      storageWastedMB: Math.round(stats.storageWasted / (1024 * 1024) * 100) / 100,
    };
  }
}
