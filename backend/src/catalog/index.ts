// Entities
export * from './entities/product.entity';
export * from './entities/template.entity';

// Services
export * from './services/products.service';
export { ProductVariantsService, ProductVariantEntity } from './services/product-variants.service';
export * from './services/templates.service';
export * from './services/template-version.service';
export * from './services/template-validation.service';

// DTOs
export * from './dto/create-product.dto';
export * from './dto/update-product.dto';
export * from './dto/create-product-variant.dto';
export * from './dto/update-product-variant.dto';
export * from './dto/create-template.dto';
export * from './dto/update-template.dto';

// Module
export * from './catalog.module';