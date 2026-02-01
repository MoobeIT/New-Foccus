import { Test, TestingModule } from '@nestjs/testing';
import { ProjectValidationService } from './project-validation.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { AssetsService } from '../../assets/services/assets.service';
import { ProductVariantsService } from '../../catalog/services/product-variants.service';

describe('ProjectValidationService', () => {
  let service: ProjectValidationService;
  let assetsService: AssetsService;
  let variantsService: ProductVariantsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLoggerService = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockAssetsService = {
    findOne: jest.fn(),
  };

  const mockVariantsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: AssetsService, useValue: mockAssetsService },
        { provide: ProductVariantsService, useValue: mockVariantsService },
      ],
    }).compile();

    service = module.get<ProjectValidationService>(ProjectValidationService);
    assetsService = module.get<AssetsService>(AssetsService);
    variantsService = module.get<ProductVariantsService>(ProductVariantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProject', () => {
    it('should validate a simple project successfully', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'photo' as const,
              frame: { x: 10, y: 10, width: 100, height: 100 },
              assetId: 'asset-123',
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        id: 'variant-123',
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      const asset = {
        id: 'asset-123',
        processingStatus: 'completed',
        width: 1200,
        height: 1200,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);
      mockAssetsService.findOne.mockResolvedValue(asset);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
      expect(result.issues.some(issue => issue.code === 'PHOTO_GOOD_RESOLUTION')).toBe(true);
    });

    it('should detect low resolution photos', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'photo' as const,
              frame: { x: 10, y: 10, width: 100, height: 100 }, // Large element
              assetId: 'asset-123',
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      const asset = {
        id: 'asset-123',
        processingStatus: 'completed',
        width: 300, // Small image
        height: 300,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);
      mockAssetsService.findOne.mockResolvedValue(asset);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.valid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.code === 'PHOTO_LOW_RESOLUTION')).toBe(true);
    });

    it('should detect elements outside page bounds', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'text' as const,
              frame: { x: 250, y: 250, width: 50, height: 20 }, // Outside 200x200 page
              content: 'Test text',
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.code === 'ELEMENT_OUT_OF_BOUNDS')).toBe(true);
    });

    it('should detect text outside safe area', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'text' as const,
              frame: { x: 2, y: 2, width: 50, height: 20 }, // Inside bleed but outside safe area
              content: 'Test text',
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.issues.some(issue => issue.code === 'TEXT_OUTSIDE_SAFE_AREA')).toBe(true);
    });

    it('should validate page count limits', async () => {
      const pages = []; // No pages

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 2, // Requires at least 2 pages
        maxPages: 100,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.code === 'TOO_FEW_PAGES')).toBe(true);
      expect(result.issues.some(issue => issue.code === 'NO_CONTENT')).toBe(true);
    });

    it('should detect empty text elements', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'text' as const,
              frame: { x: 10, y: 10, width: 50, height: 20 },
              content: '', // Empty text
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.issues.some(issue => issue.code === 'TEXT_EMPTY')).toBe(true);
    });

    it('should detect overlapping elements', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'text' as const,
              frame: { x: 10, y: 10, width: 50, height: 20 },
              content: 'Text 1',
            },
            {
              id: 'element-2',
              type: 'text' as const,
              frame: { x: 30, y: 15, width: 50, height: 20 }, // Overlaps with element-1
              content: 'Text 2',
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);

      const result = await service.validateProject(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.issues.some(issue => issue.code === 'ELEMENTS_OVERLAP')).toBe(true);
    });
  });

  describe('quickValidate', () => {
    it('should return only critical issues', async () => {
      const pages = [
        {
          index: 0,
          elements: [
            {
              id: 'element-1',
              type: 'photo' as const,
              frame: { x: 10, y: 10, width: 100, height: 100 },
              assetId: 'asset-123',
            },
            {
              id: 'element-2',
              type: 'text' as const,
              frame: { x: 10, y: 120, width: 50, height: 20 },
              content: '', // Empty text (warning, not critical)
            },
          ],
          guides: { bleed: 3, safeArea: 5 },
        },
      ];

      const variant = {
        sizeMm: { width: 200, height: 200 },
        minPages: 1,
        maxPages: 100,
      };

      const asset = {
        id: 'asset-123',
        processingStatus: 'completed',
        width: 300, // Low resolution (critical)
        height: 300,
      };

      mockVariantsService.findOne.mockResolvedValue(variant);
      mockAssetsService.findOne.mockResolvedValue(asset);

      const result = await service.quickValidate(pages, 'variant-123', 'user-123', 'tenant-123');

      expect(result.valid).toBe(false);
      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.criticalIssues.some(issue => issue.code === 'PHOTO_LOW_RESOLUTION')).toBe(true);
      expect(result.criticalIssues.some(issue => issue.code === 'TEXT_EMPTY')).toBe(false); // Not critical
    });
  });
});