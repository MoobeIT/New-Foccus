import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PreviewService } from './preview.service';
import { PuppeteerService } from './puppeteer.service';
import { TemplateService, ProjectPage } from './template.service';
import { PreviewCacheService } from './preview-cache.service';
import { LoggerService } from '../../common/services/logger.service';

describe('PreviewService', () => {
  let service: PreviewService;
  let puppeteerService: jest.Mocked<PuppeteerService>;
  let templateService: jest.Mocked<TemplateService>;
  let previewCacheService: jest.Mocked<PreviewCacheService>;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockPage: ProjectPage = {
    id: 'page-1',
    width: 210,
    height: 297,
    background: '#ffffff',
    elements: [
      {
        id: 'text-1',
        type: 'text',
        x: 20,
        y: 20,
        width: 170,
        height: 20,
        properties: {
          text: 'Test Text',
          fontSize: 16,
        },
      },
    ],
  };

  const mockTemplate = {
    html: '<div class="page">Test HTML</div>',
    css: '.page { width: 210mm; height: 297mm; }',
    metadata: {
      width: 2480,
      height: 3508,
      dpi: 300,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreviewService,
        {
          provide: PuppeteerService,
          useValue: {
            renderHtml: jest.fn(),
          },
        },
        {
          provide: TemplateService,
          useValue: {
            generateRenderTemplate: jest.fn(),
          },
        },
        {
          provide: PreviewCacheService,
          useValue: {
            getCachedPreview: jest.fn(),
            setCachedPreview: jest.fn(),
            invalidateProjectCache: jest.fn(),
            invalidatePageCache: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PreviewService>(PreviewService);
    puppeteerService = module.get(PuppeteerService);
    templateService = module.get(TemplateService);
    previewCacheService = module.get(PreviewCacheService);
    configService = module.get(ConfigService);
    loggerService = module.get(LoggerService);
  });

  describe('generatePreview', () => {
    it('deve gerar preview com sucesso', async () => {
      const mockBuffer = Buffer.from('mock-preview');
      
      templateService.generateRenderTemplate.mockReturnValue(mockTemplate);
      puppeteerService.renderHtml.mockResolvedValue(mockBuffer);
      previewCacheService.getCachedPreview.mockResolvedValue(null);
      previewCacheService.setCachedPreview.mockResolvedValue({
        url: 'https://storage.com/preview.png',
        createdAt: new Date(),
        expiresAt: new Date(),
        size: mockBuffer.length,
        metadata: {
          cacheKey: 'test-key',
          projectId: 'project-1',
          pageId: 'page-1',
          version: 1,
        },
      });
      configService.get.mockReturnValue(30000);

      const result = await service.generatePreview(
        'tenant-1',
        'project-1',
        mockPage,
        1,
        { dpi: 300, format: 'png', useCache: true },
      );

      expect(result.cached).toBe(false);
      expect(result.url).toBe('https://storage.com/preview.png');
      expect(result.metadata.dpi).toBe(300);
      expect(result.metadata.format).toBe('png');
      expect(templateService.generateRenderTemplate).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({ dpi: 300 }),
      );
      expect(puppeteerService.renderHtml).toHaveBeenCalledWith(
        mockTemplate.html,
        mockTemplate.css,
        expect.objectContaining({ dpi: 300, format: 'png' }),
      );
    });

    it('deve retornar preview do cache quando disponível', async () => {
      const cachedPreview = {
        url: 'https://storage.com/cached-preview.png',
        createdAt: new Date(),
        expiresAt: new Date(),
        size: 1024,
        metadata: {
          cacheKey: 'test-key',
          projectId: 'project-1',
          pageId: 'page-1',
          version: 1,
        },
      };

      previewCacheService.getCachedPreview.mockResolvedValue(cachedPreview);

      const result = await service.generatePreview(
        'tenant-1',
        'project-1',
        mockPage,
        1,
        { useCache: true },
      );

      expect(result.cached).toBe(true);
      expect(result.url).toBe(cachedPreview.url);
      expect(templateService.generateRenderTemplate).not.toHaveBeenCalled();
      expect(puppeteerService.renderHtml).not.toHaveBeenCalled();
    });

    it('deve validar dimensões da página', async () => {
      const invalidPage = { ...mockPage, width: 0, height: 0 };

      await expect(
        service.generatePreview('tenant-1', 'project-1', invalidPage, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve validar DPI', async () => {
      await expect(
        service.generatePreview('tenant-1', 'project-1', mockPage, 1, { dpi: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve alertar quando excede SLA de 30s', async () => {
      const mockBuffer = Buffer.from('mock-preview');
      
      templateService.generateRenderTemplate.mockReturnValue(mockTemplate);
      puppeteerService.renderHtml.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockBuffer), 35000)),
      );
      previewCacheService.getCachedPreview.mockResolvedValue(null);
      configService.get.mockReturnValue(30000);

      // Mock para simular upload rápido
      jest.spyOn(service as any, 'uploadPreview').mockResolvedValue('https://storage.com/preview.png');

      const result = await service.generatePreview(
        'tenant-1',
        'project-1',
        mockPage,
        1,
        { useCache: false },
      );

      expect(result.processingTime).toBeGreaterThan(30000);
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Preview excedeu SLA de 30s'),
        'PreviewService',
        expect.any(Object),
      );
    });
  });

  describe('generateHiDPIPreview', () => {
    it('deve gerar preview HiDPI com 300 DPI', async () => {
      const mockBuffer = Buffer.from('mock-hidpi-preview');
      
      templateService.generateRenderTemplate.mockReturnValue(mockTemplate);
      puppeteerService.renderHtml.mockResolvedValue(mockBuffer);
      previewCacheService.getCachedPreview.mockResolvedValue(null);
      previewCacheService.setCachedPreview.mockResolvedValue({
        url: 'https://storage.com/hidpi-preview.png',
        createdAt: new Date(),
        expiresAt: new Date(),
        size: mockBuffer.length,
        metadata: {
          cacheKey: 'test-key',
          projectId: 'project-1',
          pageId: 'page-1',
          version: 1,
        },
      });
      configService.get.mockReturnValue(30000);

      const result = await service.generateHiDPIPreview(
        'tenant-1',
        'project-1',
        mockPage,
        1,
      );

      expect(result.metadata.dpi).toBe(300);
      expect(result.metadata.format).toBe('png');
      expect(templateService.generateRenderTemplate).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({ dpi: 300, includeGuides: false }),
      );
    });
  });

  describe('generateThumbnail', () => {
    it('deve gerar thumbnail com tamanho máximo', async () => {
      const mockBuffer = Buffer.from('mock-thumbnail');
      
      templateService.generateRenderTemplate.mockReturnValue({
        ...mockTemplate,
        metadata: { ...mockTemplate.metadata, width: 300, height: 424 },
      });
      puppeteerService.renderHtml.mockResolvedValue(mockBuffer);
      previewCacheService.getCachedPreview.mockResolvedValue(null);
      previewCacheService.setCachedPreview.mockResolvedValue({
        url: 'https://storage.com/thumbnail.jpg',
        createdAt: new Date(),
        expiresAt: new Date(),
        size: mockBuffer.length,
        metadata: {
          cacheKey: 'test-key',
          projectId: 'project-1',
          pageId: 'page-1',
          version: 1,
        },
      });
      configService.get.mockReturnValue(30000);

      const result = await service.generateThumbnail(
        'tenant-1',
        'project-1',
        mockPage,
        1,
        300,
      );

      expect(result.metadata.format).toBe('jpeg');
      expect(templateService.generateRenderTemplate).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({
          dpi: expect.any(Number),
          includeGuides: false,
        }),
      );
    });
  });

  describe('invalidateCache', () => {
    it('deve invalidar cache do projeto', async () => {
      await service.invalidateCache('tenant-1', 'project-1');

      expect(previewCacheService.invalidateProjectCache).toHaveBeenCalledWith(
        'tenant-1',
        'project-1',
      );
    });

    it('deve invalidar cache da página específica', async () => {
      await service.invalidateCache('tenant-1', 'project-1', 'page-1');

      expect(previewCacheService.invalidatePageCache).toHaveBeenCalledWith(
        'tenant-1',
        'project-1',
        'page-1',
      );
    });
  });

  describe('getPreviewStats', () => {
    it('deve retornar estatísticas do cache', async () => {
      const mockStats = {
        totalFiles: 10,
        totalSize: 1024000,
        oldestFile: new Date('2024-01-01'),
        newestFile: new Date('2024-01-02'),
      };

      previewCacheService.getCacheStats.mockResolvedValue(mockStats);

      const result = await service.getPreviewStats('tenant-1');

      expect(result.cache).toEqual(mockStats);
      expect(previewCacheService.getCacheStats).toHaveBeenCalledWith('tenant-1');
    });
  });
});