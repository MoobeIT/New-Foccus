import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ProductsService } from './services/products.service';
import { ProductVariantsService } from './services/product-variants.service';
import { TemplatesService } from './services/templates.service';
import { TemplateVersionService } from './services/template-version.service';
import { TemplateValidationService } from './services/template-validation.service';
import { FormatsService } from './services/formats.service';
import { PapersService } from './services/papers.service';
import { CoverTypesService } from './services/cover-types.service';
import { CouponsService } from './services/coupons.service';
import { ProductsController } from './controllers/products.controller';
import { ProductVariantsController } from './controllers/product-variants.controller';
import { TemplatesController } from './controllers/templates.controller';
import { TemplateVersionController } from './controllers/template-version.controller';
import { FormatsController } from './controllers/formats.controller';
import { PapersController } from './controllers/papers.controller';
import { CoverTypesController } from './controllers/cover-types.controller';
import { CouponsController } from './controllers/coupons.controller';
import { CatalogStatsController } from './controllers/catalog-stats.controller';
import { PublicCatalogController } from './controllers/public-catalog.controller';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    DatabaseModule,
    TenantsModule,
    CacheModule.register({
      ttl: 600,
    }),
  ],
  controllers: [
    ProductsController, 
    ProductVariantsController, 
    TemplatesController,
    TemplateVersionController,
    FormatsController,
    PapersController,
    CoverTypesController,
    CouponsController,
    CatalogStatsController,
    PublicCatalogController,
  ],
  providers: [
    ProductsService, 
    ProductVariantsService, 
    TemplatesService,
    TemplateVersionService,
    TemplateValidationService,
    FormatsService,
    PapersService,
    CoverTypesService,
    CouponsService,
  ],
  exports: [
    ProductsService, 
    ProductVariantsService, 
    TemplatesService,
    TemplateVersionService,
    TemplateValidationService,
    FormatsService,
    PapersService,
    CoverTypesService,
    CouponsService,
  ],
})
export class CatalogModule {}
