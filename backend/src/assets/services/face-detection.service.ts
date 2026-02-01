import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';

export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
}

export interface FaceDetectionResult {
  faces: FaceDetection[];
  processingTime: number;
  method: 'mock' | 'opencv' | 'cloud';
}

@Injectable()
export class FaceDetectionService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async detectFaces(imageBuffer: Buffer, filename: string): Promise<FaceDetectionResult> {
    const startTime = Date.now();

    try {
      // Verificar se deve usar mock ou implementação real
      if (this.configService.get('features.mockExternalServices')) {
        return this.mockFaceDetection(imageBuffer, startTime);
      }

      // Em produção, implementar com OpenCV ou serviço de ML
      return this.realFaceDetection(imageBuffer, startTime);
    } catch (error) {
      this.logger.error(`Erro na detecção de faces para ${filename}`, error.stack, 'FaceDetectionService');
      return {
        faces: [],
        processingTime: Date.now() - startTime,
        method: 'mock',
      };
    }
  }

  private async mockFaceDetection(imageBuffer: Buffer, startTime: number): Promise<FaceDetectionResult> {
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Analisar imagem para gerar dados mock realistas
    const sharp = require('sharp');
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 800, height = 600 } = metadata;

    const faces: FaceDetection[] = [];

    // Simular detecção baseada no tamanho da imagem
    if (width > 200 && height > 200) {
      // Probabilidade de ter faces baseada no tamanho
      const facesProbability = Math.min(0.7, (width * height) / (1000 * 1000));
      
      if (Math.random() < facesProbability) {
        const numFaces = Math.floor(Math.random() * 3) + 1; // 1-3 faces
        
        for (let i = 0; i < numFaces; i++) {
          // Gerar posição e tamanho realistas
          const faceWidth = Math.floor(width * (0.15 + Math.random() * 0.25)); // 15-40% da largura
          const faceHeight = Math.floor(faceWidth * (1.2 + Math.random() * 0.3)); // Proporção facial
          
          const x = Math.floor(Math.random() * (width - faceWidth));
          const y = Math.floor(Math.random() * (height - faceHeight));
          
          const confidence = 0.7 + Math.random() * 0.25; // 70-95% de confiança

          faces.push({
            x,
            y,
            width: faceWidth,
            height: faceHeight,
            confidence,
            landmarks: {
              leftEye: { x: x + faceWidth * 0.3, y: y + faceHeight * 0.35 },
              rightEye: { x: x + faceWidth * 0.7, y: y + faceHeight * 0.35 },
              nose: { x: x + faceWidth * 0.5, y: y + faceHeight * 0.55 },
              leftMouth: { x: x + faceWidth * 0.4, y: y + faceHeight * 0.75 },
              rightMouth: { x: x + faceWidth * 0.6, y: y + faceHeight * 0.75 },
            },
          });
        }
      }
    }

    return {
      faces,
      processingTime: Date.now() - startTime,
      method: 'mock',
    };
  }

  private async realFaceDetection(imageBuffer: Buffer, startTime: number): Promise<FaceDetectionResult> {
    try {
      // Implementação com OpenCV.js ou biblioteca similar
      // Por enquanto, usar implementação híbrida com Sharp para análise básica
      
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 800, height = 600 } = metadata;

      // Converter para escala de cinza para análise
      const grayBuffer = await sharp(imageBuffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const faces = await this.analyzeImageForFaces(
        grayBuffer.data,
        grayBuffer.info.width,
        grayBuffer.info.height
      );

      return {
        faces,
        processingTime: Date.now() - startTime,
        method: 'opencv',
      };
    } catch (error) {
      this.logger.error('Erro na detecção real de faces', error, 'FaceDetectionService');
      // Fallback para mock em caso de erro
      return this.mockFaceDetection(imageBuffer, startTime);
    }
  }

  /**
   * Análise básica de imagem para detecção de faces
   * Implementação simplificada usando análise de padrões
   */
  private async analyzeImageForFaces(
    grayData: Buffer,
    width: number,
    height: number
  ): Promise<FaceDetection[]> {
    const faces: FaceDetection[] = [];

    // Implementação básica de detecção por análise de contraste
    // Em produção, usar OpenCV com classificadores Haar ou modelos CNN
    
    const minFaceSize = Math.min(width, height) * 0.1; // 10% da menor dimensão
    const maxFaceSize = Math.min(width, height) * 0.6; // 60% da menor dimensão

    // Analisar regiões da imagem em busca de padrões faciais
    for (let y = 0; y < height - minFaceSize; y += Math.floor(minFaceSize / 2)) {
      for (let x = 0; x < width - minFaceSize; x += Math.floor(minFaceSize / 2)) {
        for (let size = minFaceSize; size <= maxFaceSize; size += 10) {
          if (x + size > width || y + size > height) continue;

          const confidence = this.analyzeFaceRegion(grayData, x, y, size, width, height);
          
          if (confidence > 0.6) {
            faces.push({
              x: Math.floor(x),
              y: Math.floor(y),
              width: Math.floor(size),
              height: Math.floor(size * 1.2), // Faces são ligeiramente mais altas
              confidence: Math.round(confidence * 100) / 100,
              landmarks: this.estimateLandmarks(x, y, size),
            });
          }
        }
      }
    }

    // Filtrar faces sobrepostas
    return this.filterOverlappingFaces(faces, 0.3);
  }

  /**
   * Análise simplificada de região para detectar padrões faciais
   */
  private analyzeFaceRegion(
    grayData: Buffer,
    x: number,
    y: number,
    size: number,
    width: number,
    height: number
  ): number {
    let confidence = 0;

    try {
      // Analisar contraste e padrões típicos de faces
      const eyeRegionY = y + size * 0.3;
      const mouthRegionY = y + size * 0.7;
      const centerX = x + size * 0.5;

      // Verificar região dos olhos (deve ter contraste)
      const leftEyeContrast = this.calculateRegionContrast(
        grayData, x + size * 0.25, eyeRegionY, size * 0.15, width, height
      );
      const rightEyeContrast = this.calculateRegionContrast(
        grayData, x + size * 0.6, eyeRegionY, size * 0.15, width, height
      );

      // Verificar região da boca
      const mouthContrast = this.calculateRegionContrast(
        grayData, centerX - size * 0.1, mouthRegionY, size * 0.2, width, height
      );

      // Calcular simetria horizontal
      const symmetry = this.calculateHorizontalSymmetry(
        grayData, x, y, size, width, height
      );

      // Combinar métricas para calcular confiança
      if (leftEyeContrast > 0.3 && rightEyeContrast > 0.3) {
        confidence += 0.4;
      }
      
      if (mouthContrast > 0.2) {
        confidence += 0.2;
      }
      
      if (symmetry > 0.7) {
        confidence += 0.3;
      }

      // Penalizar regiões muito uniformes ou muito ruidosas
      const uniformity = this.calculateRegionUniformity(grayData, x, y, size, width, height);
      if (uniformity < 0.1 || uniformity > 0.9) {
        confidence *= 0.5;
      }

    } catch (error) {
      // Em caso de erro, retornar confiança baixa
      confidence = 0;
    }

    return Math.min(1, confidence);
  }

  /**
   * Calcular contraste em uma região específica
   */
  private calculateRegionContrast(
    grayData: Buffer,
    x: number,
    y: number,
    regionSize: number,
    width: number,
    height: number
  ): number {
    let min = 255;
    let max = 0;
    let count = 0;

    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(width, Math.floor(x + regionSize));
    const endY = Math.min(height, Math.floor(y + regionSize));

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const index = py * width + px;
        if (index < grayData.length) {
          const pixel = grayData[index];
          min = Math.min(min, pixel);
          max = Math.max(max, pixel);
          count++;
        }
      }
    }

    return count > 0 ? (max - min) / 255 : 0;
  }

  /**
   * Calcular simetria horizontal de uma região
   */
  private calculateHorizontalSymmetry(
    grayData: Buffer,
    x: number,
    y: number,
    size: number,
    width: number,
    height: number
  ): number {
    let symmetryScore = 0;
    let comparisons = 0;

    const centerX = x + size / 2;
    const halfSize = size / 2;

    for (let py = y; py < y + size && py < height; py++) {
      for (let offset = 1; offset < halfSize; offset++) {
        const leftX = Math.floor(centerX - offset);
        const rightX = Math.floor(centerX + offset);

        if (leftX >= 0 && rightX < width) {
          const leftIndex = py * width + leftX;
          const rightIndex = py * width + rightX;

          if (leftIndex < grayData.length && rightIndex < grayData.length) {
            const leftPixel = grayData[leftIndex];
            const rightPixel = grayData[rightIndex];
            const diff = Math.abs(leftPixel - rightPixel) / 255;
            symmetryScore += 1 - diff;
            comparisons++;
          }
        }
      }
    }

    return comparisons > 0 ? symmetryScore / comparisons : 0;
  }

  /**
   * Calcular uniformidade de uma região
   */
  private calculateRegionUniformity(
    grayData: Buffer,
    x: number,
    y: number,
    size: number,
    width: number,
    height: number
  ): number {
    let sum = 0;
    let sumSquares = 0;
    let count = 0;

    for (let py = y; py < y + size && py < height; py++) {
      for (let px = x; px < x + size && px < width; px++) {
        const index = py * width + px;
        if (index < grayData.length) {
          const pixel = grayData[index];
          sum += pixel;
          sumSquares += pixel * pixel;
          count++;
        }
      }
    }

    if (count === 0) return 0;

    const mean = sum / count;
    const variance = (sumSquares / count) - (mean * mean);
    const stdDev = Math.sqrt(variance);

    // Normalizar desvio padrão (0 = uniforme, 1 = máxima variação)
    return Math.min(1, stdDev / 128);
  }

  /**
   * Estimar landmarks básicos baseados na posição da face
   */
  private estimateLandmarks(x: number, y: number, size: number) {
    return {
      leftEye: { x: x + size * 0.3, y: y + size * 0.35 },
      rightEye: { x: x + size * 0.7, y: y + size * 0.35 },
      nose: { x: x + size * 0.5, y: y + size * 0.55 },
      leftMouth: { x: x + size * 0.4, y: y + size * 0.75 },
      rightMouth: { x: x + size * 0.6, y: y + size * 0.75 },
    };
  }

  // Método para validar se uma região contém uma face válida
  validateFaceRegion(face: FaceDetection, imageWidth: number, imageHeight: number): boolean {
    // Verificar se a face está dentro dos limites da imagem
    if (face.x < 0 || face.y < 0 || 
        face.x + face.width > imageWidth || 
        face.y + face.height > imageHeight) {
      return false;
    }

    // Verificar tamanho mínimo e máximo
    const minSize = Math.min(imageWidth, imageHeight) * 0.05; // 5% da menor dimensão
    const maxSize = Math.min(imageWidth, imageHeight) * 0.8;  // 80% da menor dimensão

    if (face.width < minSize || face.height < minSize ||
        face.width > maxSize || face.height > maxSize) {
      return false;
    }

    // Verificar proporção (faces são aproximadamente 1:1.2)
    const ratio = face.height / face.width;
    if (ratio < 0.8 || ratio > 1.8) {
      return false;
    }

    // Verificar confiança mínima
    if (face.confidence < 0.5) {
      return false;
    }

    return true;
  }

  // Método para filtrar faces sobrepostas (Non-Maximum Suppression simplificado)
  filterOverlappingFaces(faces: FaceDetection[], overlapThreshold: number = 0.3): FaceDetection[] {
    if (faces.length <= 1) return faces;

    // Ordenar por confiança (maior primeiro)
    const sortedFaces = [...faces].sort((a, b) => b.confidence - a.confidence);
    const filteredFaces: FaceDetection[] = [];

    for (const face of sortedFaces) {
      let shouldKeep = true;

      for (const keptFace of filteredFaces) {
        const overlap = this.calculateOverlap(face, keptFace);
        if (overlap > overlapThreshold) {
          shouldKeep = false;
          break;
        }
      }

      if (shouldKeep) {
        filteredFaces.push(face);
      }
    }

    return filteredFaces;
  }

  // Calcular sobreposição entre duas faces (IoU - Intersection over Union)
  private calculateOverlap(face1: FaceDetection, face2: FaceDetection): number {
    const x1 = Math.max(face1.x, face2.x);
    const y1 = Math.max(face1.y, face2.y);
    const x2 = Math.min(face1.x + face1.width, face2.x + face2.width);
    const y2 = Math.min(face1.y + face1.height, face2.y + face2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = face1.width * face1.height;
    const area2 = face2.width * face2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  // Método para extrair região da face da imagem
  async extractFaceRegion(imageBuffer: Buffer, face: FaceDetection, padding: number = 0.2): Promise<Buffer> {
    const sharp = require('sharp');
    
    // Adicionar padding ao redor da face
    const paddingX = Math.floor(face.width * padding);
    const paddingY = Math.floor(face.height * padding);
    
    const extractX = Math.max(0, face.x - paddingX);
    const extractY = Math.max(0, face.y - paddingY);
    const extractWidth = face.width + (2 * paddingX);
    const extractHeight = face.height + (2 * paddingY);

    return sharp(imageBuffer)
      .extract({
        left: extractX,
        top: extractY,
        width: extractWidth,
        height: extractHeight,
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  // Método para calcular características da face para comparação
  calculateFaceFeatures(face: FaceDetection): Record<string, number> {
    const features: Record<string, number> = {
      aspectRatio: face.height / face.width,
      area: face.width * face.height,
      confidence: face.confidence,
    };

    if (face.landmarks) {
      // Calcular distâncias entre landmarks
      const eyeDistance = Math.sqrt(
        Math.pow(face.landmarks.rightEye.x - face.landmarks.leftEye.x, 2) +
        Math.pow(face.landmarks.rightEye.y - face.landmarks.leftEye.y, 2)
      );
      
      const noseToMouthDistance = Math.sqrt(
        Math.pow(face.landmarks.nose.x - (face.landmarks.leftMouth.x + face.landmarks.rightMouth.x) / 2, 2) +
        Math.pow(face.landmarks.nose.y - (face.landmarks.leftMouth.y + face.landmarks.rightMouth.y) / 2, 2)
      );

      features.eyeDistance = eyeDistance;
      features.noseToMouthDistance = noseToMouthDistance;
      features.eyeDistanceRatio = eyeDistance / face.width;
    }

    return features;
  }
}