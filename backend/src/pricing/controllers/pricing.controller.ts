import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PricingService, PricingRequest, PricingResult } from '../services/pricing.service';
import { PricingRulesService } from '../services/pricing-rules.service';
import { ShippingService, ShippingResult } from '../services/shipping.service';
import { PricingRule } from '../entities/pricing-rule.entity';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';

class CalculatePriceDto {
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

class BulkPricingDto {
  requests: CalculatePriceDto[];
}

class CreatePricingRuleDto {
  productId?: string;
  variantId?: string;
  name: string;
  description?: string;
  conditions: any[];
  actions: any[];
  priority: number;
  active: boolean;
  validFrom?: Date;
  validTo?: Date;
}

class UpdatePricingRuleDto {
  name?: string;
  description?: string;
  conditions?: any[];
  actions?: any[];
  priority?: number;
  active?: boolean;
  validFrom?: Date;
  validTo?: Date;
}

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(
    private pricingService: PricingService,
    private pricingRulesService: PricingRulesService,
    private shippingService: ShippingService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular preço de produto' })
  @ApiBody({ type: CalculatePriceDto })
  @ApiResponse({ status: 200, description: 'Preço calculado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async calculatePrice(
    @Body() body: CalculatePriceDto,
    @CurrentTenant() tenantId: string,
  ): Promise<PricingResult> {
    const request: PricingRequest = {
      tenantId,
      ...body,
    };

    return this.pricingService.calculatePrice(request);
  }

  @Post('calculate/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular preços em lote' })
  @ApiBody({ type: BulkPricingDto })
  @ApiResponse({ status: 200, description: 'Preços calculados com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async calculateBulkPricing(
    @Body() body: BulkPricingDto,
    @CurrentTenant() tenantId: string,
  ): Promise<{ [key: string]: PricingResult }> {
    if (!body.requests || body.requests.length === 0) {
      throw new BadRequestException('Lista de requests é obrigatória');
    }

    if (body.requests.length > 100) {
      throw new BadRequestException('Máximo de 100 requests por lote');
    }

    const requests: PricingRequest[] = body.requests.map(req => ({
      tenantId,
      ...req,
    }));

    return this.pricingService.calculateBulkPricing(requests);
  }

  @Get('estimate/:productId')
  @ApiOperation({ summary: 'Estimativa rápida de preço' })
  @ApiQuery({ name: 'quantity', required: false, type: Number })
  @ApiQuery({ name: 'pages', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Estimativa gerada' })
  async getEstimate(
    @Param('productId') productId: string,
    @Query('quantity') quantity: number = 1,
    @Query('pages') pages?: number,
    @CurrentTenant() tenantId?: string,
  ): Promise<{ estimatedPrice: number; currency: string }> {
    const request: PricingRequest = {
      tenantId,
      productId,
      quantity,
      pages,
    };

    const result = await this.pricingService.calculatePrice(request);

    return {
      estimatedPrice: result.total,
      currency: result.currency,
    };
  }

  // Endpoints para gerenciar regras de preço
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar regra de preço' })
  @ApiBody({ type: CreatePricingRuleDto })
  @ApiResponse({ status: 201, description: 'Regra criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createPricingRule(
    @Body() body: CreatePricingRuleDto,
    @CurrentTenant() tenantId: string,
  ): Promise<PricingRule> {
    // Validar regra
    const validation = this.pricingRulesService.validateRule(body);
    if (!validation.valid) {
      throw new BadRequestException(`Regra inválida: ${validation.errors.join(', ')}`);
    }

    const rule = await this.pricingRulesService.createRule({
      tenantId,
      ...body,
    });

    // Invalidar cache de preços
    await this.pricingService.invalidateCache(tenantId, body.productId);

    return rule;
  }

  @Get('rules')
  @ApiOperation({ summary: 'Listar regras de preço do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de regras' })
  async getPricingRules(
    @CurrentTenant() tenantId: string,
  ): Promise<PricingRule[]> {
    return this.pricingRulesService.getRulesByTenant(tenantId);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Obter regra de preço por ID' })
  @ApiResponse({ status: 200, description: 'Regra encontrada' })
  @ApiResponse({ status: 404, description: 'Regra não encontrada' })
  async getPricingRule(@Param('id') id: string): Promise<PricingRule> {
    const rule = await this.pricingRulesService.getRuleById(id);
    
    if (!rule) {
      throw new BadRequestException('Regra não encontrada');
    }

    return rule;
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Atualizar regra de preço' })
  @ApiBody({ type: UpdatePricingRuleDto })
  @ApiResponse({ status: 200, description: 'Regra atualizada' })
  @ApiResponse({ status: 404, description: 'Regra não encontrada' })
  async updatePricingRule(
    @Param('id') id: string,
    @Body() body: UpdatePricingRuleDto,
    @CurrentTenant() tenantId: string,
  ): Promise<PricingRule> {
    const existingRule = await this.pricingRulesService.getRuleById(id);
    
    if (!existingRule) {
      throw new BadRequestException('Regra não encontrada');
    }

    // Validar atualizações
    const mergedRule = { ...existingRule, ...body };
    const validation = this.pricingRulesService.validateRule(mergedRule);
    
    if (!validation.valid) {
      throw new BadRequestException(`Regra inválida: ${validation.errors.join(', ')}`);
    }

    const updatedRule = await this.pricingRulesService.updateRule(id, body);

    // Invalidar cache
    await this.pricingService.invalidateCache(tenantId, existingRule.productId);

    return updatedRule;
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir regra de preço' })
  @ApiResponse({ status: 204, description: 'Regra excluída' })
  @ApiResponse({ status: 404, description: 'Regra não encontrada' })
  async deletePricingRule(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    const existingRule = await this.pricingRulesService.getRuleById(id);
    
    if (!existingRule) {
      throw new BadRequestException('Regra não encontrada');
    }

    await this.pricingRulesService.deleteRule(id);

    // Invalidar cache
    await this.pricingService.invalidateCache(tenantId, existingRule.productId);
  }

  @Post('rules/:id/simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular aplicação de regra' })
  @ApiBody({ type: BulkPricingDto })
  @ApiResponse({ status: 200, description: 'Simulação executada' })
  async simulateRule(
    @Param('id') id: string,
    @Body() body: BulkPricingDto,
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    const rule = await this.pricingRulesService.getRuleById(id);
    
    if (!rule) {
      throw new BadRequestException('Regra não encontrada');
    }

    const testCases: PricingRequest[] = body.requests.map(req => ({
      tenantId,
      ...req,
    }));

    return this.pricingRulesService.simulateRule(rule, testCases);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidar cache de preços' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiResponse({ status: 204, description: 'Cache invalidado' })
  async invalidateCache(
    @Query('productId') productId?: string,
    @CurrentTenant() tenantId?: string,
  ): Promise<void> {
    await this.pricingService.invalidateCache(tenantId, productId);
  }

  // Endpoints de frete
  @Post('shipping/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular frete para produto' })
  @ApiResponse({ status: 200, description: 'Frete calculado' })
  async calculateShipping(
    @Body() body: {
      productId: string;
      variantId?: string;
      quantity: number;
      destinationCep: string;
    },
    @CurrentTenant() tenantId: string,
  ): Promise<ShippingResult> {
    const { productId, variantId, quantity, destinationCep } = body;

    if (!productId || !quantity || !destinationCep) {
      throw new BadRequestException('productId, quantity e destinationCep são obrigatórios');
    }

    return this.pricingService.calculateShippingOnly(
      tenantId,
      productId,
      variantId,
      quantity,
      destinationCep,
    );
  }

  @Get('shipping/cep/:cep')
  @ApiOperation({ summary: 'Consultar informações do CEP' })
  @ApiResponse({ status: 200, description: 'Informações do CEP' })
  async getCepInfo(@Param('cep') cep: string): Promise<any> {
    return this.pricingService.getCepInfo(cep);
  }

  @Post('shipping/free-shipping-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar elegibilidade para frete grátis' })
  @ApiResponse({ status: 200, description: 'Status do frete grátis' })
  async checkFreeShipping(
    @Body() body: {
      orderValue: number;
      destinationCep: string;
    },
    @CurrentTenant() tenantId: string,
  ): Promise<{
    eligible: boolean;
    threshold: number;
    remaining?: number;
  }> {
    const { orderValue, destinationCep } = body;

    if (!orderValue || !destinationCep) {
      throw new BadRequestException('orderValue e destinationCep são obrigatórios');
    }

    return this.pricingService.checkFreeShipping(tenantId, orderValue, destinationCep);
  }

  @Delete('shipping/cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidar cache de frete' })
  @ApiQuery({ name: 'cep', required: false })
  @ApiResponse({ status: 204, description: 'Cache invalidado' })
  async invalidateShippingCache(@Query('cep') cep?: string): Promise<void> {
    await this.shippingService.invalidateCache(cep);
  }

  // Endpoint para teste de preços
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar cálculo de preços com dados mock' })
  @ApiResponse({ status: 200, description: 'Teste executado' })
  async testPricing(
    @CurrentTenant() tenantId: string,
  ): Promise<{
    simple: PricingResult;
    withPages: PricingResult;
    bulk: PricingResult;
    business: PricingResult;
    withShipping: PricingResult;
  }> {
    const mockProductId = 'test-fotolivro';

    // Teste simples
    const simple = await this.pricingService.calculatePrice({
      tenantId,
      productId: mockProductId,
      quantity: 1,
    });

    // Teste com páginas extras
    const withPages = await this.pricingService.calculatePrice({
      tenantId,
      productId: mockProductId,
      quantity: 1,
      pages: 30,
    });

    // Teste com quantidade (desconto)
    const bulk = await this.pricingService.calculatePrice({
      tenantId,
      productId: mockProductId,
      quantity: 10,
    });

    // Teste cliente empresarial
    const business = await this.pricingService.calculatePrice({
      tenantId,
      productId: mockProductId,
      quantity: 5,
      customerType: 'business',
    });

    // Teste com frete
    const withShipping = await this.pricingService.calculatePrice({
      tenantId,
      productId: mockProductId,
      quantity: 1,
      shipping: {
        destinationCep: '01310-100',
        calculateShipping: true,
      },
    });

    return {
      simple,
      withPages,
      bulk,
      business,
      withShipping,
    };
  }
}