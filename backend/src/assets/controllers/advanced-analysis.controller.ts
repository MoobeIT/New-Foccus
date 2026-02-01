import {
  Controller,
  Get,
  Post,
  Body,
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
import {
  AdvancedAnalysisService,
  AdvancedAnalysisResult,
  BatchAnalysisOptions,
} from '../services/advanced-analysis.service';
import { DeduplicationService } from '../services/deduplication.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantAccessGuard, TenantRoles } from '../../tenants/guards/tenant-access.guard';
import { TenantId } from '../../tenants/decorators/current-tenant.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Advanced Analysis')
@ApiBearerAuth()
@Controller('assets/analysis')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class AdvancedAnalysisController {
  constructor(
    private advancedAnalysisService: AdvancedAnalysisService,
    private deduplicationService: DeduplicationService,
    private prisma: PrismaService,
  ) {}

  @Post(':assetId/analyze')
  @ApiOperation({ summary: 'Análise completa de um asset' })
  @ApiParam({ name: 'assetId', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Análise realizada com sucesso' })
  @TenantRoles('admin', 'editor', 'user')
  async analyzeAsset(
    @Param('assetId') assetId: string,
    @TenantId() tenantId: string,
    @Body() options: Partial<BatchAnalysisOptions> = {},
  ): Promise<AdvancedAnalysisResult> {
    return this.advancedAnalysisService.analyzeAsset(assetId, tenantId, options);
  }

  @Post('batch-analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Análise em lote de múltiplos assets' })
  @ApiResponse({ status: 200, description: 'Análise em lote iniciada' })
  @TenantRoles('admin', 'editor')
  async batchAnalyze(
    @TenantId() tenantId: string,
    @Body() body: {
      assetIds?: string[];
      options?: BatchAnalysisOptions;
    },
  ): Promise<{
    processed: number;
    skipped: number;
    errors: number;
    results: AdvancedAnalysisResult[];
  }> {
    return this.advancedAnalysisService.batchAnalyze(
      tenantId,
      body.assetIds,
      body.options,
    );
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Buscar assets duplicados' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Limite de similaridade (0-1)' })
  @ApiResponse({ status: 200, description: 'Duplicatas encontradas' })
  @TenantRoles('admin', 'editor', 'user')
  async findDuplicates(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
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

  @Get('duplicates/stats')
  @ApiOperation({ summary: 'Estatísticas de duplicação' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas' })
  @TenantRoles('admin', 'editor', 'user')
  async getDuplicationStats(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    totalAssets: number;
    potentialDuplicates: number;
    duplicateGroups: number;
    storageWasted: number;
  }> {
    return this.deduplicationService.getDuplicationStats(user.id, tenantId);
  }

  @Get(':assetId/analysis')
  @ApiOperation({ summary: 'Obter resultados de análise de um asset' })
  @ApiParam({ name: 'assetId', description: 'ID do asset' })
  @ApiResponse({ status: 200, description: 'Resultados da análise' })
  @TenantRoles('admin', 'editor', 'user')
  async getAnalysisResults(
    @Param('assetId') assetId: string,
    @TenantId() tenantId: string,
  ): Promise<AdvancedAnalysisResult | null> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId },
    });

    if (!asset) {
      return null;
    }

    return this.advancedAnalysisService.analyzeAsset(assetId, tenantId, {});
  }

  @Get('quality-report')
  @ApiOperation({ summary: 'Relatório de qualidade dos assets' })
  @ApiQuery({ name: 'minQuality', required: false, description: 'Qualidade mínima (0-1)' })
  @ApiResponse({ status: 200, description: 'Relatório de qualidade' })
  @TenantRoles('admin', 'editor')
  async getQualityReport(
    @TenantId() tenantId: string,
    @Query('minQuality') minQuality?: string,
  ): Promise<{
    totalAssets: number;
    analyzedAssets: number;
    averageQuality: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
    lowQualityAssets: Array<{
      id: string;
      filename: string;
      qualityScore: number;
      issues: string[];
    }>;
  }> {
    const assets = await this.prisma.asset.findMany({
      where: { tenantId },
      select: {
        id: true,
        filename: true,
        width: true,
        height: true,
        dpi: true,
      },
    });

    const totalAssets = assets.length;
    const qualityDistribution = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
    };

    let totalQuality = 0;
    const lowQualityAssets: any[] = [];

    for (const asset of assets) {
      let quality = 0.5;
      const issues: string[] = [];

      if (asset.dpi && asset.dpi >= 300) {
        quality += 0.3;
      } else if (asset.dpi && asset.dpi < 150) {
        issues.push('DPI baixo');
      }

      if (asset.width && asset.height) {
        const megapixels = (asset.width * asset.height) / 1000000;
        if (megapixels >= 8) {
          quality += 0.2;
        } else if (megapixels < 2) {
          issues.push('Resolução baixa');
        }
      }

      quality = Math.min(quality, 1);
      totalQuality += quality;

      if (quality > 0.9) {
        qualityDistribution.excellent++;
      } else if (quality > 0.7) {
        qualityDistribution.good++;
      } else if (quality > 0.5) {
        qualityDistribution.average++;
      } else {
        qualityDistribution.poor++;
        lowQualityAssets.push({
          id: asset.id,
          filename: asset.filename,
          qualityScore: quality,
          issues,
        });
      }
    }

    return {
      totalAssets,
      analyzedAssets: totalAssets,
      averageQuality: totalAssets > 0 ? Math.round((totalQuality / totalAssets) * 100) / 100 : 0,
      qualityDistribution,
      lowQualityAssets: lowQualityAssets.slice(0, 20),
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Obter recomendações gerais de melhoria' })
  @ApiResponse({ status: 200, description: 'Recomendações obtidas' })
  @TenantRoles('admin', 'editor')
  async getRecommendations(
    @TenantId() tenantId: string,
  ): Promise<{
    totalRecommendations: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topRecommendations: Array<{
      message: string;
      count: number;
      severity: string;
      type: string;
    }>;
  }> {
    const assets = await this.prisma.asset.findMany({
      where: { tenantId },
      select: {
        id: true,
        width: true,
        height: true,
        dpi: true,
        colorProfile: true,
      },
    });

    const recommendations: any[] = [];
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const asset of assets) {
      if (asset.dpi && asset.dpi < 150) {
        recommendations.push({
          message: 'Aumentar DPI da imagem para pelo menos 300',
          type: 'quality',
          severity: 'warning',
        });
      }

      if (!asset.colorProfile || asset.colorProfile === 'untagged') {
        recommendations.push({
          message: 'Adicionar perfil de cor à imagem',
          type: 'color',
          severity: 'info',
        });
      }
    }

    for (const rec of recommendations) {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
      bySeverity[rec.severity] = (bySeverity[rec.severity] || 0) + 1;
    }

    return {
      totalRecommendations: recommendations.length,
      byType,
      bySeverity,
      topRecommendations: [
        { message: 'Usar imagens com DPI >= 300', count: byType['quality'] || 0, severity: 'warning', type: 'quality' },
        { message: 'Usar perfil de cor sRGB ou AdobeRGB', count: byType['color'] || 0, severity: 'info', type: 'color' },
      ],
    };
  }
}
