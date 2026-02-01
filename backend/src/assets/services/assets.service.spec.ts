import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { StorageService } from './storage.service';
import { ImageProcessingService } from './image-processing.service';
import { FaceDetectionService } from './face-detection.service';
import { DeduplicationService } from './deduplication.service';
import { AssetProcessingStatus } from '../entities/asset.entity';

describe('AssetsService', () => {
  let service: AssetsService;
  let prismaService: PrismaService;
  let storageService: StorageService;
  let imageProcessingService: ImageProcessingService;
  let faceDetectionService: FaceDetectionService;
  let deduplicationService: DeduplicationService;

  const mockPrismaService = {
    asset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockStorageService = {
    getUploadUrl: jest.fn(),
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    downloadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockImageProcessingService = {
    processImage: jest.fn(),
  };

  const mockFaceDetectionService = {
    detectFaces: jest.fn(),
  };

  const mockDeduplicationService = {
    findDuplicates: jest.fn(),
  };

  const mockValidationService = {
    isValidUuid: jest.fn(),
  };

  const mockLoggerService = {
    logUserAction: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ImageProcessingService, useValue: mockImageProcessingService },
        { provide: FaceDetectionService, useValue: mockFaceDetectionService },
        { provide: DeduplicationService, useValue: mockDeduplicationService },
        { provide: ValidationService, useValue: mockValidationService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    prismaService = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);
    imageProcessingService = module.get<ImageProcessingService>(ImageProcessingService);
    faceDetectionService = module.get<FaceDetectionService>(FaceDetectionService);
    deduplicationService = module.get<DeduplicationService>(DeduplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUploadUrl', () => {
    it('should generate upload URL for valid file', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dto = {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: '1024000',
      };

      const expectedResult = {
        uploadUrl: 'https://example.com/upload',
        storageKey: 'assets/user-123/test.jpg',
      };

      mockStorageService.getUploadUrl.mockResolvedValue(expectedResult);

      const result = await service.getUploadUrl(userId, tenantId, dto);

      expect(storageService.getUploadUrl).toHaveBeenCalledWith(
        userId,
        dto.filename,
        dto.mimeType,
        1024000,
      );
      expect(result).toEqual(expectedResult);
      expect(mockLoggerService.logUserAction).toHaveBeenCalled();
    });

    it('should reject invalid mime type', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dto = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: '1024000',
      };

      await expect(service.getUploadUrl(userId, tenantId, dto)).rejects.toThrow(
        'Tipo de arquivo não permitido',
      );
    });

    it('should reject file too large', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dto = {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: '60000000', // 60MB
      };

      await expect(service.getUploadUrl(userId, tenantId, dto)).rejects.toThrow(
        'Arquivo muito grande (máximo 50MB)',
      );
    });
  });

  describe('completeUpload', () => {
    it('should create asset and start processing', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dto = {
        storageKey: 'assets/user-123/test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: '1024000',
        autoProcess: true,
      };

      const mockAsset = {
        id: 'asset-123',
        userId,
        tenantId,
        storageKey: dto.storageKey,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        processingStatus: AssetProcessingStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.asset.create.mockResolvedValue(mockAsset);
      mockStorageService.getFileUrl.mockResolvedValue('https://example.com/file.jpg');

      const result = await service.completeUpload(userId, tenantId, dto);

      expect(prismaService.asset.create).toHaveBeenCalledWith({
        data: {
          userId,
          tenantId,
          storageKey: dto.storageKey,
          filename: dto.filename,
          mimeType: dto.mimeType,
          sizeBytes: BigInt(dto.sizeBytes),
          processingStatus: AssetProcessingStatus.PENDING,
        },
      });

      expect(result.id).toBe(mockAsset.id);
      expect(result.processingStatus).toBe(AssetProcessingStatus.PENDING);
    });
  });

  describe('processAsset', () => {
    it('should process asset successfully', async () => {
      const assetId = 'asset-123';
      const mockAsset = {
        id: assetId,
        userId: 'user-123',
        tenantId: 'tenant-123',
        storageKey: 'assets/user-123/test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt('1024000'),
        processingStatus: AssetProcessingStatus.PENDING,
      };

      const mockProcessingResult = {
        metadata: { width: 800, height: 600, format: 'jpeg', size: 1024000, hasAlpha: false, channels: 3 },
        exifData: { orientation: 1 },
        thumbnails: { small: Buffer.from('small'), medium: Buffer.from('medium'), large: Buffer.from('large') },
        phash: 'abc123def456',
      };

      const mockFaceResult = {
        faces: [{ x: 100, y: 100, width: 200, height: 200, confidence: 0.9 }],
        processingTime: 150,
        method: 'mock' as const,
      };

      const mockDuplicationResult = {
        isDuplicate: false,
        similarAssets: [],
        method: 'phash' as const,
      };

      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrismaService.asset.update.mockResolvedValue({
        ...mockAsset,
        processingStatus: AssetProcessingStatus.COMPLETED,
        width: 800,
        height: 600,
      });

      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('image data'));
      mockStorageService.uploadFile.mockResolvedValue('uploaded');
      mockStorageService.getFileUrl.mockResolvedValue('https://example.com/thumb.jpg');

      mockImageProcessingService.processImage.mockResolvedValue(mockProcessingResult);
      mockFaceDetectionService.detectFaces.mockResolvedValue(mockFaceResult);
      mockDeduplicationService.findDuplicates.mockResolvedValue(mockDuplicationResult);

      const result = await service.processAsset(assetId);

      expect(imageProcessingService.processImage).toHaveBeenCalled();
      expect(faceDetectionService.detectFaces).toHaveBeenCalled();
      expect(deduplicationService.findDuplicates).toHaveBeenCalled();
      expect(result.processingStatus).toBe(AssetProcessingStatus.COMPLETED);
    });

    it('should handle processing failure', async () => {
      const assetId = 'asset-123';
      const mockAsset = {
        id: assetId,
        processingStatus: AssetProcessingStatus.PENDING,
      };

      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrismaService.asset.update.mockResolvedValue(mockAsset);
      mockStorageService.downloadFile.mockRejectedValue(new Error('Storage error'));

      await expect(service.processAsset(assetId)).rejects.toThrow();

      expect(prismaService.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: { processingStatus: AssetProcessingStatus.FAILED },
      });
    });
  });

  describe('findAll', () => {
    it('should return filtered assets', async () => {
      const filters = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        processingStatus: AssetProcessingStatus.COMPLETED,
      };

      const mockAssets = [
        {
          id: 'asset-1',
          filename: 'test1.jpg',
          processingStatus: AssetProcessingStatus.COMPLETED,
        },
        {
          id: 'asset-2',
          filename: 'test2.jpg',
          processingStatus: AssetProcessingStatus.COMPLETED,
        },
      ];

      mockPrismaService.asset.findMany.mockResolvedValue(mockAssets);
      mockStorageService.getFileUrl.mockResolvedValue('https://example.com/file.jpg');

      const result = await service.findAll(filters);

      expect(prismaService.asset.findMany).toHaveBeenCalledWith({
        where: {
          userId: filters.userId,
          tenantId: filters.tenantId,
          processingStatus: filters.processingStatus,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should delete asset and files', async () => {
      const assetId = 'asset-123';
      const userId = 'user-123';
      const tenantId = 'tenant-123';

      const mockAsset = {
        id: assetId,
        storageKey: 'assets/user-123/test.jpg',
        thumbnailUrls: { small: 'thumb-small.jpg', medium: 'thumb-medium.jpg' },
      };

      mockValidationService.isValidUuid.mockReturnValue(true);
      mockPrismaService.asset.findFirst.mockResolvedValue(mockAsset);
      mockStorageService.getFileUrl.mockResolvedValue('https://example.com/file.jpg');
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.asset.delete.mockResolvedValue(mockAsset);

      await service.remove(assetId, userId, tenantId);

      expect(storageService.deleteFile).toHaveBeenCalledWith(mockAsset.storageKey);
      expect(prismaService.asset.delete).toHaveBeenCalledWith({ where: { id: assetId } });
    });
  });
});