import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AssetsService } from './services/assets.service';
import { StorageService } from './services/storage.service';
import { ImageProcessingService } from './services/image-processing.service';
import { FaceDetectionService } from './services/face-detection.service';
import { DeduplicationService } from './services/deduplication.service';
import { AdvancedAnalysisService } from './services/advanced-analysis.service';
import { AssetsController } from './controllers/assets.controller';
import { FaceDetectionController } from './controllers/face-detection.controller';
import { AdvancedAnalysisController } from './controllers/advanced-analysis.controller';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    DatabaseModule,
    TenantsModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get('upload.maxFileSize') === '50MB' ? 50 * 1024 * 1024 : 50 * 1024 * 1024,
          files: configService.get('upload.maxFilesPerUpload') || 100,
        },
        fileFilter: (req, file, callback) => {
          const allowedMimes = configService.get('upload.allowedMimeTypes') || [
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/webp',
          ];
          
          if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error('Tipo de arquivo não permitido'), false);
          }
        },
      }),
    }),
  ],
  controllers: [
    AssetsController,
    FaceDetectionController,
    AdvancedAnalysisController,
  ],
  providers: [
    AssetsService,
    StorageService,
    ImageProcessingService,
    FaceDetectionService,
    DeduplicationService,
    AdvancedAnalysisService,
  ],
  exports: [
    AssetsService,
    StorageService,
    ImageProcessingService,
    FaceDetectionService,
    DeduplicationService,
    AdvancedAnalysisService,
  ],
})
export class AssetsModule {}