import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductVariantsService, ProductVariantEntity } from '../services/product-variants.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('product-variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Listar variantes (formatos) de um produto' })
  @ApiParam({ name: 'productId', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Lista de variantes' })
  async findByProduct(
    @Request() req,
    @Param('productId') productId: string,
  ): Promise<ProductVariantEntity[]> {
    return this.variantsService.findAll(productId, req.user.tenantId);
  }

  @Get('product/:productId/active')
  @ApiOperation({ summary: 'Listar variantes ativas de um produto' })
  @ApiParam({ name: 'productId', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Lista de variantes ativas' })
  async findActiveByProduct(
    @Request() req,
    @Param('productId') productId: string,
  ): Promise<ProductVariantEntity[]> {
    return this.variantsService.findActive(productId, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar variante por ID' })
  @ApiParam({ name: 'id', description: 'ID da variante' })
  @ApiResponse({ status: 200, description: 'Variante encontrada' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductVariantEntity> {
    return this.variantsService.findOne(id, req.user.tenantId);
  }

  @Post(':id/calculate-price')
  @ApiOperation({ summary: 'Calcular preço da variante' })
  @ApiParam({ name: 'id', description: 'ID da variante' })
  @ApiResponse({ status: 200, description: 'Preço calculado' })
  async calculatePrice(
    @Request() req,
    @Param('id') id: string,
    @Body() config: { pages: number; quantity?: number },
  ): Promise<{ price: number; basePrice: number; extraCosts: any }> {
    const variant = await this.variantsService.findOne(id, req.user.tenantId);
    const price = this.variantsService.calculatePrice(variant, config.pages, config.quantity || 1);
    
    return {
      price,
      basePrice: Number(variant.basePrice || 0),
      extraCosts: {
        extraPages: config.pages > variant.minPages ? config.pages - variant.minPages : 0,
        quantity: config.quantity || 1,
      },
    };
  }

  @Post(':id/validate-config')
  @ApiOperation({ summary: 'Validar configuração da variante' })
  @ApiParam({ name: 'id', description: 'ID da variante' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  async validateConfig(
    @Request() req,
    @Param('id') id: string,
    @Body() config: any,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const variant = await this.variantsService.findOne(id, req.user.tenantId);
    return this.variantsService.validateConfiguration(variant, config);
  }
}
