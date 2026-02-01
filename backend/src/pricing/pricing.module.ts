import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PricingService } from './services/pricing.service';
import { PricingRulesService } from './services/pricing-rules.service';
import { ShippingService } from './services/shipping.service';
import { PricingController } from './controllers/pricing.controller';
import { ShippingController } from './controllers/shipping.controller';
import { CatalogModule } from '../catalog/catalog.module';
import { TenantsModule } from '../tenants/tenants.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TenantsModule,
    CatalogModule,
    CommonModule,
    CacheModule.register({
      ttl: 300, // 5 minutos de cache para preços
    }),
  ],
  controllers: [PricingController, ShippingController],
  providers: [PricingService, PricingRulesService, ShippingService],
  exports: [PricingService, PricingRulesService, ShippingService],
})
export class PricingModule {}