import { ApiProperty } from '@nestjs/swagger';

export class ProductSpecEntity {
  @ApiProperty({ description: 'Ícone da especificação' })
  icon: string;

  @ApiProperty({ description: 'Label da especificação' })
  label: string;

  @ApiProperty({ description: 'Valor da especificação' })
  value: string;
}

export class ProductPaperEntity {
  @ApiProperty({ description: 'ID da relação' })
  id: string;

  @ApiProperty({ description: 'ID do papel' })
  paperId: string;

  @ApiProperty({ description: 'Nome do papel' })
  name: string;

  @ApiProperty({ description: 'Tipo do papel' })
  type: string;

  @ApiProperty({ description: 'Acabamento' })
  finish: string;

  @ApiProperty({ description: 'Ajuste de preço' })
  priceAdjustment: number;

  @ApiProperty({ description: 'Se é o padrão' })
  isDefault: boolean;
}

export class ProductCoverTypeEntity {
  @ApiProperty({ description: 'ID da relação' })
  id: string;

  @ApiProperty({ description: 'ID do tipo de capa' })
  coverTypeId: string;

  @ApiProperty({ description: 'Nome do tipo de capa' })
  name: string;

  @ApiProperty({ description: 'Tipo' })
  type: string;

  @ApiProperty({ description: 'Preço base da capa' })
  price: number;

  @ApiProperty({ description: 'Ajuste de preço' })
  priceAdjustment: number;

  @ApiProperty({ description: 'Se é o padrão' })
  isDefault: boolean;
}

export class ProductFormatEntity {
  @ApiProperty({ description: 'ID do formato' })
  id: string;

  @ApiProperty({ description: 'Nome do formato' })
  name: string;

  @ApiProperty({ description: 'Largura em mm' })
  width: number;

  @ApiProperty({ description: 'Altura em mm' })
  height: number;

  @ApiProperty({ description: 'Orientação' })
  orientation: string;

  @ApiProperty({ description: 'Mínimo de páginas' })
  minPages: number;

  @ApiProperty({ description: 'Máximo de páginas' })
  maxPages: number;

  @ApiProperty({ description: 'Incremento de páginas' })
  pageIncrement: number;

  @ApiProperty({ description: 'Multiplicador de preço' })
  priceMultiplier: number;
}

