import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCoverTypeDto {
  @ApiProperty({ description: 'Nome do tipo de capa', example: 'Capa Dura Premium' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'Tipo da capa (soft, hard, premium)', example: 'hard' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Material da capa' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'Tolerância da lombada em mm', example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bindingTolerance?: number;

  @ApiProperty({ description: 'Preço base em R$', example: 15.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: 'Descrição do tipo de capa' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL da imagem' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Se o tipo de capa está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCoverTypeDto {
  @ApiPropertyOptional({ description: 'Nome do tipo de capa' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo da capa' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Material da capa' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'Tolerância da lombada em mm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bindingTolerance?: number;

  @ApiPropertyOptional({ description: 'Preço base em R$' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'Descrição do tipo de capa' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL da imagem' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Se o tipo de capa está ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CoverTypeResponseDto {
  @ApiProperty({ description: 'ID do tipo de capa' })
  id: string;

  @ApiProperty({ description: 'Nome do tipo de capa' })
  name: string;

  @ApiProperty({ description: 'Tipo da capa' })
  type: string;

  @ApiPropertyOptional({ description: 'Material da capa' })
  material?: string;

  @ApiProperty({ description: 'Tolerância da lombada em mm' })
  bindingTolerance: number;

  @ApiProperty({ description: 'Preço base em R$' })
  price: number;

  @ApiPropertyOptional({ description: 'Descrição do tipo de capa' })
  description?: string;

  @ApiPropertyOptional({ description: 'URL da imagem' })
  imageUrl?: string;

  @ApiProperty({ description: 'Se o tipo de capa está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(coverType: any) {
    this.id = coverType.id;
    this.name = coverType.name;
    this.type = coverType.type;
    this.material = coverType.material;
    this.bindingTolerance = coverType.bindingTolerance;
    this.price = coverType.price;
    this.description = coverType.description;
    this.imageUrl = coverType.imageUrl;
    this.isActive = coverType.isActive;
    this.createdAt = coverType.createdAt;
    this.updatedAt = coverType.updatedAt;
  }
}
