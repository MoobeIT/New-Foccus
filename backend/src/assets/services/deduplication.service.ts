import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export interface DuplicationResult {
  isDuplicate: boolean;
  similarAssets: Array<{
    id: string;
    filename: string;
    similarity: number;
  }>;
  method: 'metadata' | 'filename';
}

@Injectable()
export class DeduplicationService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  /**
   * Buscar duplicatas por metadados (tamanho, dimensões)
   */
  async findDuplicates(
    storageKey: string,
    userId: string,
    tenantId: string,
  ): Promise<DuplicationResult> {
    try {
      // Buscar asset original
      const originalAsset = await this.prisma.asset.findFirst({
        where: { storageKey, userId, tenantId },
      });

      if (!originalAsset) {
        return {
          isDuplicate: false,
          similarAssets: [],
          method: 'metadata',
        };
      }

      // Buscar assets com metadados similares
      const assets = await this.prisma.asset.findMany({
        where: {
          userId,
          tenantId,
          processingStatus: 'completed',
          id: { not: originalAsset.id },
          width: originalAsset.width,
          height: originalAsset.height,
          sizeBytes: originalAsset.sizeBytes,
        },
        select: {
          id: true,
          filename: true,
          width: true,
          height: true,
          sizeBytes: true,
        },
      });

      const similarAssets = assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        similarity: 1.0, // Metadados idênticos = 100% similar
      }));

      return {
        isDuplicate: similarAssets.length > 0,
        similarAssets,
        method: 'metadata',
      };
    } catch (error) {
      this.logger.error('Erro ao buscar duplicatas', error.stack, 'DeduplicationService');
      return {
        isDuplicate: false,
        similarAssets: [],
        method: 'metadata',
      };
    }
  }

  /**
   * Buscar duplicatas por metadados aproximados
   */
  async findDuplicatesByMetadata(
    width: number,
    height: number,
    sizeBytes: number,
    userId: string,
    tenantId: string,
    tolerance: number = 0.05,
  ): Promise<DuplicationResult> {
    try {
      const sizeTolerance = Math.floor(sizeBytes * tolerance);
      const dimensionTolerance = Math.floor(Math.max(width, height) * tolerance);

      const assets = await this.prisma.asset.findMany({
        where: {
          userId,
          tenantId,
          processingStatus: 'completed',
          width: {
            gte: width - dimensionTolerance,
            lte: width + dimensionTolerance,
          },
          height: {
            gte: height - dimensionTolerance,
            lte: height + dimensionTolerance,
          },
          sizeBytes: {
            gte: sizeBytes - sizeTolerance,
            lte: sizeBytes + sizeTolerance,
          },
        },
        select: {
          id: true,
          filename: true,
          width: true,
          height: true,
          sizeBytes: true,
        },
      });

      const similarAssets = assets.map(asset => {
        const widthDiff = asset.width ? Math.abs(asset.width - width) / width : 1;
        const heightDiff = asset.height ? Math.abs(asset.height - height) / height : 1;
        const sizeDiff = Math.abs(asset.sizeBytes - sizeBytes) / sizeBytes;
        
        const avgDiff = (widthDiff + heightDiff + sizeDiff) / 3;
        const similarity = Math.max(0, 1 - avgDiff);

        return {
          id: asset.id,
          filename: asset.filename,
          similarity: Math.round(similarity * 100) / 100,
        };
      });

      return {
        isDuplicate: similarAssets.length > 0,
        similarAssets,
        method: 'metadata',
      };
    } catch (error) {
      this.logger.error('Erro ao buscar duplicatas por metadados', error.stack, 'DeduplicationService');
      return {
        isDuplicate: false,
        similarAssets: [],
        method: 'metadata',
      };
    }
  }

  /**
   * Agrupar assets similares por nome de arquivo
   */
  async groupSimilarAssets(
    userId: string,
    tenantId: string,
    similarityThreshold: number = 0.8,
  ): Promise<Array<{
    groupId: string;
    assets: Array<{
      id: string;
      filename: string;
    }>;
    avgSimilarity: number;
  }>> {
    try {
      const assets = await this.prisma.asset.findMany({
        where: {
          userId,
          tenantId,
          processingStatus: 'completed',
        },
        select: {
          id: true,
          filename: true,
          width: true,
          height: true,
          sizeBytes: true,
        },
      });

      const groups: Array<{
        groupId: string;
        assets: Array<{ id: string; filename: string }>;
        avgSimilarity: number;
      }> = [];

      const processed = new Set<string>();

      for (const asset of assets) {
        if (processed.has(asset.id)) continue;

        const group = {
          groupId: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          assets: [{ id: asset.id, filename: asset.filename }],
          avgSimilarity: 1.0,
        };

        // Encontrar assets com mesmas dimensões e tamanho similar
        for (const otherAsset of assets) {
          if (otherAsset.id === asset.id || processed.has(otherAsset.id)) {
            continue;
          }

          // Comparar por dimensões e tamanho
          if (
            asset.width === otherAsset.width &&
            asset.height === otherAsset.height &&
            Math.abs(asset.sizeBytes - otherAsset.sizeBytes) < asset.sizeBytes * 0.1
          ) {
            group.assets.push({ id: otherAsset.id, filename: otherAsset.filename });
            processed.add(otherAsset.id);
          }
        }

        if (group.assets.length > 1) {
          groups.push(group);
        }

        processed.add(asset.id);
      }

      return groups;
    } catch (error) {
      this.logger.error('Erro ao agrupar assets similares', error.stack, 'DeduplicationService');
      return [];
    }
  }

  /**
   * Estatísticas de duplicação
   */
  async getDuplicationStats(userId: string, tenantId: string): Promise<{
    totalAssets: number;
    potentialDuplicates: number;
    duplicateGroups: number;
    storageWasted: number;
  }> {
    try {
      const assets = await this.prisma.asset.findMany({
        where: {
          userId,
          tenantId,
          processingStatus: 'completed',
        },
        select: {
          id: true,
          sizeBytes: true,
        },
      });

      const totalAssets = assets.length;

      // Encontrar grupos de duplicatas
      const groups = await this.groupSimilarAssets(userId, tenantId, 0.9);
      const duplicateGroups = groups.length;
      
      let potentialDuplicates = 0;
      let storageWasted = 0;

      for (const group of groups) {
        if (group.assets.length > 1) {
          potentialDuplicates += group.assets.length - 1;
          
          for (let i = 1; i < group.assets.length; i++) {
            const asset = assets.find(a => a.id === group.assets[i].id);
            if (asset) {
              storageWasted += asset.sizeBytes;
            }
          }
        }
      }

      return {
        totalAssets,
        potentialDuplicates,
        duplicateGroups,
        storageWasted,
      };
    } catch (error) {
      this.logger.error('Erro ao calcular estatísticas de duplicação', error.stack, 'DeduplicationService');
      return {
        totalAssets: 0,
        potentialDuplicates: 0,
        duplicateGroups: 0,
        storageWasted: 0,
      };
    }
  }
}
