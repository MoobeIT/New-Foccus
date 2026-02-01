import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProductType {
  PHOTOBOOK = 'photobook',
  CALENDAR = 'calendar',
  CARD = 'card',
  POSTER = 'poster',
  CASE = 'case',
}

export enum ProductCategory {
  CASAMENTO = 'casamento',
  ENSAIO = 'ensaio',
  NEWBORN = 'newborn',
  QUINZE_ANOS = '15anos',
  ESTOJO = 'estojo',
  OUTROS = 'outros',
}

export class ProductSpecDto {
  @ApiProperty({ description: 'Ícone da especificação', example: '📐' })
  @IsString()
  icon: string;

  @ApiProperty({ description: 'Label da especificação', example: 'Tamanhos' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Valor da especificação', example: '20x20, 25x25, 30x30 cm' })
  @IsString()
  value: string;
}

export class ProductPaperDto {
  @ApiProperty({ description: 'ID do papel' })
  @IsString()
  paperId: string;

  @ApiProperty({ description: 'Ajuste de preço para este papel', default: 0 })
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @ApiProperty({ description: 'Se é o papel padrão', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ProductCoverTypeDto {
  @ApiProperty({ description: 'ID do tipo de capa' })
  @IsString()
  coverTypeId: string;

  @ApiProperty({ description: 'Ajuste de preço para esta capa', default: 0 })
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @ApiProperty({ description: 'Se é a capa padrão', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Nome do produto', example: 'Álbum Casamento Premium' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Slug do produto (URL amigável)', example: 'album-casamento-premium', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ 
    description: 'Tipo do produto', 
    enum: ProductType,
    example: ProductType.PHOTOBOOK 
  })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiProperty({ 
    description: 'Categoria do produto', 
    enum: ProductCategory,
    example: ProductCategory.CASAMENTO,
    required: false 
  })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiProperty({ 
    description: 'Descrição completa do produto', 
    example: 'O álbum perfeito para eternizar o dia mais especial.',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Descrição curta do produto', 
    example: 'Capa dura, papel 230g, acabamento premium',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shortDescription?: string;

  // Preços
  @ApiProperty({ description: 'Preço base do produto', example: 299.90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiProperty({ description: 'Páginas incluídas no preço base', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  basePagesIncluded?: number;

  @ApiProperty({ description: 'Preço por página adicional', example: 15.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerExtraPage?: number;

  @ApiProperty({ description: 'Preço por spread (2 páginas) adicional', example: 25.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerExtraSpread?: number;

  // Configurações de páginas
  @ApiProperty({ description: 'Mínimo de páginas', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minPages?: number;

  @ApiProperty({ description: 'Máximo de páginas', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxPages?: number;

  @ApiProperty({ description: 'Incremento de páginas (2 = lâminas)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pageIncrement?: number;

  // Características
  @ApiProperty({ 
    description: 'Lista de características do produto', 
    example: ['Capa dura premium', 'Papel fotográfico 230g'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ 
    description: 'Especificações técnicas', 
    type: [ProductSpecDto],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  // Estojo
  @ApiProperty({ description: 'Tem opção de estojo', default: false })
  @IsOptional()
  @IsBoolean()
  hasCase?: boolean;

  @ApiProperty({ description: 'Preço do estojo', example: 89.90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  casePrice?: number;

  @ApiProperty({ description: 'Descrição do estojo', required: false })
  @IsOptional()
  @IsString()
  caseDescription?: string;

  // Imagens
  @ApiProperty({ description: 'URL da imagem principal', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'URL da thumbnail', required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'URLs das imagens da galeria', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[];

  // SEO e Marketing
  @ApiProperty({ description: 'Badge do produto', example: 'Mais Vendido', required: false })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ description: 'Tags do produto', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Título SEO', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  seoTitle?: string;

  @ApiProperty({ description: 'Descrição SEO', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  // Ordenação e visibilidade
  @ApiProperty({ description: 'Ordem de exibição', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ description: 'Se o produto está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Se o produto está publicado no site', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Relações
  @ApiProperty({ description: 'IDs dos formatos associados', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formatIds?: string[];

  @ApiProperty({ description: 'Papéis associados com preços', type: [ProductPaperDto], required: false })
  @IsOptional()
  @IsArray()
  @Type(() => ProductPaperDto)
  papers?: ProductPaperDto[];

  @ApiProperty({ description: 'Tipos de capa associados com preços', type: [ProductCoverTypeDto], required: false })
  @IsOptional()
  @IsArray()
  @Type(() => ProductCoverTypeDto)
  coverTypes?: ProductCoverTypeDto[];
}