export class ProductEntity {
  @ApiProperty({ description: 'ID único do produto' })
  id: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'Nome do produto' })
  name: string;

  @ApiProperty({ description: 'Slug do produto' })
  slug: string;

  @ApiProperty({ description: 'Tipo do produto' })
  type: string;

  @ApiProperty({ description: 'Categoria do produto' })
  category: string;

  @ApiProperty({ description: 'Descrição completa' })
  description: string;

  @ApiProperty({ description: 'Descrição curta' })
  shortDescription: string;

  // Preços
  @ApiProperty({ description: 'Preço base' })
  basePrice: number;

  @ApiProperty({ description: 'Páginas incluídas no preço base' })
  basePagesIncluded: number;

  @ApiProperty({ description: 'Preço por página adicional' })
  pricePerExtraPage: number;

  @ApiProperty({ description: 'Preço por spread adicional' })
  pricePerExtraSpread: number;

  // Configurações de páginas
  @ApiProperty({ description: 'Mínimo de páginas' })
  minPages: number;

  @ApiProperty({ description: 'Máximo de páginas' })
  maxPages: number;

  @ApiProperty({ description: 'Incremento de páginas' })
  pageIncrement: number;

  // Características
  @ApiProperty({ description: 'Lista de características', type: [String] })
  features: string[];

  @ApiProperty({ description: 'Especificações técnicas', type: [ProductSpecEntity] })
  specs: ProductSpecEntity[];

  // Estojo
  @ApiProperty({ description: 'Tem opção de estojo' })
  hasCase: boolean;

  @ApiProperty({ description: 'Preço do estojo' })
  casePrice: number;

  @ApiProperty({ description: 'Descrição do estojo' })
  caseDescription: string;

  // Imagens
  @ApiProperty({ description: 'URL da imagem principal' })
  imageUrl: string;

  @ApiProperty({ description: 'URL da thumbnail' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'URLs das imagens da galeria', type: [String] })
  galleryImages: string[];

  // SEO e Marketing
  @ApiProperty({ description: 'Badge do produto' })
  badge: string;

  @ApiProperty({ description: 'Tags do produto', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Título SEO' })
  seoTitle: string;

  @ApiProperty({ description: 'Descrição SEO' })
  seoDescription: string;

  // Ordenação e visibilidade
  @ApiProperty({ description: 'Ordem de exibição' })
  sortOrder: number;

  @ApiProperty({ description: 'Se o produto está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Se o produto está publicado' })
  isPublished: boolean;

  @ApiProperty({ description: 'Data de publicação' })
  publishedAt: Date;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // Relações
  @ApiProperty({ description: 'Formatos disponíveis', type: [ProductFormatEntity] })
  formats: ProductFormatEntity[];

  @ApiProperty({ description: 'Papéis disponíveis', type: [ProductPaperEntity] })
  papers: ProductPaperEntity[];

  @ApiProperty({ description: 'Tipos de capa disponíveis', type: [ProductCoverTypeEntity] })
  coverTypes: ProductCoverTypeEntity[];

  constructor(partial: any) {
    this.id = partial.id;
    this.tenantId = partial.tenantId;
    this.name = partial.name;
    this.slug = partial.slug;
    this.type = partial.type;
    this.category = partial.category;
    this.description = partial.description;
    this.shortDescription = partial.shortDescription;
    this.basePrice = partial.basePrice;
    this.basePagesIncluded = partial.basePagesIncluded;
    this.pricePerExtraPage = partial.pricePerExtraPage;
    this.pricePerExtraSpread = partial.pricePerExtraSpread;
    this.minPages = partial.minPages;
    this.maxPages = partial.maxPages;
    this.pageIncrement = partial.pageIncrement;
    this.hasCase = partial.hasCase;
    this.casePrice = partial.casePrice;
    this.caseDescription = partial.caseDescription;
    this.imageUrl = partial.imageUrl;
    this.thumbnailUrl = partial.thumbnailUrl;
    this.badge = partial.badge;
    this.seoTitle = partial.seoTitle;
    this.seoDescription = partial.seoDescription;
    this.sortOrder = partial.sortOrder;
    this.isActive = partial.isActive;
    this.isPublished = partial.isPublished;
    this.publishedAt = partial.publishedAt;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    // Parse JSON fields
    this.features = this.parseJson(partial.features, []);
    this.specs = this.parseJson(partial.specs, []);
    this.galleryImages = this.parseJson(partial.galleryImages, []);
    this.tags = this.parseJson(partial.tags, []);

    // Map formats
    this.formats = (partial.formats || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      width: f.width,
      height: f.height,
      orientation: f.orientation,
      minPages: f.minPages,
      maxPages: f.maxPages,
      pageIncrement: f.pageIncrement,
      priceMultiplier: f.priceMultiplier,
    }));

    // Map papers from productPapers relation
    this.papers = (partial.productPapers || []).map((pp: any) => ({
      id: pp.id,
      paperId: pp.paperId,
      name: pp.paper?.name,
      type: pp.paper?.type,
      finish: pp.paper?.finish,
      priceAdjustment: pp.priceAdjustment,
      isDefault: pp.isDefault,
    }));

    // Map cover types from productCoverTypes relation
    this.coverTypes = (partial.productCoverTypes || []).map((pct: any) => ({
      id: pct.id,
      coverTypeId: pct.coverTypeId,
      name: pct.coverType?.name,
      type: pct.coverType?.type,
      price: pct.coverType?.price,
      priceAdjustment: pct.priceAdjustment,
      isDefault: pct.isDefault,
    }));
  }

  private parseJson(value: any, defaultValue: any): any {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value;
  }
}
