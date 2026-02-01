import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';
import { TracingService } from './tracing.service';
import { AlertsService } from './alerts.service';
import { DashboardService } from './dashboard.service';
import { PerformanceService } from './performance.service';
import { ObservabilityController } from './observability.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [ObservabilityController],
  providers: [
    StructuredLoggerService,
    LoggingInterceptor,
    MetricsService,
    HealthService,
    TracingService,
    AlertsService,
    DashboardService,
    PerformanceService,
  ],
  exports: [
    StructuredLoggerService,
    LoggingInterceptor,
    MetricsService,
    HealthService,
    TracingService,
    AlertsService,
    DashboardService,
    PerformanceService,
  ],
})
export class ObservabilityModule {}