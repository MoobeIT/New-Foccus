import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantThemeController } from './controllers/tenant-theme.controller';
import { TenantDataController } from './controllers/tenant-data.controller';
import { TenantIsolationController } from './controllers/tenant-isolation.controller';
import { TenantGuard } from './guards/tenant.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { TenantThemeService } from './services/tenant-theme.service';
import { TenantDataService } from './services/tenant-data.service';
import { TenantDataIsolationService } from './services/tenant-data-isolation.service';
import { TenantIsolationInterceptor } from './interceptors/tenant-isolation.interceptor';
import { TenantPrismaMiddleware } from './middleware/tenant-prisma.middleware';
import { TenantIsolationMiddleware } from './middleware/tenant-isolation.middleware';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    TenantsController,
    TenantThemeController,
    TenantDataController,
    TenantIsolationController,
  ],
  providers: [
    TenantsService,
    TenantThemeService,
    TenantDataService,
    TenantDataIsolationService,
    TenantGuard,
    TenantAccessGuard,
    TenantIsolationInterceptor,
    TenantPrismaMiddleware,
    TenantIsolationMiddleware,
  ],
  exports: [
    TenantsService,
    TenantThemeService,
    TenantDataService,
    TenantDataIsolationService,
    TenantGuard,
    TenantAccessGuard,
    TenantIsolationInterceptor,
    TenantPrismaMiddleware,
    TenantIsolationMiddleware,
  ],
})
export class TenantsModule {}