import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../../common/services/logger.service';
import { PricingRulesService } from './pricing-rules.service';
import { ProductsService } from '../../catalog/services/products.service';
import { ProductVariantsService } from '../../catalog/services/product-variants.service';
import { ShippingService, ShippingRequest, ShippingResult } from './shipping.service';

export interface PricingRequest {
  tenantId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  pages?: number;
  customizations?: Record<string, any>;
  customerType?: 'individual' | 'business' | 'reseller';
  promoCode?: string;
  shipping?: {
    destinationCep: string;
    calculateShipping?: boolean;
  };
}

export interface PricingResult {
  basePrice: number;
  additionalPagesPrice: number;
  customizationsPrice: number;
  discounts: PricingDiscount[];
  subtotal: number;
  taxes: PricingTax[];
  shipping?: ShippingResult;
  total: number;
  currency: string;
  breakdown: PricingBreakdown[];
  metadata: Record<string, any>;
}

export interface PricingDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tier';
  value: number;
  amount: number;
  description?: string;
}

export interface PricingTax {
  id: string;
  name: string;
  rate: number;
  amount: number;
  type: 'percentage' | 'fixed';
}

export interface PricingBreakdown {
  item: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Injectable()
export class PricingService {
  constructor(
    private pricingRulesService: PricingRulesService,
    private productsService: ProductsService,
    private productVariantsService: ProductVariantsService,
    private shippingService: ShippingService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async calculatePrice(request: PricingRequest): Promise<PricingResult> {
    try {
      this.logger.debug(
        `Calculando preço para produto ${request.productId}`,
        'PricingService',
        { request },
      );

      // Verificar cache
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.cacheManager.get<PricingResult>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Preço servido do cache', 'PricingService');
        return cachedResult;
      }

      // Validar entrada
      await this.validatePricingRequest(request);

      // Obter produto e variante
      const product = await this.productsService.findById(request.productId);
      const variant = request.variantId 
        ? await this.productVariantsService.findById(request.variantId)
        : null;

      // Calcular preço base
      const basePrice = await this.calculateBasePrice(request, product, variant);

      // Calcular preço de páginas adicionais
      const additionalPagesPrice = await this.calculateAdditionalPagesPrice(
        request,
        product,
        variant,
      );

      // Calcular preço de customizações
      const customizationsPrice = await this.calculateCustomizationsPrice(
        request,
        product,
        variant,
      );

      // Calcular subtotal
      const subtotal = basePrice + additionalPagesPrice + customizationsPrice;

      // Aplicar descontos
      const discounts = await this.calculateDiscounts(request, subtotal, product, variant);
      const totalDiscounts = discounts.reduce((sum, discount) => sum + discount.amount, 0);

      // Calcular impostos
      const taxes = await this.calculateTaxes(request, subtotal - totalDiscounts);
      const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);

      // Calcular frete se solicitado
      let shipping: ShippingResult | undefined;
      let shippingCost = 0;

      if (request.shipping?.calculateShipping && request.shipping.destinationCep) {
        shipping = await this.calculateShippingCost(request, product, variant);
        // Usar a opção mais barata para o total
        if (shipping.options.length > 0) {
          shippingCost = Math.min(...shipping.options.map(option => option.price));
        }
      }

      // Total final
      const total = subtotal - totalDiscounts + totalTaxes + shippingCost;

      // Gerar breakdown detalhado
      const breakdown = this.generateBreakdown(
        request,
        basePrice,
        additionalPagesPrice,
        customizationsPrice,
        product,
        variant,
      );

      const result: PricingResult = {
        basePrice,
        additionalPagesPrice,
        customizationsPrice,
        discounts,
        subtotal,
        taxes,
        shipping,
        total,
        currency: 'BRL',
        breakdown,
        metadata: {
          productName: product.name,
          variantName: variant?.name,
          calculatedAt: new Date().toISOString(),
          cacheKey,
          shippingIncluded: !!shipping,
        },
      };

      // Salvar no cache
      await this.cacheManager.set(cacheKey, result, 300); // 5 minutos

      this.logger.debug(
        `Preço calculado: ${result.total} ${result.currency}`,
        'PricingService',
        { productId: request.productId, total: result.total },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Erro no cálculo de preço',
        error.stack,
        'PricingService',
        { request },
      );
      throw error;
    }
  }

