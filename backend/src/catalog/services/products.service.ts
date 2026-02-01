import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductEntity } from '../entities/product.entity';

export interface ProductFilters {
  tenantId: string;
  type?: string;
  category?: string;
  active?: boolean;
  published?: boolean;
  search?: string;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(tenantId: string, createProductDto: CreateProductDto): Promise<ProductEntity> {
    const { 
      name, type, category, description, shortDescription,
      basePrice, basePagesIncluded, pricePerExtraPage, pricePerExtraSpread,
      minPages, maxPages, pageIncrement,
      features, specs, hasCase, casePrice, caseDescription,
      imageUrl, thumbnailUrl, galleryImages,
      badge, tags, seoTitle, seoDescription,
      sortOrder, active, isPublished,
      formatIds, papers, coverTypes
    } = createProductDto;

    // Gerar slug se não fornecido
    const slug = createProductDto.slug || this.generateSlug(name);

    // Verificar se slug já existe para este tenant
    const existingProduct = await this.prisma.product.findFirst({
      where: { tenantId, slug },
    });

    if (existingProduct) {
      throw new BadRequestException('Já existe um produto com este slug');
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          tenantId,
          name,
          slug,
          type: type || 'photobook',
          category,
          description,
          shortDescription,
          basePrice: basePrice || 0,
          basePagesIncluded: basePagesIncluded || 20,
          pricePerExtraPage: pricePerExtraPage || 0,
          pricePerExtraSpread: pricePerExtraSpread || 0,
          minPages: minPages || 20,
          maxPages: maxPages || 100,
          pageIncrement: pageIncrement || 2,
          features: JSON.stringify(features || []),
          specs: JSON.stringify(specs || []),
          hasCase: hasCase || false,
          casePrice: casePrice || 0,
          caseDescription,
          imageUrl,
          thumbnailUrl,
          galleryImages: JSON.stringify(galleryImages || []),
          badge,
          tags: JSON.stringify(tags || []),
          seoTitle,
          seoDescription,
          sortOrder: sortOrder || 0,
          isActive: active !== undefined ? active : true,
          isPublished: isPublished || false,
          publishedAt: isPublished ? new Date() : null,
        },
        include: {
          formats: true,
          productPapers: { include: { paper: true } },
          productCoverTypes: { include: { coverType: true } },
        },
      });

      // Associar formatos se fornecidos
      if (formatIds && formatIds.length > 0) {
        await this.prisma.format.updateMany({
          where: { id: { in: formatIds }, tenantId },
          data: { productId: product.id },
        });
      }

      // Associar papéis se fornecidos
      if (papers && papers.length > 0) {
        await this.prisma.productPaper.createMany({
          data: papers.map(p => ({
            productId: product.id,
            paperId: p.paperId,
            priceAdjustment: p.priceAdjustment || 0,
            isDefault: p.isDefault || false,
          })),
        });
      }

      // Associar tipos de capa se fornecidos
      if (coverTypes && coverTypes.length > 0) {
        await this.prisma.productCoverType.createMany({
          data: coverTypes.map(c => ({
            productId: product.id,
            coverTypeId: c.coverTypeId,
            priceAdjustment: c.priceAdjustment || 0,
            isDefault: c.isDefault || false,
          })),
        });
      }

      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'product_created', { 
        productId: product.id, 
        tenantId,
        type 
      }, 'ProductsService');

      // Recarregar com todas as relações
      return this.findOne(product.id, tenantId);
    } catch (error) {
      this.logger.error('Erro ao criar produto', error.stack, 'ProductsService');
      throw error;
    }
  }

  async findAll(filters: ProductFilters): Promise<ProductEntity[]> {
    const { tenantId, type, category, active, published, search } = filters;
    
    const cacheKey = `products:${tenantId}:${type || 'all'}:${category || 'all'}:${active ?? 'all'}:${published ?? 'all'}:${search || 'all'}`;
    const cached = await this.cacheManager.get<ProductEntity[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const where: any = { tenantId };
    
    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }
    
    if (active !== undefined) {
      where.isActive = active;
    }

    if (published !== undefined) {
      where.isPublished = published;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        formats: { where: { isActive: true }, orderBy: { width: 'asc' } },
        productPapers: { 
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' }
        },
        productCoverTypes: { 
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' }
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const result = products.map(product => new ProductEntity(product));

    await this.cacheManager.set(cacheKey, result, 600);

    return result;
  }

  async findOne(id: string, tenantId: string): Promise<ProductEntity> {
    // IDs de produtos podem ser strings customizadas (ex: album-casamento)
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    const cacheKey = `product:${id}:${tenantId}`;
    const cached = await this.cacheManager.get<ProductEntity>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        formats: { where: { isActive: true }, orderBy: { width: 'asc' } },
        productPapers: { 
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' }
        },
        productCoverTypes: { 
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const result = new ProductEntity(product);

    await this.cacheManager.set(cacheKey, result, 600);

    return result;
  }

  async findBySlug(slug: string, tenantId?: string): Promise<ProductEntity> {
    const where: any = { slug, isActive: true, isPublished: true };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const product = await this.prisma.product.findFirst({
      where,
      include: {
        formats: { where: { isActive: true }, orderBy: { width: 'asc' } },
        productPapers: { 
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' }
        },
        productCoverTypes: { 
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return new ProductEntity(product);
  }

  async findById(id: string): Promise<ProductEntity> {
    // IDs de produtos podem ser strings customizadas
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        formats: { where: { isActive: true }, orderBy: { width: 'asc' } },
        productPapers: { 
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' }
        },
        productCoverTypes: { 
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return new ProductEntity(product);
  }

  async update(id: string, tenantId: string, updateProductDto: UpdateProductDto): Promise<ProductEntity> {
    // IDs de produtos podem ser strings customizadas
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    await this.findOne(id, tenantId);

    const { formatIds, papers, coverTypes, ...productData } = updateProductDto;

    try {
      // Preparar dados para atualização
      const updateData: any = {};

      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.slug !== undefined) updateData.slug = productData.slug;
      if (productData.type !== undefined) updateData.type = productData.type;
      if (productData.category !== undefined) updateData.category = productData.category;
      if (productData.description !== undefined) updateData.description = productData.description;
      if (productData.shortDescription !== undefined) updateData.shortDescription = productData.shortDescription;
      if (productData.basePrice !== undefined) updateData.basePrice = productData.basePrice;
      if (productData.basePagesIncluded !== undefined) updateData.basePagesIncluded = productData.basePagesIncluded;
      if (productData.pricePerExtraPage !== undefined) updateData.pricePerExtraPage = productData.pricePerExtraPage;
      if (productData.pricePerExtraSpread !== undefined) updateData.pricePerExtraSpread = productData.pricePerExtraSpread;
      if (productData.minPages !== undefined) updateData.minPages = productData.minPages;
      if (productData.maxPages !== undefined) updateData.maxPages = productData.maxPages;
      if (productData.pageIncrement !== undefined) updateData.pageIncrement = productData.pageIncrement;
      if (productData.features !== undefined) updateData.features = JSON.stringify(productData.features);
      if (productData.specs !== undefined) updateData.specs = JSON.stringify(productData.specs);
      if (productData.hasCase !== undefined) updateData.hasCase = productData.hasCase;
      if (productData.casePrice !== undefined) updateData.casePrice = productData.casePrice;
      if (productData.caseDescription !== undefined) updateData.caseDescription = productData.caseDescription;
      if (productData.imageUrl !== undefined) updateData.imageUrl = productData.imageUrl;
      if (productData.thumbnailUrl !== undefined) updateData.thumbnailUrl = productData.thumbnailUrl;
      if (productData.galleryImages !== undefined) updateData.galleryImages = JSON.stringify(productData.galleryImages);
      if (productData.badge !== undefined) updateData.badge = productData.badge;
      if (productData.tags !== undefined) updateData.tags = JSON.stringify(productData.tags);
      if (productData.seoTitle !== undefined) updateData.seoTitle = productData.seoTitle;
      if (productData.seoDescription !== undefined) updateData.seoDescription = productData.seoDescription;
      if (productData.sortOrder !== undefined) updateData.sortOrder = productData.sortOrder;
      if (productData.active !== undefined) updateData.isActive = productData.active;
      
      // Gerenciar publicação
      if (productData.isPublished !== undefined) {
        updateData.isPublished = productData.isPublished;
        if (productData.isPublished) {
          updateData.publishedAt = new Date();
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
      });

      // Atualizar formatos se fornecidos
      if (formatIds !== undefined) {
        // Remover associações antigas
        await this.prisma.format.updateMany({
          where: { productId: id },
          data: { productId: null },
        });
        // Criar novas associações
        if (formatIds.length > 0) {
          await this.prisma.format.updateMany({
            where: { id: { in: formatIds }, tenantId },
            data: { productId: id },
          });
        }
      }

      // Atualizar papéis se fornecidos
      if (papers !== undefined) {
        await this.prisma.productPaper.deleteMany({ where: { productId: id } });
        if (papers.length > 0) {
          await this.prisma.productPaper.createMany({
            data: papers.map(p => ({
              productId: id,
              paperId: p.paperId,
              priceAdjustment: p.priceAdjustment || 0,
              isDefault: p.isDefault || false,
            })),
          });
        }
      }

      // Atualizar tipos de capa se fornecidos
      if (coverTypes !== undefined) {
        await this.prisma.productCoverType.deleteMany({ where: { productId: id } });
        if (coverTypes.length > 0) {
          await this.prisma.productCoverType.createMany({
            data: coverTypes.map(c => ({
              productId: id,
              coverTypeId: c.coverTypeId,
              priceAdjustment: c.priceAdjustment || 0,
              isDefault: c.isDefault || false,
            })),
          });
        }
      }

      await this.clearProductCache(id, tenantId);
      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'product_updated', { 
        productId: id, 
        tenantId 
      }, 'ProductsService');

      return this.findOne(id, tenantId);
    } catch (error) {
      this.logger.error('Erro ao atualizar produto', error.stack, 'ProductsService');
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // IDs de produtos podem ser strings customizadas
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    await this.findOne(id, tenantId);

    try {
      // Remover relações primeiro
      await this.prisma.productPaper.deleteMany({ where: { productId: id } });
      await this.prisma.productCoverType.deleteMany({ where: { productId: id } });

      await this.prisma.product.delete({
        where: { id },
      });

      await this.clearProductCache(id, tenantId);
      await this.clearCatalogCache(tenantId);

      this.logger.logUserAction('system', 'product_deleted', { 
        productId: id, 
        tenantId 
      }, 'ProductsService');
    } catch (error) {
      this.logger.error('Erro ao deletar produto', error.stack, 'ProductsService');
      throw error;
    }
  }

  async activate(id: string, tenantId: string): Promise<ProductEntity> {
    return this.update(id, tenantId, { active: true });
  }

  async deactivate(id: string, tenantId: string): Promise<ProductEntity> {
    return this.update(id, tenantId, { active: false });
  }

  async publish(id: string, tenantId: string): Promise<ProductEntity> {
    return this.update(id, tenantId, { isPublished: true });
  }

  async unpublish(id: string, tenantId: string): Promise<ProductEntity> {
    return this.update(id, tenantId, { isPublished: false });
  }

  async findByType(tenantId: string, type: string): Promise<ProductEntity[]> {
    return this.findAll({ tenantId, type, active: true });
  }

  async findActive(tenantId: string): Promise<ProductEntity[]> {
    return this.findAll({ tenantId, active: true });
  }

  async findPublished(tenantId?: string): Promise<ProductEntity[]> {
    const where: any = { isActive: true, isPublished: true };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        formats: { where: { isActive: true }, orderBy: { width: 'asc' } },
        productPapers: { 
          where: { isActive: true },
          include: { paper: true },
          orderBy: { isDefault: 'desc' }
        },
        productCoverTypes: { 
          where: { isActive: true },
          include: { coverType: true },
          orderBy: { isDefault: 'desc' }
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return products.map(product => new ProductEntity(product));
  }

  async duplicate(id: string, tenantId: string): Promise<ProductEntity> {
    const original = await this.findOne(id, tenantId);
    
    const newName = `${original.name} (Cópia)`;
    const newSlug = this.generateSlug(newName) + '-' + Date.now();

    const createDto: CreateProductDto = {
      name: newName,
      slug: newSlug,
      type: original.type as any,
      category: original.category as any,
      description: original.description,
      shortDescription: original.shortDescription,
      basePrice: original.basePrice,
      basePagesIncluded: original.basePagesIncluded,
      pricePerExtraPage: original.pricePerExtraPage,
      pricePerExtraSpread: original.pricePerExtraSpread,
      minPages: original.minPages,
      maxPages: original.maxPages,
      pageIncrement: original.pageIncrement,
      features: original.features,
      specs: original.specs,
      hasCase: original.hasCase,
      casePrice: original.casePrice,
      caseDescription: original.caseDescription,
      imageUrl: original.imageUrl,
      thumbnailUrl: original.thumbnailUrl,
      galleryImages: original.galleryImages,
      badge: original.badge,
      tags: original.tags,
      seoTitle: original.seoTitle,
      seoDescription: original.seoDescription,
      sortOrder: original.sortOrder,
      active: false, // Começa inativo
      isPublished: false, // Começa não publicado
    };

    return this.create(tenantId, createDto);
  }

  private async clearProductCache(productId: string, tenantId: string): Promise<void> {
    await this.cacheManager.del(`product:${productId}:${tenantId}`);
  }

  private async clearCatalogCache(tenantId: string): Promise<void> {
    const keys = await this.cacheManager.store.keys?.(`products:${tenantId}:*`);
    if (keys) {
      await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }
  }

  async getStats(tenantId: string) {
    try {
      const [total, active, inactive, published, unpublished, byType] = await Promise.all([
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId, isActive: true } }),
        this.prisma.product.count({ where: { tenantId, isActive: false } }),
        this.prisma.product.count({ where: { tenantId, isPublished: true } }),
        this.prisma.product.count({ where: { tenantId, isPublished: false } }),
        this.prisma.product.groupBy({
          by: ['type'],
          where: { tenantId },
          _count: { id: true },
        }),
      ]);

      return {
        total,
        active,
        inactive,
        published,
        unpublished,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {}),
        message: 'Estatísticas dos produtos obtidas com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas dos produtos', error.stack, 'ProductsService');
      throw error;
    }
  }

  async findProductsWithoutFormats(tenantId: string) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          tenantId,
          formats: {
            none: {}
          }
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      return products;
    } catch (error) {
      this.logger.error('Erro ao buscar produtos sem formatos', error.stack, 'ProductsService');
      throw error;
    }
  }

  async findProductsWithoutPapers(tenantId: string) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          tenantId,
          productPapers: {
            none: {}
          }
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      return products;
    } catch (error) {
      this.logger.error('Erro ao buscar produtos sem papéis', error.stack, 'ProductsService');
      throw error;
    }
  }

  async findProductsWithoutCoverTypes(tenantId: string) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          tenantId,
          productCoverTypes: {
            none: {}
          }
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      return products;
    } catch (error) {
      this.logger.error('Erro ao buscar produtos sem tipos de capa', error.stack, 'ProductsService');
      throw error;
    }
  }

  async addFormatToProduct(productId: string, formatId: string, tenantId: string): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Verificar se o formato existe
    const format = await this.prisma.format.findFirst({
      where: { id: formatId, tenantId }
    });
    
    if (!format) {
      throw new NotFoundException('Formato não encontrado');
    }

    // Atualizar o formato para vincular ao produto
    return this.prisma.format.update({
      where: { id: formatId },
      data: { productId }
    });
  }

  async removeFormatFromProduct(productId: string, formatId: string, tenantId: string): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Remover a vinculação (definir productId como null ou excluir)
    return this.prisma.format.updateMany({
      where: { id: formatId, productId, tenantId },
      data: { productId: null }
    });
  }

  async addPaperToProduct(
    productId: string, 
    paperId: string, 
    tenantId: string,
    priceAdjustment: number = 0,
    isDefault: boolean = false
  ): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Verificar se o papel existe
    const paper = await this.prisma.paper.findFirst({
      where: { id: paperId, tenantId }
    });
    
    if (!paper) {
      throw new NotFoundException('Papel não encontrado');
    }

    // Se este papel for marcado como padrão, desmarcar outros
    if (isDefault) {
      await this.prisma.productPaper.updateMany({
        where: { productId },
        data: { isDefault: false }
      });
    }

    // Criar a vinculação
    return this.prisma.productPaper.create({
      data: {
        productId,
        paperId,
        priceAdjustment,
        isDefault
      }
    });
  }

  async removePaperFromProduct(productId: string, paperId: string, tenantId: string): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Remover a vinculação
    return this.prisma.productPaper.deleteMany({
      where: { productId, paperId }
    });
  }

  async addCoverTypeToProduct(
    productId: string, 
    coverTypeId: string, 
    tenantId: string,
    priceAdjustment: number = 0,
    isDefault: boolean = false
  ): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Verificar se o tipo de capa existe
    const coverType = await this.prisma.coverType.findFirst({
      where: { id: coverTypeId, tenantId }
    });
    
    if (!coverType) {
      throw new NotFoundException('Tipo de capa não encontrado');
    }

    // Se este tipo de capa for marcado como padrão, desmarcar outros
    if (isDefault) {
      await this.prisma.productCoverType.updateMany({
        where: { productId },
        data: { isDefault: false }
      });
    }

    // Criar a vinculação
    return this.prisma.productCoverType.create({
      data: {
        productId,
        coverTypeId,
        priceAdjustment,
        isDefault
      }
    });
  }

  async removeCoverTypeFromProduct(productId: string, coverTypeId: string, tenantId: string): Promise<any> {
    // Verificar se o produto existe
    await this.findOne(productId, tenantId);
    
    // Remover a vinculação
    return this.prisma.productCoverType.deleteMany({
      where: { productId, coverTypeId }
    });
  }
}
