import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { RenderService } from './services/render.service';
import { PuppeteerService } from './services/puppeteer.service';
import { PdfService } from './services/pdf.service';
import { PDFGeneratorService } from './services/pdf-generator.service';
import { QueueService } from './services/queue.service';
import { TemplateService } from './services/template.service';
import { PreviewService } from './services/preview.service';
import { PreviewCacheService } from './services/preview-cache.service';
import { ProductionService } from './services/production.service';
import { RenderController } from './controllers/render.controller';
import { RenderProcessor } from './processors/render.processor';
import { AssetsModule } from '../assets/assets.module';
import { TenantsModule } from '../tenants/tenants.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    TenantsModule,
    DatabaseModule,
    // Configurar Bull Queue para jobs de renderização
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueType = configService.get('queue.type');
        
        if (queueType === 'memory') {
          // Para desenvolvimento local sem Redis
          return {
            redis: undefined,
            defaultJobOptions: {
              removeOnComplete: 10,
              removeOnFail: 5,
            },
          };
        }

        // Para produção com Redis
        return {
          redis: {
            host: configService.get('cache.redis.host'),
            port: configService.get('cache.redis.port'),
            password: configService.get('cache.redis.password'),
          },
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
    }),
    
    // Registrar filas específicas
    BullModule.registerQueue(
      { name: 'render-preview' },
      { name: 'render-final' },
      { name: 'render-3d' },
    ),

    AssetsModule,
  ],
  controllers: [RenderController],
  providers: [
    RenderService,
    PuppeteerService,
    PdfService,
    PDFGeneratorService,
    QueueService,
    TemplateService,
    PreviewService,
    PreviewCacheService,
    ProductionService,
    RenderProcessor,
  ],
  exports: [
    RenderService,
    PuppeteerService,
    PdfService,
    PDFGeneratorService,
    QueueService,
    TemplateService,
    PreviewService,
    PreviewCacheService,
    ProductionService,
  ],
})
export class RenderModule {}