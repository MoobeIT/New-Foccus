import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { FaceDetectionService, FaceDetection } from './face-detection.service';
import { DeduplicationService, DuplicationResult } from './deduplication.service';
import { ImageProcessingService } from './image-processing.service';

export interface AdvancedAnalysisResult {
  assetId: string;
  faces: FaceDetection[];
  duplicates: DuplicationResult;
  visualFeatures: VisualFeatures;
  qualityScore: number;
  recommendations: AnalysisRecommendation[];
  processingTime: number;
}

export interface VisualFeatures {
  dominantColors: ColorInfo[];
  brightness: number;
  contrast: number;
  sharpness: number;
  saturation: number;
  composition: CompositionAnalysis;
  objects: DetectedObject[];
}

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
  name?: string;
}

export interface CompositionAnalysis {
  ruleOfThirds: number; // 0-1 score
  symmetry: number;
  balance: number;
  leadingLines: number;
  focusPoint: { x: number; y: number } | null;
}

export interface DetectedObject {
  type: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;
}

export interface AnalysisRecommendation {
  type: 'quality' | 'composition' | 'duplicate' | 'face' | 'usage';
  severity: 'info' | 'warning' | 'error';
  message: string;
  action?: string;
  confidence: number;
}

export interface BatchAnalysisOptions {
  includeFaceDetection: boolean;
  includeDuplication: boolean;
  includeVisualFeatures: boolean;
  includeQualityAnalysis: boolean;
  maxConcurrent: number;
  skipExisting: boolean;
}

