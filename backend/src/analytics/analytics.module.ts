import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [CommonModule, TenantsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
