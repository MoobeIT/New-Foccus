import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantEntity {
  @ApiProperty({ description: 'ID único da variante' })
  id: string;

  @ApiProperty({ description: 'ID do produto pai' })
  productId: string;

  @ApiProperty({ description: 'Nome da variante' })
  name: string;

  @ApiProperty({ description: 'SKU da variante' })
  sku: string;

  @ApiProperty({ description: 'Dimensões em milímetros' })
  sizeMm: Record<string, any>;

  @ApiProperty({ description: 'Tipo de papel' })
  paper: string;

  @ApiProperty({ description: 'Acabamento' })
  finish: string;

  @ApiProperty({ description: 'Número mínimo de páginas' })
  minPages: number;

  @ApiProperty({ description: 'Número máximo de páginas' })
  maxPages: number;

  @ApiProperty({ description: 'Preço base' })
  basePrice: number;

  @ApiProperty({ description: 'Regras de precificação' })
  priceRules: Record<string, any>;

  @ApiProperty({ description: 'Se a variante está ativa' })
  active: boolean;

  @ApiProperty({ description: 'Ordem de exibição' })
  sortOrder: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(partial: Partial<ProductVariantEntity>) {
    Object.assign(this, partial);
  }
}