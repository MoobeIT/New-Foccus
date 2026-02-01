import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../../common/services/logger.service';

export interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  fields?: Record<string, string>;
}

export interface StorageConfig {
  type: 'local' | 's3';
  local?: {
    path: string;
  };
  s3?: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucketAssets: string;
    region: string;
    forcePathStyle: boolean;
  };
}

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private config: StorageConfig;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.config = {
      type: this.configService.get('storage.type'),
      local: this.configService.get('storage.local'),
      s3: this.configService.get('storage.s3'),
    };

    if (this.config.type === 's3' && this.config.s3) {
      this.s3Client = new S3Client({
        endpoint: this.config.s3.endpoint,
        region: this.config.s3.region,
        credentials: {
          accessKeyId: this.config.s3.accessKey,
          secretAccessKey: this.config.s3.secretKey,
        },
        forcePathStyle: this.config.s3.forcePathStyle,
      });
    }
  }

  async getUploadUrl(
    userId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<UploadUrlResponse> {
    const storageKey = this.generateStorageKey(userId, filename);

    if (this.config.type === 's3') {
      return this.getS3UploadUrl(storageKey, mimeType, sizeBytes);
    } else {
      return this.getLocalUploadUrl(storageKey);
    }
  }

  async uploadFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (this.config.type === 's3') {
      return this.uploadToS3(storageKey, buffer, mimeType);
    } else {
      return this.uploadToLocal(storageKey, buffer);
    }
  }

  async getFileUrl(storageKey: string): Promise<string> {
    if (this.config.type === 's3') {
      return this.getS3FileUrl(storageKey);
    } else {
      return this.getLocalFileUrl(storageKey);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (this.config.type === 's3') {
      await this.deleteFromS3(storageKey);
    } else {
      await this.deleteFromLocal(storageKey);
    }
  }

  async downloadFile(storageKey: string): Promise<Buffer> {
    if (this.config.type === 's3') {
      return this.downloadFromS3(storageKey);
    } else {
      return this.downloadFromLocal(storageKey);
    }
  }

  // Métodos S3
  private async getS3UploadUrl(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<UploadUrlResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.s3.bucketAssets,
        Key: storageKey,
        ContentType: mimeType,
        ContentLength: sizeBytes,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hora
      });

      return {
        uploadUrl,
        storageKey,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar URL de upload S3', error.stack, 'StorageService');
      throw error;
    }
  }

  private async uploadToS3(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.s3.bucketAssets,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      return this.getS3FileUrl(storageKey);
    } catch (error) {
      this.logger.error('Erro ao fazer upload para S3', error.stack, 'StorageService');
      throw error;
    }
  }

  private getS3FileUrl(storageKey: string): string {
    if (this.config.s3.forcePathStyle) {
      return `${this.config.s3.endpoint}/${this.config.s3.bucketAssets}/${storageKey}`;
    } else {
      return `https://${this.config.s3.bucketAssets}.s3.${this.config.s3.region}.amazonaws.com/${storageKey}`;
    }
  }

  private async deleteFromS3(storageKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.s3.bucketAssets,
        Key: storageKey,
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error('Erro ao deletar arquivo do S3', error.stack, 'StorageService');
      throw error;
    }
  }

  private async downloadFromS3(storageKey: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.s3.bucketAssets,
        Key: storageKey,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Erro ao baixar arquivo do S3', error.stack, 'StorageService');
      throw error;
    }
  }

  // Métodos Local
  private getLocalUploadUrl(storageKey: string): UploadUrlResponse {
    // Para storage local, retornamos uma URL que será processada pelo controller
    return {
      uploadUrl: `/api/v1/assets/upload-direct/${encodeURIComponent(storageKey)}`,
      storageKey,
    };
  }

  private async uploadToLocal(storageKey: string, buffer: Buffer): Promise<string> {
    try {
      const fullPath = path.join(this.config.local.path, storageKey);
      const dir = path.dirname(fullPath);

      // Criar diretório se não existir
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, buffer);
      return this.getLocalFileUrl(storageKey);
    } catch (error) {
      this.logger.error('Erro ao fazer upload local', error.stack, 'StorageService');
      throw error;
    }
  }

  private getLocalFileUrl(storageKey: string): string {
    return `/api/v1/assets/file/${encodeURIComponent(storageKey)}`;
  }

  private async deleteFromLocal(storageKey: string): Promise<void> {
    try {
      const fullPath = path.join(this.config.local.path, storageKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      this.logger.error('Erro ao deletar arquivo local', error.stack, 'StorageService');
      throw error;
    }
  }

  private async downloadFromLocal(storageKey: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.config.local.path, storageKey);
      return fs.readFileSync(fullPath);
    } catch (error) {
      this.logger.error('Erro ao baixar arquivo local', error.stack, 'StorageService');
      throw error;
    }
  }

  // Utilitários
  private generateStorageKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `assets/${userId}/${timestamp}_${randomSuffix}_${sanitizedFilename}`;
  }

  // Método para verificar se storage está funcionando
  async healthCheck(): Promise<boolean> {
    try {
      if (this.config.type === 's3') {
        // Tentar listar objetos para verificar conectividade
        const command = new GetObjectCommand({
          Bucket: this.config.s3.bucketAssets,
          Key: 'health-check-non-existent-file',
        });
        
        try {
          await this.s3Client.send(command);
        } catch (error) {
          // Esperamos um erro 404, isso significa que a conexão está funcionando
          return error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404;
        }
      } else {
        // Para storage local, verificar se o diretório existe e é acessível
        const testPath = this.config.local.path;
        return fs.existsSync(testPath) && fs.statSync(testPath).isDirectory();
      }
      
      return true;
    } catch (error) {
      this.logger.error('Health check do storage falhou', error.stack, 'StorageService');
      return false;
    }
  }

  // Upload buffer diretamente (usado pelo render service)
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    options?: { contentType?: string; metadata?: Record<string, string> },
  ): Promise<string> {
    const contentType = options?.contentType || 'application/octet-stream';
    return this.uploadFile(fileName, buffer, contentType);
  }

  // Verificar se arquivo existe
  async fileExists(storageKey: string): Promise<boolean> {
    try {
      if (this.config.type === 's3') {
        const command = new GetObjectCommand({
          Bucket: this.config.s3.bucketAssets,
          Key: storageKey,
        });
        
        try {
          await this.s3Client.send(command);
          return true;
        } catch (error) {
          return false;
        }
      } else {
        const fullPath = path.join(this.config.local?.path || './uploads', storageKey);
        return fs.existsSync(fullPath);
      }
    } catch (error) {
      return false;
    }
  }

  // Listar arquivos com prefixo
  async listFiles(
    prefix: string,
    options?: { prefix?: string },
  ): Promise<{ key: string; size: number; lastModified: Date }[]> {
    try {
      if (this.config.type === 's3') {
        // Para S3, usar ListObjectsV2Command
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const command = new ListObjectsV2Command({
          Bucket: this.config.s3.bucketAssets,
          Prefix: prefix + (options?.prefix || ''),
        });
        
        const response = await this.s3Client.send(command);
        return (response.Contents || []).map(obj => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        }));
      } else {
        // Para storage local
        const basePath = path.join(this.config.local?.path || './uploads', prefix);
        const filterPrefix = options?.prefix || '';
        
        if (!fs.existsSync(basePath)) {
          return [];
        }
        
        const files = fs.readdirSync(basePath);
        return files
          .filter(file => file.startsWith(filterPrefix))
          .map(file => {
            const fullPath = path.join(basePath, file);
            const stats = fs.statSync(fullPath);
            return {
              key: path.join(prefix, file),
              size: stats.size,
              lastModified: stats.mtime,
            };
          });
      }
    } catch (error) {
      this.logger.error('Erro ao listar arquivos', error.stack, 'StorageService');
      return [];
    }
  }
}