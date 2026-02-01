import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';

// DTOs para resposta pública
class PublicProductDto {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  basePagesIncluded: number;
  pricePerExtraPage: number;
  pricePerExtraSpread: number;
  minPages: number;
  maxPages: number;
  pageIncrement: number;
  badge?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  galleryImages: string[];
  features: string[];
  specs: { icon: string; label: string; value: string }[];
  hasCase: boolean;
  casePrice: number;
  caseDescription?: string;
  formats: PublicFormatDto[];
  papers: PublicPaperDto[];
  coverTypes: PublicCoverTypeDto[];
}

class PublicFormatDto {
  id: string;
  name: string;
  width: number;
  height: number;
  orientation: string;
  minPages: number;
  maxPages: number;
  pageIncrement: number;
  basePrice: number;
  pricePerExtraPage: number;
  priceMultiplier: number;
}

class PublicPaperDto {
  id: string;
  name: string;
  type: string;
  finish: string;
  weight: number;
  description?: string;
  pricePerPage: number;
  priceAdjustment: number;
  isDefault: boolean;
}

class PublicCoverTypeDto {
  id: string;
  name: string;
  type: string;
  material?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  priceAdjustment: number;
  isDefault: boolean;
}

@ApiTags('public-catalog')
@Controller('public/catalog')
@Public()
export class PublicCatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products')
  @ApiOperation({ summary: 'Listar produtos públicos (publicados)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoria' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  async listProducts(
    @Query('type') type?: string,
    @Query('category') category?: string,
  ): Promise<PublicProductDto[]> {
    const where: any = { isActive: true, isPublished: true };
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        formats: {
          where: { isActive: true },
          orderBy: { width: 'asc' },
        },
        productPapers: {
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' },
        },
        productCoverTypes: {
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return products.map(product => this.mapProductToPublic(product));
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Buscar produto por slug ou ID' })
  @ApiParam({ name: 'slug', description: 'Slug ou ID do produto (ex: album-casamento ou photobook-default)' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProductBySlug(
    @Param('slug') slug: string,
  ): Promise<PublicProductDto> {
    // Buscar produto pelo slug OU pelo ID
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { slug, isActive: true, isPublished: true },
          { id: slug, isActive: true, isPublished: true },
        ],
      },
      include: {
        formats: {
          where: { isActive: true },
          orderBy: { width: 'asc' },
        },
        productPapers: {
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' },
        },
        productCoverTypes: {
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.mapProductToPublic(product);
  }

  @Get('products/id/:id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProductById(
    @Param('id') id: string,
  ): Promise<PublicProductDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        isPublished: true,
      },
      include: {
        formats: {
          where: { isActive: true },
          orderBy: { width: 'asc' },
        },
        productPapers: {
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' },
        },
        productCoverTypes: {
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.mapProductToPublic(product);
  }

  @Get('formats')
  @ApiOperation({ summary: 'Listar formatos disponíveis' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de formatos' })
  async listFormats(
    @Query('productId') productId?: string,
  ): Promise<PublicFormatDto[]> {
    const where: any = { isActive: true };
    if (productId) {
      where.productId = productId;
    }

    const formats = await this.prisma.format.findMany({
      where,
      orderBy: [{ width: 'asc' }, { height: 'asc' }],
    });

    return formats.map(format => ({
      id: format.id,
      name: format.name,
      width: format.width,
      height: format.height,
      orientation: format.orientation,
      minPages: format.minPages,
      maxPages: format.maxPages,
      pageIncrement: format.pageIncrement,
      basePrice: format.basePrice,
      pricePerExtraPage: format.pricePerExtraPage,
      priceMultiplier: format.priceMultiplier,
    }));
  }

  @Get('papers')
  @ApiOperation({ summary: 'Listar papéis disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de papéis' })
  async listPapers(): Promise<PublicPaperDto[]> {
    const papers = await this.prisma.paper.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return papers.map(paper => ({
      id: paper.id,
      name: paper.name,
      type: paper.type,
      finish: paper.finish,
      weight: paper.weight || 0,
      description: paper.description,
      pricePerPage: paper.pricePerPage || 0,
      priceAdjustment: 0,
      isDefault: false,
    }));
  }

  @Get('cover-types')
  @ApiOperation({ summary: 'Listar tipos de capa disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de capa' })
  async listCoverTypes(): Promise<PublicCoverTypeDto[]> {
    const coverTypes = await this.prisma.coverType.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return coverTypes.map(cover => ({
      id: cover.id,
      name: cover.name,
      type: cover.type,
      material: cover.material,
      description: cover.description,
      imageUrl: cover.imageUrl,
      price: cover.price,
      priceAdjustment: 0,
      isDefault: false,
    }));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias de produtos' })
  @ApiResponse({ status: 200, description: 'Lista de categorias' })
  async listCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const products = await this.prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, isPublished: true },
      _count: { id: true },
    });

    const categoryLabels: Record<string, string> = {
      casamento: '💒 Casamento',
      ensaio: '📸 Ensaio',
      newborn: '👶 Newborn',
      '15anos': '🎀 15 Anos',
      estojo: '🎁 Estojos',
      outros: '📦 Outros',
    };

    return products
      .filter(p => p.category)
      .map(p => ({
        id: p.category!,
        name: categoryLabels[p.category!] || p.category!,
        count: p._count.id,
      }));
  }

  private mapProductToPublic(product: any): PublicProductDto {
    const parseJson = (value: any, defaultValue: any) => {
      if (!value) return defaultValue;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return value;
    };

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      type: product.type,
      category: product.category,
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      basePrice: product.basePrice,
      basePagesIncluded: product.basePagesIncluded,
      pricePerExtraPage: product.pricePerExtraPage,
      pricePerExtraSpread: product.pricePerExtraSpread,
      minPages: product.minPages,
      maxPages: product.maxPages,
      pageIncrement: product.pageIncrement,
      badge: product.badge,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl,
      galleryImages: parseJson(product.galleryImages, []),
      features: parseJson(product.features, []),
      specs: parseJson(product.specs, []),
      hasCase: product.hasCase,
      casePrice: product.casePrice,
      caseDescription: product.caseDescription,
      formats: (product.formats || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        width: f.width,
        height: f.height,
        orientation: f.orientation,
        minPages: f.minPages,
        maxPages: f.maxPages,
        pageIncrement: f.pageIncrement,
        basePrice: f.basePrice,
        pricePerExtraPage: f.pricePerExtraPage,
        priceMultiplier: f.priceMultiplier,
      })),
      papers: (product.productPapers || []).map((pp: any) => ({
        id: pp.paper?.id || pp.paperId,
        name: pp.paper?.name || '',
        type: pp.paper?.type || '',
        finish: pp.paper?.finish || '',
        weight: pp.paper?.weight || 0,
        description: pp.paper?.description,
        pricePerPage: pp.paper?.pricePerPage || 0,
        priceAdjustment: pp.priceAdjustment,
        isDefault: pp.isDefault,
      })),
      coverTypes: (product.productCoverTypes || []).map((pct: any) => ({
        id: pct.coverType?.id || pct.coverTypeId,
        name: pct.coverType?.name || '',
        type: pct.coverType?.type || '',
        material: pct.coverType?.material,
        description: pct.coverType?.description,
        imageUrl: pct.coverType?.imageUrl,
        price: pct.coverType?.price || 0,
        priceAdjustment: pct.priceAdjustment,
        isDefault: pct.isDefault,
      })),
    };
  }
}
