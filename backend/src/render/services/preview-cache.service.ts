import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { StorageService } from '../../assets/services/storage.service';
import { createHash } from 'crypto';

export interface PreviewCacheKey {
  projectId: string;
  pageId: string;
  version: number;
  options: {
    width: number;
    height: number;
    dpi: number;
    format: string;
  };
}

export interface CachedPreview {
  url: string;
  createdAt: Date;
  expiresAt: Date;
  size: number;
  metadata: {
    cacheKey: string;
    projectId: string;
    pageId: string;
    version: number;
  };
}

@Injectable()
export class PreviewCacheService {
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB por tenant
  
  constructor(
    private storageService: StorageService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async getCachedPreview(
    tenantId: string,
    cacheKey: PreviewCacheKey,
  ): Promise<CachedPreview | null> {
    try {
      const key = this.generateCacheKey(cacheKey);
      const fileName = `cache/previews/${tenantId}/${key}.json`;

      // Verificar se existe metadata do cache
      const metadataExists = await this.storageService.fileExists(fileName);
      if (!metadataExists) {
        return null;
      }

      // Buscar metadata
      const metadataBuffer = await this.storageService.downloadFile(fileName);
      const metadata = JSON.parse(metadataBuffer.toString());

      // Verificar se não expirou
      const expiresAt = new Date(metadata.expiresAt);
      if (expiresAt < new Date()) {
        // Cache expirado, remover
        await this.removeCachedPreview(tenantId, key);
        return null;
      }

      // Verificar se o arquivo de preview ainda existe
      const previewExists = await this.storageService.fileExists(metadata.url);
      if (!previewExists) {
        // Arquivo não existe mais, remover metadata
        await this.removeCachedPreview(tenantId, key);
        return null;
      }

      this.logger.debug(
        `Preview cache hit: ${key}`,
        'PreviewCacheService',
        { projectId: cacheKey.projectId, pageId: cacheKey.pageId },
      );

      return {
        url: metadata.url,
        createdAt: new Date(metadata.createdAt),
        expiresAt,
        size: metadata.size,
        metadata: {
          cacheKey: key,
          projectId: cacheKey.projectId,
          pageId: cacheKey.pageId,
          version: cacheKey.version,
        },
      };
    } catch (error) {
      this.logger.error(
        'Erro ao buscar preview no cache',
        error.stack,
        'PreviewCacheService',
        { tenantId, cacheKey },
      );
      return null;
    }
  }

  async setCachedPreview(
    tenantId: string,
    cacheKey: PreviewCacheKey,
    previewBuffer: Buffer,
    contentType: string,
  ): Promise<CachedPreview> {
    try {
      const key = this.generateCacheKey(cacheKey);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

      // Upload do preview
      const previewFileName = `cache/previews/${tenantId}/${key}.${this.getFileExtension(contentType)}`;
      const previewUrl = await this.storageService.uploadBuffer(
        previewBuffer,
        previewFileName,
        {
          contentType,
          metadata: {
            type: 'preview-cache',
            projectId: cacheKey.projectId,
            pageId: cacheKey.pageId,
            version: cacheKey.version.toString(),
            cacheKey: key,
          },
        },
      );

      // Criar metadata do cache
      const cacheMetadata = {
        url: previewUrl,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        size: previewBuffer.length,
        projectId: cacheKey.projectId,
        pageId: cacheKey.pageId,
        version: cacheKey.version,
        options: cacheKey.options,
      };

      // Upload da metadata
      const metadataFileName = `cache/previews/${tenantId}/${key}.json`;
      await this.storageService.uploadBuffer(
        Buffer.from(JSON.stringify(cacheMetadata, null, 2)),
        metadataFileName,
        {
          contentType: 'application/json',
          metadata: {
            type: 'preview-cache-metadata',
            cacheKey: key,
          },
        },
      );

      this.logger.debug(
        `Preview cached: ${key}`,
        'PreviewCacheService',
        {
          projectId: cacheKey.projectId,
          pageId: cacheKey.pageId,
          size: previewBuffer.length,
        },
      );

      // Verificar e limpar cache se necessário
      await this.cleanupCacheIfNeeded(tenantId);

      return {
        url: previewUrl,
        createdAt: now,
        expiresAt,
        size: previewBuffer.length,
        metadata: {
          cacheKey: key,
          projectId: cacheKey.projectId,
          pageId: cacheKey.pageId,
          version: cacheKey.version,
        },
      };
    } catch (error) {
      this.logger.error(
        'Erro ao salvar preview no cache',
        error.stack,
        'PreviewCacheService',
        { tenantId, cacheKey },
      );
      throw error;
    }
  }

  async invalidateProjectCache(tenantId: string, projectId: string): Promise<void> {
    try {
      // Listar todos os arquivos de cache do projeto
      const cacheFiles = await this.storageService.listFiles(
        `cache/previews/${tenantId}/`,
        { prefix: `proj_${projectId}_` },
      );

      // Remover arquivos em lote
      const deletePromises = cacheFiles.map(file => 
        this.storageService.deleteFile(file.key)
      );

      await Promise.allSettled(deletePromises);

      this.logger.debug(
        `Cache invalidado para projeto ${projectId}`,
        'PreviewCacheService',
        { tenantId, filesRemoved: cacheFiles.length },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao invalidar cache do projeto',
        error.stack,
        'PreviewCacheService',
        { tenantId, projectId },
      );
    }
  }

  async invalidatePageCache(
    tenantId: string,
    projectId: string,
    pageId: string,
  ): Promise<void> {
    try {
      // Listar arquivos de cache da página
      const cacheFiles = await this.storageService.listFiles(
        `cache/previews/${tenantId}/`,
        { prefix: `proj_${projectId}_page_${pageId}_` },
      );

      // Remover arquivos
      const deletePromises = cacheFiles.map(file => 
        this.storageService.deleteFile(file.key)
      );

      await Promise.allSettled(deletePromises);

      this.logger.debug(
        `Cache invalidado para página ${pageId}`,
        'PreviewCacheService',
        { tenantId, projectId, filesRemoved: cacheFiles.length },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao invalidar cache da página',
        error.stack,
        'PreviewCacheService',
        { tenantId, projectId, pageId },
      );
    }
  }

  async getCacheStats(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    try {
      const cacheFiles = await this.storageService.listFiles(
        `cache/previews/${tenantId}/`,
      );

      let totalSize = 0;
      let oldestFile: Date | null = null;
      let newestFile: Date | null = null;

      for (const file of cacheFiles) {
        totalSize += file.size || 0;
        
        const fileDate = file.lastModified || new Date();
        if (!oldestFile || fileDate < oldestFile) {
          oldestFile = fileDate;
        }
        if (!newestFile || fileDate > newestFile) {
          newestFile = fileDate;
        }
      }

      return {
        totalFiles: cacheFiles.length,
        totalSize,
        oldestFile,
        newestFile,
      };
    } catch (error) {
      this.logger.error(
        'Erro ao obter estatísticas do cache',
        error.stack,
        'PreviewCacheService',
      );
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }

  private generateCacheKey(cacheKey: PreviewCacheKey): string {
    const keyData = {
      projectId: cacheKey.projectId,
      pageId: cacheKey.pageId,
      version: cacheKey.version,
      options: cacheKey.options,
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);

    return `proj_${cacheKey.projectId}_page_${cacheKey.pageId}_v${cacheKey.version}_${hash}`;
  }

  private async removeCachedPreview(tenantId: string, cacheKey: string): Promise<void> {
    try {
      const metadataFile = `cache/previews/${tenantId}/${cacheKey}.json`;
      const previewFiles = [
        `cache/previews/${tenantId}/${cacheKey}.png`,
        `cache/previews/${tenantId}/${cacheKey}.jpg`,
        `cache/previews/${tenantId}/${cacheKey}.jpeg`,
      ];

      // Remover metadata e possíveis arquivos de preview
      const deletePromises = [metadataFile, ...previewFiles].map(file =>
        this.storageService.deleteFile(file).catch(() => {
          // Ignorar erros de arquivo não encontrado
        }),
      );

      await Promise.allSettled(deletePromises);
    } catch (error) {
      this.logger.error(
        'Erro ao remover preview do cache',
        error.stack,
        'PreviewCacheService',
      );
    }
  }

  private async cleanupCacheIfNeeded(tenantId: string): Promise<void> {
    try {
      const stats = await this.getCacheStats(tenantId);

      // Se excedeu o tamanho máximo, limpar arquivos antigos
      if (stats.totalSize > this.MAX_CACHE_SIZE) {
        await this.cleanupOldCache(tenantId);
      }
    } catch (error) {
      this.logger.error(
        'Erro na limpeza automática do cache',
        error.stack,
        'PreviewCacheService',
      );
    }
  }

  private async cleanupOldCache(tenantId: string): Promise<void> {
    try {
      const cacheFiles = await this.storageService.listFiles(
        `cache/previews/${tenantId}/`,
      );

      // Ordenar por data (mais antigos primeiro)
      const sortedFiles = cacheFiles
        .filter(file => file.lastModified)
        .sort((a, b) => a.lastModified!.getTime() - b.lastModified!.getTime());

      // Remover 25% dos arquivos mais antigos
      const filesToRemove = sortedFiles.slice(0, Math.floor(sortedFiles.length * 0.25));

      const deletePromises = filesToRemove.map(file =>
        this.storageService.deleteFile(file.key),
      );

      await Promise.allSettled(deletePromises);

      this.logger.debug(
        `Limpeza de cache concluída: ${filesToRemove.length} arquivos removidos`,
        'PreviewCacheService',
        { tenantId },
      );
    } catch (error) {
      this.logger.error(
        'Erro na limpeza de cache antigo',
        error.stack,
        'PreviewCacheService',
      );
    }
  }

  private getFileExtension(contentType: string): string {
    const extensions = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'application/pdf': 'pdf',
    };

    return extensions[contentType.toLowerCase()] || 'bin';
  }
}