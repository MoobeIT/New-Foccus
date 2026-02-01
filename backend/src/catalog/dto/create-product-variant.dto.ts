import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean, IsInt, IsDecimal, IsUUID, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'ID do produto pai', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Nome da variante', example: 'Fotolivro 20x20cm' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'SKU da variante', example: 'FB-20X20-HD', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ 
    description: 'Dimensões em milímetros',
    example: { width: 200, height: 200 }
  })
  @IsObject()
  @IsNotEmpty()
  sizeMm: {
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Tipo de papel', example: 'Papel Fotográfico 180g', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paper?: string;

  @ApiProperty({ description: 'Acabamento', example: 'Capa Dura', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  finish?: string;

  @ApiProperty({ description: 'Número mínimo de páginas', example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  minPages?: number;

  @ApiProperty({ description: 'Número máximo de páginas', example: 200, required: false })
  @IsOptional()
  @IsInt()
  @Max(1000)
  maxPages?: number;

  @ApiProperty({ description: 'Preço base', example: 89.90 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  basePrice: number;

  @ApiProperty({ 
    description: 'Regras de precificação',
    example: {
      extraPagePrice: 2.50,
      bulkDiscounts: [
        { minQuantity: 5, discount: 0.1 },
        { minQuantity: 10, discount: 0.15 }
      ]
    },
    required: false 
  })
  @IsOptional()
  @IsObject()
  priceRules?: Record<string, any>;

  @ApiProperty({ description: 'Se a variante está ativa', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Ordem de exibição', example: 0, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}