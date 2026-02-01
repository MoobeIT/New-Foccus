import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';

// Note: ProductVariant model doesn't exist in schema
// Using Format as the variant concept for products

export interface ProductVariantEntity {
  id: string;
  productId: string;
  name: string;
  width: number;
  height: number;
  minPages: number;
  maxPages: number;
  priceMultiplier: number;
  active: boolean;
  sku?: string;
  basePrice?: number;
  priceRules?: any;
}

@Injectable()
export class ProductVariantsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(productId: string, tenantId: string): Promise<ProductVariantEntity[]> {
    // Using Format as variant
    const formats = await this.prisma.format.findMany({
      where: { productId, tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return formats.map(format => this.mapFormatToVariant(format));
  }

  async findById(id: string): Promise<ProductVariantEntity> {
    const format = await this.prisma.format.findUnique({
      where: { id },
    });

    if (!format) {
      throw new NotFoundException('Variante não encontrada');
    }

    return this.mapFormatToVariant(format);
  }

  async findOne(id: string, tenantId: string): Promise<ProductVariantEntity> {
    if (!this.validationService.isValidUuid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const format = await this.prisma.format.findFirst({
      where: { id, tenantId },
    });

    if (!format) {
      throw new NotFoundException('Variante não encontrada');
    }

    return this.mapFormatToVariant(format);
  }

  async findActive(productId: string, tenantId: string): Promise<ProductVariantEntity[]> {
    const formats = await this.prisma.format.findMany({
      where: { productId, tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return formats.map(format => this.mapFormatToVariant(format));
  }

  // Calculate price based on format
  calculatePrice(variant: ProductVariantEntity, pages: number, quantity: number = 1): number {
    const basePrice = variant.basePrice || 0;
    let price = basePrice * variant.priceMultiplier;

    // Extra pages pricing
    if (pages > variant.minPages) {
      const extraPages = pages - variant.minPages;
      const extraPagePrice = variant.priceRules?.extraPagePrice || 1;
      price += extraPages * extraPagePrice;
    }

    return Math.round(price * quantity * 100) / 100;
  }

  // Validate configuration
  validateConfiguration(variant: ProductVariantEntity, config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.pages) {
      if (config.pages < variant.minPages) {
        errors.push(`Número mínimo de páginas é ${variant.minPages}`);
      }
      if (config.pages > variant.maxPages) {
        errors.push(`Número máximo de páginas é ${variant.maxPages}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private mapFormatToVariant(format: any): ProductVariantEntity {
    return {
      id: format.id,
      productId: format.productId,
      name: format.name,
      width: format.width,
      height: format.height,
      minPages: format.minPages,
      maxPages: format.maxPages,
      priceMultiplier: format.priceMultiplier,
      active: format.isActive,
      basePrice: 0,
      priceRules: {},
    };
  }
}
