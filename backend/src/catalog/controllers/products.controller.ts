import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService, ProductFilters } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductEntity } from '../entities/product.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso', type: ProductEntity })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao tenant' })
  async create(
    @Request() req,
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductEntity> {
    return this.productsService.create(req.user?.tenantId || req.tenantId, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de produto' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoria' })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'published', required: false, description: 'Filtrar por status publicado' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome ou descrição' })
  @ApiResponse({ status: 200, description: 'Lista de produtos', type: [ProductEntity] })
  async findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('active') active?: string,
    @Query('published') published?: string,
    @Query('search') search?: string,
  ): Promise<ProductEntity[]> {
    const filters: ProductFilters = {
      tenantId: req.user?.tenantId || req.tenantId,
      type,
      category,
      active: active !== undefined ? active === 'true' : undefined,
      published: published !== undefined ? published === 'true' : undefined,
      search,
    };

    return this.productsService.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar apenas produtos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de produtos ativos', type: [ProductEntity] })
  async findActive(@Request() req): Promise<ProductEntity[]> {
    return this.productsService.findActive(req.user?.tenantId || req.tenantId);
  }

  @Get('published')
  @ApiOperation({ summary: 'Listar apenas produtos publicados' })
  @ApiResponse({ status: 200, description: 'Lista de produtos publicados', type: [ProductEntity] })
  async findPublished(@Request() req): Promise<ProductEntity[]> {
    return this.productsService.findPublished(req.user?.tenantId || req.tenantId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar produtos por tipo' })
  @ApiParam({ name: 'type', description: 'Tipo do produto' })
  @ApiResponse({ status: 200, description: 'Lista de produtos do tipo especificado', type: [ProductEntity] })
  async findByType(
    @Request() req,
    @Param('type') type: string,
  ): Promise<ProductEntity[]> {
    return this.productsService.findByType(req.user?.tenantId || req.tenantId, type);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar produto por slug' })
  @ApiParam({ name: 'slug', description: 'Slug do produto' })
  @ApiResponse({ status: 200, description: 'Produto encontrado', type: ProductEntity })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findBySlug(
    @Request() req,
    @Param('slug') slug: string,
  ): Promise<ProductEntity> {
    return this.productsService.findBySlug(slug, req.user?.tenantId || req.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto encontrado', type: ProductEntity })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.findOne(id, req.user?.tenantId || req.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado', type: ProductEntity })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductEntity> {
    return this.productsService.update(id, req.user?.tenantId || req.tenantId, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 204, description: 'Produto deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.productsService.remove(id, req.user?.tenantId || req.tenantId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto ativado', type: ProductEntity })
  async activate(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.activate(id, req.user?.tenantId || req.tenantId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativar produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto desativado', type: ProductEntity })
  async deactivate(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.deactivate(id, req.user?.tenantId || req.tenantId);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar produto no site' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto publicado', type: ProductEntity })
  async publish(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.publish(id, req.user?.tenantId || req.tenantId);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Despublicar produto do site' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto despublicado', type: ProductEntity })
  async unpublish(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.unpublish(id, req.user?.tenantId || req.tenantId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 201, description: 'Produto duplicado', type: ProductEntity })
  async duplicate(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProductEntity> {
    return this.productsService.duplicate(id, req.user?.tenantId || req.tenantId);
  }

  // ==========================================
  // VINCULAÇÕES COM FORMATOS, PAPÉIS E CAPAS
  // ==========================================

  @Post(':id/formats')
  @ApiOperation({ summary: 'Adicionar formato ao produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  async addFormatToProduct(
    @Request() req,
    @Param('id') productId: string,
    @Body() data: { formatId: string },
  ) {
    return this.productsService.addFormatToProduct(productId, data.formatId, req.user?.tenantId || req.tenantId);
  }

  @Delete(':id/formats/:formatId')
  @ApiOperation({ summary: 'Remover formato do produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiParam({ name: 'formatId', description: 'ID do formato' })
  async removeFormatFromProduct(
    @Request() req,
    @Param('id') productId: string,
    @Param('formatId') formatId: string,
  ) {
    return this.productsService.removeFormatFromProduct(productId, formatId, req.user?.tenantId || req.tenantId);
  }

  @Post(':id/papers')
  @ApiOperation({ summary: 'Adicionar papel ao produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  async addPaperToProduct(
    @Request() req,
    @Param('id') productId: string,
    @Body() data: { paperId: string; priceAdjustment?: number; isDefault?: boolean },
  ) {
    return this.productsService.addPaperToProduct(
      productId, 
      data.paperId, 
      req.user?.tenantId || req.tenantId,
      data.priceAdjustment || 0,
      data.isDefault || false
    );
  }

  @Delete(':id/papers/:paperId')
  @ApiOperation({ summary: 'Remover papel do produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiParam({ name: 'paperId', description: 'ID do papel' })
  async removePaperFromProduct(
    @Request() req,
    @Param('id') productId: string,
    @Param('paperId') paperId: string,
  ) {
    return this.productsService.removePaperFromProduct(productId, paperId, req.user?.tenantId || req.tenantId);
  }

  @Post(':id/cover-types')
  @ApiOperation({ summary: 'Adicionar tipo de capa ao produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  async addCoverTypeToProduct(
    @Request() req,
    @Param('id') productId: string,
    @Body() data: { coverTypeId: string; priceAdjustment?: number; isDefault?: boolean },
  ) {
    return this.productsService.addCoverTypeToProduct(
      productId, 
      data.coverTypeId, 
      req.user?.tenantId || req.tenantId,
      data.priceAdjustment || 0,
      data.isDefault || false
    );
  }

  @Delete(':id/cover-types/:coverTypeId')
  @ApiOperation({ summary: 'Remover tipo de capa do produto' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiParam({ name: 'coverTypeId', description: 'ID do tipo de capa' })
  async removeCoverTypeFromProduct(
    @Request() req,
    @Param('id') productId: string,
    @Param('coverTypeId') coverTypeId: string,
  ) {
    return this.productsService.removeCoverTypeFromProduct(productId, coverTypeId, req.user?.tenantId || req.tenantId);
  }
}
