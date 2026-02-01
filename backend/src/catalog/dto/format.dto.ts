import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max, Length, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum FormatOrientation {
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

export class CreateFormatDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Nome do formato', example: 'Quadrado 20x20cm' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'Largura em mm', example: 200, minimum: 50, maximum: 1000 })
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Type(() => Number)
  width: number;

  @ApiProperty({ description: 'Altura em mm', example: 200, minimum: 50, maximum: 1000 })
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Type(() => Number)
  height: number;

  @ApiPropertyOptional({ description: 'Orientação', enum: FormatOrientation, default: FormatOrientation.SQUARE })
  @IsOptional()
  @IsEnum(FormatOrientation)
  orientation?: FormatOrientation;

  @ApiPropertyOptional({ description: 'Páginas mínimas', example: 20, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  minPages?: number;

  @ApiPropertyOptional({ description: 'Páginas máximas', example: 200, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  maxPages?: number;

  @ApiPropertyOptional({ description: 'Incremento de páginas', example: 2, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  pageIncrement?: number;

  @ApiPropertyOptional({ description: 'Sangria em mm', example: 3, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  bleed?: number;

  @ApiPropertyOptional({ description: 'Margem segura em mm', example: 5, minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  safeMargin?: number;

  @ApiPropertyOptional({ description: 'Margem da lombada em mm', example: 10, minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  @Type(() => Number)
  gutterMargin?: number;

  @ApiPropertyOptional({ description: 'Preço base do formato (inclui páginas base)', example: 299.90, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Preço por página extra', example: 15.00, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerExtraPage?: number;

  @ApiPropertyOptional({ description: 'Multiplicador de preço', example: 1.0, minimum: 0.1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  @Type(() => Number)
  priceMultiplier?: number;

  @ApiPropertyOptional({ description: 'Se o formato está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFormatDto {
  @ApiPropertyOptional({ description: 'Nome do formato' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Largura em mm', minimum: 50, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Transform(({ value }) => parseFloat(value))
  width?: number;

  @ApiPropertyOptional({ description: 'Altura em mm', minimum: 50, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Transform(({ value }) => parseFloat(value))
  height?: number;

  @ApiPropertyOptional({ description: 'Orientação', enum: FormatOrientation })
  @IsOptional()
  @IsEnum(FormatOrientation)
  orientation?: FormatOrientation;

  @ApiPropertyOptional({ description: 'Páginas mínimas', minimum: 4, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(1000)
  minPages?: number;

  @ApiPropertyOptional({ description: 'Páginas máximas', minimum: 4, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(1000)
  maxPages?: number;

  @ApiPropertyOptional({ description: 'Incremento de páginas', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  pageIncrement?: number;

  @ApiPropertyOptional({ description: 'Sangria em mm', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Transform(({ value }) => parseFloat(value))
  bleed?: number;

  @ApiPropertyOptional({ description: 'Margem segura em mm', minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  @Transform(({ value }) => parseFloat(value))
  safeMargin?: number;

  @ApiPropertyOptional({ description: 'Margem da lombada em mm', minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  @Transform(({ value }) => parseFloat(value))
  gutterMargin?: number;

  @ApiPropertyOptional({ description: 'Preço base do formato', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Preço por página extra', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  pricePerExtraPage?: number;

  @ApiPropertyOptional({ description: 'Multiplicador de preço', minimum: 0.1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  @Transform(({ value }) => parseFloat(value))
  priceMultiplier?: number;

  @ApiPropertyOptional({ description: 'Se o formato está ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FormatResponseDto {
  @ApiProperty({ description: 'ID do formato' })
  id: string;

  @ApiProperty({ description: 'ID do produto' })
  productId: string;

  @ApiProperty({ description: 'Nome do formato' })
  name: string;

  @ApiProperty({ description: 'Largura em mm' })
  width: number;

  @ApiProperty({ description: 'Altura em mm' })
  height: number;

  @ApiProperty({ description: 'Orientação', enum: FormatOrientation })
  orientation: FormatOrientation;

  @ApiProperty({ description: 'Páginas mínimas' })
  minPages: number;

  @ApiProperty({ description: 'Páginas máximas' })
  maxPages: number;

  @ApiProperty({ description: 'Incremento de páginas' })
  pageIncrement: number;

  @ApiProperty({ description: 'Sangria em mm' })
  bleed: number;

  @ApiProperty({ description: 'Margem segura em mm' })
  safeMargin: number;

  @ApiProperty({ description: 'Margem da lombada em mm' })
  gutterMargin: number;

  @ApiProperty({ description: 'Preço base do formato' })
  basePrice: number;

  @ApiProperty({ description: 'Preço por página extra' })
  pricePerExtraPage: number;

  @ApiProperty({ description: 'Multiplicador de preço' })
  priceMultiplier: number;

  @ApiProperty({ description: 'Se o formato está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Informações do produto' })
  product?: {
    id: string;
    name: string;
    type: string;
  };

  constructor(format: any) {
    this.id = format.id;
    this.productId = format.productId;
    this.name = format.name;
    this.width = format.width;
    this.height = format.height;
    this.orientation = format.orientation;
    this.minPages = format.minPages;
    this.maxPages = format.maxPages;
    this.pageIncrement = format.pageIncrement;
    this.bleed = format.bleed;
    this.safeMargin = format.safeMargin;
    this.gutterMargin = format.gutterMargin;
    this.basePrice = format.basePrice;
    this.pricePerExtraPage = format.pricePerExtraPage;
    this.priceMultiplier = format.priceMultiplier;
    this.isActive = format.isActive;
    this.createdAt = format.createdAt;
    this.updatedAt = format.updatedAt;

    if (format.product) {
      this.product = {
        id: format.product.id,
        name: format.product.name,
        type: format.product.type,
      };
    }
  }
}