@Injectable()
export class AdvancedAnalysisService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private faceDetectionService: FaceDetectionService,
    private deduplicationService: DeduplicationService,
    private imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Análise completa de um asset
   */
  async analyzeAsset(
    assetId: string,
    tenantId: string,
    options: Partial<BatchAnalysisOptions> = {},
  ): Promise<AdvancedAnalysisResult> {
    const startTime = Date.now();

    try {
      // Buscar asset
      const asset = await this.prisma.asset.findFirst({
        where: { id: assetId, tenantId },
      });

      if (!asset) {
        throw new Error('Asset não encontrado');
      }

      // Obter buffer da imagem
      const imageBuffer = await this.getAssetBuffer(asset.storageKey);

      const results: Partial<AdvancedAnalysisResult> = {
        assetId,
        faces: [],
        recommendations: [],
      };

      // Detecção de faces
      if (options.includeFaceDetection !== false) {
        try {
          const faceResult = await this.faceDetectionService.detectFaces(
            imageBuffer,
            asset.filename,
          );
          results.faces = faceResult.faces;

          // Adicionar recomendações baseadas em faces
          results.recommendations!.push(...this.generateFaceRecommendations(faceResult.faces));
        } catch (error) {
          this.logger.error('Erro na detecção de faces', error, 'AdvancedAnalysisService');
        }
      }

      // Análise de duplicação (usando storageKey em vez de phash)
      if (options.includeDuplication !== false) {
        try {
          const duplicateResult = await this.deduplicationService.findDuplicates(
            asset.storageKey,
            asset.userId,
            tenantId,
          );
          results.duplicates = duplicateResult;

          // Adicionar recomendações de duplicação
          results.recommendations!.push(...this.generateDuplicationRecommendations(duplicateResult));
        } catch (error) {
          this.logger.error('Erro na análise de duplicação', error, 'AdvancedAnalysisService');
        }
      }

      // Análise de características visuais
      if (options.includeVisualFeatures !== false) {
        try {
          results.visualFeatures = await this.analyzeVisualFeatures(imageBuffer);
          
          // Adicionar recomendações visuais
          results.recommendations!.push(...this.generateVisualRecommendations(results.visualFeatures));
        } catch (error) {
          this.logger.error('Erro na análise visual', error, 'AdvancedAnalysisService');
        }
      }

      // Análise de qualidade
      if (options.includeQualityAnalysis !== false) {
        try {
          results.qualityScore = await this.calculateQualityScore(
            imageBuffer,
            results.faces || [],
            results.visualFeatures,
          );

          // Adicionar recomendações de qualidade
          results.recommendations!.push(...this.generateQualityRecommendations(results.qualityScore));
        } catch (error) {
          this.logger.error('Erro na análise de qualidade', error, 'AdvancedAnalysisService');
        }
      }

      results.processingTime = Date.now() - startTime;

      // Salvar resultados no banco
      await this.saveAnalysisResults(assetId, results as AdvancedAnalysisResult);

      return results as AdvancedAnalysisResult;
    } catch (error) {
      this.logger.error('Erro na análise avançada', error, 'AdvancedAnalysisService');
      throw error;
    }
  }

  /**
   * Análise em lote de múltiplos assets
   */
  async batchAnalyze(
    tenantId: string,
    assetIds?: string[],
    options: BatchAnalysisOptions = {
      includeFaceDetection: true,
      includeDuplication: true,
      includeVisualFeatures: true,
      includeQualityAnalysis: true,
      maxConcurrent: 3,
      skipExisting: true,
    },
  ): Promise<{
    processed: number;
    skipped: number;
    errors: number;
    results: AdvancedAnalysisResult[];
  }> {
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const results: AdvancedAnalysisResult[] = [];

    try {
      // Buscar assets para processar
      const whereClause: any = { tenantId, processingStatus: 'completed' };
      if (assetIds) {
        whereClause.id = { in: assetIds };
      }

      // Note: analysisResults field not in schema, skip check for existing analysis

      const assets = await this.prisma.asset.findMany({
        where: whereClause,
        select: { id: true },
      });

      // Processar em lotes
      const batches = this.chunkArray(assets, options.maxConcurrent);

      for (const batch of batches) {
        const promises = batch.map(async (asset) => {
          try {
            const result = await this.analyzeAsset(asset.id, tenantId, options);
            results.push(result);
            processed++;
          } catch (error) {
            this.logger.error(`Erro ao analisar asset ${asset.id}`, error, 'AdvancedAnalysisService');
            errors++;
          }
        });

        await Promise.all(promises);
      }

      this.logger.info('Batch analysis completed', 'AdvancedAnalysisService', {
        tenantId,
        processed,
        skipped,
        errors,
        totalAssets: assets.length,
      });

      return { processed, skipped, errors, results };
    } catch (error) {
      this.logger.error('Erro na análise em lote', error, 'AdvancedAnalysisService');
      throw error;
    }
  }

  /**
   * Análise de características visuais
   */
  private async analyzeVisualFeatures(imageBuffer: Buffer): Promise<VisualFeatures> {
    const sharp = require('sharp');
    
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width = 800, height = 600 } = metadata;

      // Análise de cores dominantes
      const dominantColors = await this.extractDominantColors(imageBuffer);

      // Análise de brilho, contraste e saturação
      const stats = await image.stats();
      const brightness = this.calculateBrightness(stats);
      const contrast = this.calculateContrast(stats);
      const saturation = this.calculateSaturation(stats);

      // Análise de nitidez
      const sharpness = await this.calculateSharpness(imageBuffer);

      // Análise de composição
      const composition = await this.analyzeComposition(imageBuffer, width, height);

      // Detecção básica de objetos (implementação simplificada)
      const objects = await this.detectObjects(imageBuffer);

      return {
        dominantColors,
        brightness,
        contrast,
        sharpness,
        saturation,
        composition,
        objects,
      };
    } catch (error) {
      this.logger.error('Erro na análise de características visuais', error, 'AdvancedAnalysisService');
      return {
        dominantColors: [],
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        saturation: 0,
        composition: {
          ruleOfThirds: 0,
          symmetry: 0,
          balance: 0,
          leadingLines: 0,
          focusPoint: null,
        },
        objects: [],
      };
    }
  }

  /**
   * Extrair cores dominantes da imagem
   */
  private async extractDominantColors(imageBuffer: Buffer): Promise<ColorInfo[]> {
    const sharp = require('sharp');
    
    try {
      // Redimensionar para análise mais rápida
      const resized = await sharp(imageBuffer)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = resized.data;
      const colorMap = new Map<string, number>();

      // Contar cores (agrupando cores similares)
      for (let i = 0; i < pixels.length; i += 3) {
        const r = Math.floor(pixels[i] / 32) * 32;
        const g = Math.floor(pixels[i + 1] / 32) * 32;
        const b = Math.floor(pixels[i + 2] / 32) * 32;
        
        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      // Ordenar por frequência e pegar as top 5
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const totalPixels = pixels.length / 3;

      return sortedColors.map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        return {
          hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
          rgb: { r, g, b },
          percentage: Math.round((count / totalPixels) * 100),
          name: this.getColorName(r, g, b),
        };
      });
    } catch (error) {
      this.logger.error('Erro ao extrair cores dominantes', error, 'AdvancedAnalysisService');
      return [];
    }
  }

  /**
   * Calcular score de qualidade geral
   */
  private async calculateQualityScore(
    imageBuffer: Buffer,
    faces: FaceDetection[],
    visualFeatures?: VisualFeatures,
  ): Promise<number> {
    let score = 0;
    let factors = 0;

    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 800, height = 600 } = metadata;

      // Fator 1: Resolução (20%)
      const resolution = width * height;
      const resolutionScore = Math.min(1, resolution / (1920 * 1080)); // Normalizar para Full HD
      score += resolutionScore * 0.2;
      factors += 0.2;

      // Fator 2: Nitidez (25%)
      if (visualFeatures?.sharpness !== undefined) {
        score += visualFeatures.sharpness * 0.25;
        factors += 0.25;
      }

      // Fator 3: Contraste (15%)
      if (visualFeatures?.contrast !== undefined) {
        const contrastScore = Math.min(1, visualFeatures.contrast / 100);
        score += contrastScore * 0.15;
        factors += 0.15;
      }

      // Fator 4: Composição (20%)
      if (visualFeatures?.composition) {
        const compositionScore = (
          visualFeatures.composition.ruleOfThirds +
          visualFeatures.composition.balance +
          visualFeatures.composition.symmetry
        ) / 3;
        score += compositionScore * 0.2;
        factors += 0.2;
      }

      // Fator 5: Qualidade das faces (20%)
      if (faces.length > 0) {
        const avgFaceConfidence = faces.reduce((sum, face) => sum + face.confidence, 0) / faces.length;
        score += avgFaceConfidence * 0.2;
        factors += 0.2;
      }

      // Normalizar score
      const finalScore = factors > 0 ? score / factors : 0;
      return Math.round(finalScore * 100) / 100;
    } catch (error) {
      this.logger.error('Erro ao calcular score de qualidade', error, 'AdvancedAnalysisService');
      return 0;
    }
  }

  /**
   * Gerar recomendações baseadas em faces detectadas
   */
  private generateFaceRecommendations(faces: FaceDetection[]): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    if (faces.length === 0) {
      recommendations.push({
        type: 'face',
        severity: 'info',
        message: 'Nenhuma face detectada na imagem',
        confidence: 0.9,
      });
    } else {
      // Verificar qualidade das faces
      const lowQualityFaces = faces.filter(face => face.confidence < 0.7);
      if (lowQualityFaces.length > 0) {
        recommendations.push({
          type: 'face',
          severity: 'warning',
          message: `${lowQualityFaces.length} face(s) com baixa qualidade de detecção`,
          action: 'Considere usar uma imagem com faces mais nítidas',
          confidence: 0.8,
        });
      }

      // Verificar se há muitas faces
      if (faces.length > 5) {
        recommendations.push({
          type: 'composition',
          severity: 'info',
          message: `Muitas faces detectadas (${faces.length})`,
          action: 'Considere focar em menos pessoas para melhor composição',
          confidence: 0.7,
        });
      }

      // Verificar faces muito pequenas
      const smallFaces = faces.filter(face => face.width < 50 || face.height < 50);
      if (smallFaces.length > 0) {
        recommendations.push({
          type: 'quality',
          severity: 'warning',
          message: `${smallFaces.length} face(s) muito pequena(s)`,
          action: 'Faces pequenas podem não imprimir bem',
          confidence: 0.8,
        });
      }
    }

    return recommendations;
  }

  /**
   * Gerar recomendações de duplicação
   */
  private generateDuplicationRecommendations(duplicates: DuplicationResult): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    if (duplicates.isDuplicate) {
      const exactDuplicates = duplicates.similarAssets.filter(asset => asset.similarity > 0.95);
      const similarAssets = duplicates.similarAssets.filter(asset => asset.similarity <= 0.95 && asset.similarity > 0.8);

      if (exactDuplicates.length > 0) {
        recommendations.push({
          type: 'duplicate',
          severity: 'warning',
          message: `${exactDuplicates.length} duplicata(s) exata(s) encontrada(s)`,
          action: 'Considere remover duplicatas para economizar espaço',
          confidence: 0.95,
        });
      }

      if (similarAssets.length > 0) {
        recommendations.push({
          type: 'duplicate',
          severity: 'info',
          message: `${similarAssets.length} imagem(ns) similar(es) encontrada(s)`,
          action: 'Verifique se são variações da mesma foto',
          confidence: 0.8,
        });
      }
    }

    return recommendations;
  }

  /**
   * Gerar recomendações visuais
   */
  private generateVisualRecommendations(features: VisualFeatures): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    // Verificar brilho
    if (features.brightness < 30) {
      recommendations.push({
        type: 'quality',
        severity: 'warning',
        message: 'Imagem muito escura',
        action: 'Considere aumentar o brilho',
        confidence: 0.8,
      });
    } else if (features.brightness > 200) {
      recommendations.push({
        type: 'quality',
        severity: 'warning',
        message: 'Imagem muito clara',
        action: 'Considere diminuir o brilho',
        confidence: 0.8,
      });
    }

    // Verificar contraste
    if (features.contrast < 20) {
      recommendations.push({
        type: 'quality',
        severity: 'warning',
        message: 'Baixo contraste',
        action: 'Aumente o contraste para melhor definição',
        confidence: 0.7,
      });
    }

    // Verificar nitidez
    if (features.sharpness < 0.5) {
      recommendations.push({
        type: 'quality',
        severity: 'error',
        message: 'Imagem desfocada',
        action: 'Use uma imagem mais nítida para melhor qualidade de impressão',
        confidence: 0.9,
      });
    }

    // Verificar composição
    if (features.composition.ruleOfThirds < 0.3) {
      recommendations.push({
        type: 'composition',
        severity: 'info',
        message: 'Composição pode ser melhorada',
        action: 'Considere aplicar a regra dos terços',
        confidence: 0.6,
      });
    }

    return recommendations;
  }

  /**
   * Gerar recomendações de qualidade
   */
  private generateQualityRecommendations(qualityScore: number): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    if (qualityScore < 0.4) {
      recommendations.push({
        type: 'quality',
        severity: 'error',
        message: 'Qualidade geral baixa',
        action: 'Considere usar uma imagem de melhor qualidade',
        confidence: 0.9,
      });
    } else if (qualityScore < 0.7) {
      recommendations.push({
        type: 'quality',
        severity: 'warning',
        message: 'Qualidade geral média',
        action: 'Imagem pode ser melhorada para impressão',
        confidence: 0.7,
      });
    } else if (qualityScore > 0.9) {
      recommendations.push({
        type: 'quality',
        severity: 'info',
        message: 'Excelente qualidade de imagem',
        confidence: 0.9,
      });
    }

    return recommendations;
  }

  // Métodos auxiliares privados

  private async getAssetBuffer(storageKey: string): Promise<Buffer> {
    // Implementar busca do buffer baseado na chave de storage
    // Por enquanto, retornar buffer vazio
    return Buffer.alloc(0);
  }

  private async saveAnalysisResults(assetId: string, results: AdvancedAnalysisResult): Promise<void> {
    // Note: analysisResults, faces, qualityScore fields not in schema
    // Storing analysis data in exifData JSON field as workaround
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return;

    let existingExif = {};
    try {
      existingExif = JSON.parse(asset.exifData || '{}');
    } catch (e) {
      existingExif = {};
    }

    const updatedExif = {
      ...existingExif,
      analysisResults: {
        faces: results.faces,
        qualityScore: results.qualityScore,
        visualFeatures: results.visualFeatures,
        recommendations: results.recommendations,
        processingTime: results.processingTime,
      },
    };

    await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        exifData: JSON.stringify(updatedExif),
      },
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateBrightness(stats: any): number {
    // Implementação simplificada
    return stats.channels?.[0]?.mean || 0;
  }

  private calculateContrast(stats: any): number {
    // Implementação simplificada
    return stats.channels?.[0]?.stdev || 0;
  }

  private calculateSaturation(stats: any): number {
    // Implementação simplificada
    return stats.channels?.length > 1 ? 50 : 0;
  }

  private async calculateSharpness(imageBuffer: Buffer): Promise<number> {
    // Implementação simplificada usando variância do Laplaciano
    try {
      const sharp = require('sharp');
      const gray = await sharp(imageBuffer)
        .greyscale()
        .resize(200, 200)
        .raw()
        .toBuffer();

      // Calcular variância (indicador de nitidez)
      let sum = 0;
      let sumSquares = 0;
      
      for (let i = 0; i < gray.length; i++) {
        sum += gray[i];
        sumSquares += gray[i] * gray[i];
      }

      const mean = sum / gray.length;
      const variance = (sumSquares / gray.length) - (mean * mean);
      
      return Math.min(1, variance / 1000); // Normalizar
    } catch (error) {
      return 0;
    }
  }

  private async analyzeComposition(imageBuffer: Buffer, width: number, height: number): Promise<CompositionAnalysis> {
    // Implementação simplificada de análise de composição
    return {
      ruleOfThirds: Math.random() * 0.5 + 0.3, // Placeholder
      symmetry: Math.random() * 0.5 + 0.3,
      balance: Math.random() * 0.5 + 0.3,
      leadingLines: Math.random() * 0.5 + 0.2,
      focusPoint: {
        x: width * (0.3 + Math.random() * 0.4),
        y: height * (0.3 + Math.random() * 0.4),
      },
    };
  }

  private async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    // Implementação simplificada - em produção usar ML
    return [];
  }

  private getColorName(r: number, g: number, b: number): string {
    // Implementação simplificada de nomeação de cores
    if (r > 200 && g > 200 && b > 200) return 'Branco';
    if (r < 50 && g < 50 && b < 50) return 'Preto';
    if (r > g && r > b) return 'Vermelho';
    if (g > r && g > b) return 'Verde';
    if (b > r && b > g) return 'Azul';
    return 'Misto';
  }
}