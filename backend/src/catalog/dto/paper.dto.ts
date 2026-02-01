import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaperType {
  PHOTO = 'photo',
  COATED = 'coated',
  MATTE = 'matte',
  RECYCLED = 'recycled',
}

export enum PaperFinish {
  GLOSSY = 'glossy',
  MATTE = 'matte',
  SATIN = 'satin',
}

export enum PaperLamination {
  NONE = 'none',
  MATTE = 'matte',
  GLOSSY = 'glossy',
  SOFT_TOUCH = 'soft_touch',
}

export class CreatePaperDto {
  @ApiProperty({ description: 'Nome do papel', example: 'Papel Fotográfico Premium' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'Tipo do papel', enum: PaperType })
  @IsEnum(PaperType)
  type: PaperType;

  @ApiProperty({ description: 'Gramatura em g/m²', example: 230, minimum: 50, maximum: 1000 })
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Type(() => Number)
  weight: number;

  @ApiProperty({ description: 'Espessura em mm', example: 0.25, minimum: 0.01, maximum: 5.0 })
  @IsNumber()
  @Min(0.01)
  @Max(5.0)
  @Type(() => Number)
  thickness: number;

  @ApiProperty({ description: 'Acabamento do papel', enum: PaperFinish })
  @IsEnum(PaperFinish)
  finish: PaperFinish;

  @ApiPropertyOptional({ description: 'Laminação', enum: PaperLamination, default: PaperLamination.NONE })
  @IsOptional()
  @IsEnum(PaperLamination)
  lamination?: PaperLamination;

  @ApiProperty({ description: 'Preço por página em R$', example: 0.80, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerPage: number;

  @ApiPropertyOptional({ description: 'Descrição do papel' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Se o papel está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaperDto {
  @ApiPropertyOptional({ description: 'Nome do papel' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo do papel', enum: PaperType })
  @IsOptional()
  @IsEnum(PaperType)
  type?: PaperType;

  @ApiPropertyOptional({ description: 'Gramatura em g/m²', minimum: 50, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ description: 'Espessura em mm', minimum: 0.01, maximum: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(5.0)
  @Type(() => Number)
  thickness?: number;

  @ApiPropertyOptional({ description: 'Acabamento do papel', enum: PaperFinish })
  @IsOptional()
  @IsEnum(PaperFinish)
  finish?: PaperFinish;

  @ApiPropertyOptional({ description: 'Laminação', enum: PaperLamination })
  @IsOptional()
  @IsEnum(PaperLamination)
  lamination?: PaperLamination;

  @ApiPropertyOptional({ description: 'Preço por página em R$', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerPage?: number;

  @ApiPropertyOptional({ description: 'Descrição do papel' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Se o papel está ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PaperResponseDto {
  @ApiProperty({ description: 'ID do papel' })
  id: string;

  @ApiProperty({ description: 'Nome do papel' })
  name: string;

  @ApiProperty({ description: 'Tipo do papel', enum: PaperType })
  type: PaperType;

  @ApiProperty({ description: 'Gramatura em g/m²' })
  weight: number;

  @ApiProperty({ description: 'Espessura em mm' })
  thickness: number;

  @ApiProperty({ description: 'Acabamento do papel', enum: PaperFinish })
  finish: PaperFinish;

  @ApiProperty({ description: 'Laminação', enum: PaperLamination })
  lamination: PaperLamination;

  @ApiProperty({ description: 'Preço por página em R$' })
  pricePerPage: number;

  @ApiPropertyOptional({ description: 'Descrição do papel' })
  description?: string;

  @ApiProperty({ description: 'Se o papel está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(paper: any) {
    this.id = paper.id;
    this.name = paper.name;
    this.type = paper.type;
    this.weight = paper.weight;
    this.thickness = paper.thickness;
    this.finish = paper.finish;
    this.lamination = paper.lamination;
    this.pricePerPage = paper.pricePerPage;
    this.description = paper.description;
    this.isActive = paper.isActive;
    this.createdAt = paper.createdAt;
    this.updatedAt = paper.updatedAt;
  }
}
