import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import * as sharp from 'sharp';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  density?: number;
  hasAlpha: boolean;
  channels: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  [key: string]: any;
}

export interface ThumbnailSizes {
  small: { width: number; height: number };
  medium: { width: number; height: number };
  large: { width: number; height: number };
}

export interface ProcessingResult {
  metadata: ImageMetadata;
  exifData: ExifData;
  thumbnails: Record<string, Buffer>;
  phash?: string;
  faces?: any[];
}

@Injectable()
export class ImageProcessingService {
  private readonly thumbnailSizes: ThumbnailSizes = {
    small: { width: 150, height: 150 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
  };

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async processImage(buffer: Buffer, filename: string): Promise<ProcessingResult> {
    try {
      this.logger.debug(`Processando imagem: ${filename}`, 'ImageProcessingService');

      // Obter metadados da imagem
      const metadata = await this.extractMetadata(buffer);
      
      // Extrair dados EXIF
      const exifData = await this.extractExifData(buffer);
      
      // Gerar thumbnails
      const thumbnails = await this.generateThumbnails(buffer);
      
      // Calcular hash perceptual (implementação simplificada)
      const phash = await this.calculatePerceptualHash(buffer);
      
      // Detectar faces (implementação mock para desenvolvimento)
      const faces = await this.detectFaces(buffer);

      return {
        metadata,
        exifData,
        thumbnails,
        phash,
        faces,
      };
    } catch (error) {
      this.logger.error(`Erro ao processar imagem ${filename}`, error.stack, 'ImageProcessingService');
      throw error;
    }
  }

  async extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha || false,
        channels: metadata.channels || 3,
      };
    } catch (error) {
      this.logger.error('Erro ao extrair metadados', error.stack, 'ImageProcessingService');
      throw error;
    }
  }

  async extractExifData(buffer: Buffer): Promise<ExifData> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const exif = metadata.exif;

      if (!exif) {
        return {};
      }

      // Processar dados EXIF básicos
      // Em produção, usar uma biblioteca como 'exif-reader' para parsing completo
      const exifData: ExifData = {};

      // Orientação da imagem
      if (metadata.orientation) {
        exifData.orientation = metadata.orientation;
      }

      // Densidade/DPI
      if (metadata.density) {
        exifData.density = metadata.density;
      }

      return exifData;
    } catch (error) {
      this.logger.error('Erro ao extrair EXIF', error.stack, 'ImageProcessingService');
      return {};
    }
  }

  async generateThumbnails(buffer: Buffer): Promise<Record<string, Buffer>> {
    const thumbnails: Record<string, Buffer> = {};

    try {
      for (const [size, dimensions] of Object.entries(this.thumbnailSizes)) {
        const thumbnail = await sharp(buffer)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        thumbnails[size] = thumbnail;
      }

      return thumbnails;
    } catch (error) {
      this.logger.error('Erro ao gerar thumbnails', error.stack, 'ImageProcessingService');
      throw error;
    }
  }

  async calculatePerceptualHash(buffer: Buffer): Promise<string> {
    try {
      // Implementação simplificada do pHash
      // Em produção, usar uma biblioteca como 'imghash' ou implementar algoritmo completo
      
      // Redimensionar para 8x8 e converter para escala de cinza
      const resized = await sharp(buffer)
        .resize(8, 8, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer();

      // Calcular média dos pixels
      let sum = 0;
      for (let i = 0; i < resized.length; i++) {
        sum += resized[i];
      }
      const average = sum / resized.length;

      // Gerar hash binário
      let hash = '';
      for (let i = 0; i < resized.length; i++) {
        hash += resized[i] > average ? '1' : '0';
      }

      // Converter para hexadecimal
      let hexHash = '';
      for (let i = 0; i < hash.length; i += 4) {
        const chunk = hash.substr(i, 4);
        hexHash += parseInt(chunk, 2).toString(16);
      }

      return hexHash;
    } catch (error) {
      this.logger.error('Erro ao calcular hash perceptual', error.stack, 'ImageProcessingService');
      return '';
    }
  }

  async detectFaces(buffer: Buffer): Promise<any[]> {
    try {
      // Esta funcionalidade foi movida para FaceDetectionService
      // Manter compatibilidade retornando array vazio
      return [];
    } catch (error) {
      this.logger.error('Erro ao detectar faces', error.stack, 'ImageProcessingService');
      return [];
    }
  }

  async optimizeImage(buffer: Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}): Promise<Buffer> {
    try {
      let image = sharp(buffer);

      // Redimensionar se necessário
      if (options.maxWidth || options.maxHeight) {
        image = image.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Aplicar formato e qualidade
      switch (options.format) {
        case 'jpeg':
          image = image.jpeg({ quality: options.quality || 85 });
          break;
        case 'png':
          image = image.png({ quality: options.quality || 85 });
          break;
        case 'webp':
          image = image.webp({ quality: options.quality || 85 });
          break;
        default:
          // Manter formato original
          break;
      }

      return await image.toBuffer();
    } catch (error) {
      this.logger.error('Erro ao otimizar imagem', error.stack, 'ImageProcessingService');
      throw error;
    }
  }

  async validateImage(buffer: Buffer): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const metadata = await this.extractMetadata(buffer);

      // Validar dimensões mínimas
      if (metadata.width < 100 || metadata.height < 100) {
        errors.push('Imagem muito pequena (mínimo 100x100 pixels)');
      }

      // Validar dimensões máximas
      if (metadata.width > 10000 || metadata.height > 10000) {
        errors.push('Imagem muito grande (máximo 10000x10000 pixels)');
      }

      // Validar tamanho do arquivo
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (metadata.size > maxSize) {
        errors.push('Arquivo muito grande (máximo 50MB)');
      }

      // Validar formato
      const allowedFormats = ['jpeg', 'jpg', 'png', 'tiff', 'webp'];
      if (!allowedFormats.includes(metadata.format.toLowerCase())) {
        errors.push(`Formato não suportado: ${metadata.format}`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Erro ao validar imagem', error.stack, 'ImageProcessingService');
      return {
        valid: false,
        errors: ['Erro ao processar imagem'],
      };
    }
  }

  // Calcular DPI baseado em dimensões e tamanho de impressão
  calculateDPI(widthPx: number, heightPx: number, widthMm: number, heightMm: number): number {
    const widthInches = widthMm / 25.4;
    const heightInches = heightMm / 25.4;
    
    const dpiWidth = widthPx / widthInches;
    const dpiHeight = heightPx / heightInches;
    
    return Math.min(dpiWidth, dpiHeight);
  }

  // Verificar se imagem tem resolução suficiente para impressão
  checkPrintQuality(widthPx: number, heightPx: number, printWidthMm: number, printHeightMm: number): {
    dpi: number;
    quality: 'low' | 'medium' | 'high';
    suitable: boolean;
  } {
    const dpi = this.calculateDPI(widthPx, heightPx, printWidthMm, printHeightMm);
    
    let quality: 'low' | 'medium' | 'high';
    let suitable: boolean;

    if (dpi >= 300) {
      quality = 'high';
      suitable = true;
    } else if (dpi >= 150) {
      quality = 'medium';
      suitable = true;
    } else {
      quality = 'low';
      suitable = false;
    }

    return { dpi, quality, suitable };
  }
}