  async calculateBulkPricing(
    requests: PricingRequest[],
  ): Promise<{ [key: string]: PricingResult }> {
    const results: { [key: string]: PricingResult } = {};

    // Processar em paralelo com limite de concorrência
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request, index) => {
        const key = `${i + index}`;
        try {
          results[key] = await this.calculatePrice(request);
        } catch (error) {
          this.logger.error(
            `Erro no cálculo bulk para item ${key}`,
            error.stack,
            'PricingService',
          );
          // Continuar com outros itens mesmo se um falhar
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  private async validatePricingRequest(request: PricingRequest): Promise<void> {
    if (!request.tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }

    if (!request.productId) {
      throw new Error('Product ID é obrigatório');
    }

    if (!request.quantity || request.quantity < 1) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    if (request.pages && request.pages < 1) {
      throw new Error('Número de páginas deve ser maior que zero');
    }
  }

  private async calculateBasePrice(
    request: PricingRequest,
    product: any,
    variant: any,
  ): Promise<number> {
    // Obter regras de preço aplicáveis
    const rules = await this.pricingRulesService.getApplicableRules(
      request.tenantId,
      request.productId,
      request.variantId,
    );

    // Aplicar regras em ordem de prioridade
    let basePrice = variant?.basePrice || product.basePrice || 0;

    for (const rule of rules) {
      if (await this.pricingRulesService.evaluateConditions(rule.conditions, request)) {
        basePrice = this.pricingRulesService.applyActions(rule.actions, basePrice, request);
      }
    }

    return basePrice * request.quantity;
  }

  private async calculateAdditionalPagesPrice(
    request: PricingRequest,
    product: any,
    variant: any,
  ): Promise<number> {
    if (!request.pages) {
      return 0;
    }

    const basePages = variant?.basePages || product.basePages || 0;
    const additionalPages = Math.max(0, request.pages - basePages);

    if (additionalPages === 0) {
      return 0;
    }

    const pricePerPage = variant?.additionalPagePrice || product.additionalPagePrice || 0;
    return additionalPages * pricePerPage * request.quantity;
  }

  private async calculateCustomizationsPrice(
    request: PricingRequest,
    product: any,
    variant: any,
  ): Promise<number> {
    if (!request.customizations) {
      return 0;
    }

    let customizationPrice = 0;

    // Calcular preço de cada customização
    for (const [key, value] of Object.entries(request.customizations)) {
      const customizationConfig = product.customizations?.[key] || variant?.customizations?.[key];
      
      if (customizationConfig && customizationConfig.price) {
        if (typeof customizationConfig.price === 'number') {
          customizationPrice += customizationConfig.price;
        } else if (customizationConfig.price.type === 'percentage') {
          // Calcular percentual sobre preço base
          const basePrice = variant?.basePrice || product.basePrice || 0;
          customizationPrice += basePrice * (customizationConfig.price.value / 100);
        }
      }
    }

    return customizationPrice * request.quantity;
  }

  private async calculateDiscounts(
    request: PricingRequest,
    subtotal: number,
    product: any,
    variant: any,
  ): Promise<PricingDiscount[]> {
    const discounts: PricingDiscount[] = [];

    // Desconto por quantidade
    const quantityDiscount = this.calculateQuantityDiscount(request.quantity, subtotal, product);
    if (quantityDiscount) {
      discounts.push(quantityDiscount);
    }

    // Desconto por tipo de cliente
    const customerDiscount = this.calculateCustomerTypeDiscount(
      request.customerType,
      subtotal,
      product,
    );
    if (customerDiscount) {
      discounts.push(customerDiscount);
    }

    // Código promocional
    if (request.promoCode) {
      const promoDiscount = await this.calculatePromoCodeDiscount(
        request.promoCode,
        subtotal,
        request,
      );
      if (promoDiscount) {
        discounts.push(promoDiscount);
      }
    }

    return discounts;
  }

  private calculateQuantityDiscount(
    quantity: number,
    subtotal: number,
    product: any,
  ): PricingDiscount | null {
    const tiers = product.quantityTiers || [];
    
    for (const tier of tiers.sort((a, b) => b.minQuantity - a.minQuantity)) {
      if (quantity >= tier.minQuantity) {
        const discountAmount = subtotal * (tier.discountPercentage / 100);
        
        return {
          id: `quantity-${tier.minQuantity}`,
          name: `Desconto por Quantidade (${quantity} unidades)`,
          type: 'percentage',
          value: tier.discountPercentage,
          amount: discountAmount,
          description: `${tier.discountPercentage}% de desconto para ${tier.minQuantity}+ unidades`,
        };
      }
    }

    return null;
  }

  private calculateCustomerTypeDiscount(
    customerType: string | undefined,
    subtotal: number,
    product: any,
  ): PricingDiscount | null {
    if (!customerType || !product.customerDiscounts) {
      return null;
    }

    const discount = product.customerDiscounts[customerType];
    if (!discount) {
      return null;
    }

    const discountAmount = subtotal * (discount.percentage / 100);

    return {
      id: `customer-${customerType}`,
      name: `Desconto ${customerType}`,
      type: 'percentage',
      value: discount.percentage,
      amount: discountAmount,
      description: discount.description,
    };
  }

  private async calculatePromoCodeDiscount(
    promoCode: string,
    subtotal: number,
    request: PricingRequest,
  ): Promise<PricingDiscount | null> {
    // TODO: Implementar validação de código promocional
    // Por enquanto, retornar null
    return null;
  }

  private async calculateTaxes(
    request: PricingRequest,
    taxableAmount: number,
  ): Promise<PricingTax[]> {
    const taxes: PricingTax[] = [];

    // Imposto padrão brasileiro (simplificado)
    const taxRate = 0.18; // 18% de impostos aproximados
    const taxAmount = taxableAmount * taxRate;

    taxes.push({
      id: 'br-tax',
      name: 'Impostos Brasileiros',
      rate: taxRate,
      amount: taxAmount,
      type: 'percentage',
    });

    return taxes;
  }

  private generateBreakdown(
    request: PricingRequest,
    basePrice: number,
    additionalPagesPrice: number,
    customizationsPrice: number,
    product: any,
    variant: any,
  ): PricingBreakdown[] {
    const breakdown: PricingBreakdown[] = [];

    // Preço base
    const unitBasePrice = basePrice / request.quantity;
    breakdown.push({
      item: 'base',
      description: `${product.name}${variant ? ` - ${variant.name}` : ''}`,
      quantity: request.quantity,
      unitPrice: unitBasePrice,
      totalPrice: basePrice,
    });

    // Páginas adicionais
    if (additionalPagesPrice > 0) {
      const basePages = variant?.basePages || product.basePages || 0;
      const additionalPages = (request.pages || 0) - basePages;
      const pricePerPage = variant?.additionalPagePrice || product.additionalPagePrice || 0;

      breakdown.push({
        item: 'additional_pages',
        description: `Páginas adicionais (${additionalPages} páginas)`,
        quantity: additionalPages * request.quantity,
        unitPrice: pricePerPage,
        totalPrice: additionalPagesPrice,
      });
    }

    // Customizações
    if (customizationsPrice > 0) {
      breakdown.push({
        item: 'customizations',
        description: 'Customizações',
        quantity: request.quantity,
        unitPrice: customizationsPrice / request.quantity,
        totalPrice: customizationsPrice,
      });
    }

    return breakdown;
  }

  private async calculateShippingCost(
    request: PricingRequest,
    product: any,
    variant: any,
  ): Promise<ShippingResult> {
    // Obter configurações de envio do produto
    const shippingConfig = variant?.shipping || product.shipping || {};
    
    // Configurações padrão
    const defaultWeight = 500; // 500g
    const defaultDimensions = { length: 30, width: 20, height: 5 }; // cm

    const shippingRequest: ShippingRequest = {
      originCep: shippingConfig.originCep || '01310-100', // CEP padrão (São Paulo)
      destinationCep: request.shipping!.destinationCep,
      weight: (shippingConfig.weight || defaultWeight) * request.quantity,
      dimensions: shippingConfig.dimensions || defaultDimensions,
      declaredValue: (variant?.basePrice || product.basePrice || 0) * request.quantity,
      services: shippingConfig.services,
    };

    return this.shippingService.calculateShipping(shippingRequest);
  }

  private generateCacheKey(request: PricingRequest): string {
    const keyData = {
      tenantId: request.tenantId,
      productId: request.productId,
      variantId: request.variantId,
      quantity: request.quantity,
      pages: request.pages,
      customizations: request.customizations,
      customerType: request.customerType,
      promoCode: request.promoCode,
      shipping: request.shipping,
    };

    return `pricing:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  async calculateShippingOnly(
    tenantId: string,
    productId: string,
    variantId: string | undefined,
    quantity: number,
    destinationCep: string,
  ): Promise<ShippingResult> {
    const product = await this.productsService.findById(productId);
    const variant = variantId ? await this.productVariantsService.findById(variantId) : null;

    const request: PricingRequest = {
      tenantId,
      productId,
      variantId,
      quantity,
      shipping: {
        destinationCep,
        calculateShipping: true,
      },
    };

    return this.calculateShippingCost(request, product, variant);
  }

  async getCepInfo(cep: string): Promise<any> {
    return this.shippingService.getCepInfo(cep);
  }

  async checkFreeShipping(
    tenantId: string,
    orderValue: number,
    destinationCep: string,
  ): Promise<{ eligible: boolean; threshold: number; remaining?: number }> {
    // Obter threshold de frete grátis
    const mockShippingRequest: ShippingRequest = {
      originCep: '01310-100',
      destinationCep,
      weight: 100,
      dimensions: { length: 10, width: 10, height: 5 },
      declaredValue: orderValue,
    };

    const shippingResult = await this.shippingService.calculateShipping(mockShippingRequest);
    const threshold = shippingResult.freeShippingThreshold || 150;

    const eligible = orderValue >= threshold;
    const remaining = eligible ? 0 : threshold - orderValue;

    return {
      eligible,
      threshold,
      remaining: remaining > 0 ? remaining : undefined,
    };
  }

  // Método para invalidar cache
  async invalidateCache(tenantId: string, productId?: string): Promise<void> {
    // TODO: Implementar invalidação seletiva de cache
    await this.cacheManager.reset();
    
    this.logger.debug(
      `Cache de preços invalidado para tenant ${tenantId}`,
      'PricingService',
      { tenantId, productId },
    );
  }
}