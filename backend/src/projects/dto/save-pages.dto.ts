import { IsString, IsArray, IsOptional, IsInt, Min, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PageElementDto {
  @ApiProperty({ description: 'ID do elemento' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Tipo do elemento', enum: ['image', 'text', 'sticker'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Posição X' })
  x: number;

  @ApiProperty({ description: 'Posição Y' })
  y: number;

  @ApiProperty({ description: 'Largura' })
  width: number;

  @ApiProperty({ description: 'Altura' })
  height: number;

  @ApiProperty({ description: 'URL da imagem (para type=image)', required: false })
  @IsOptional()
  @IsString()
  src?: string;

  @ApiProperty({ description: 'ID do asset (para type=image)', required: false })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiProperty({ description: 'Conteúdo (para type=text ou sticker)', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'Rotação em graus', required: false })
  @IsOptional()
  rotation?: number;

  @ApiProperty({ description: 'Opacidade (0-1)', required: false })
  @IsOptional()
  opacity?: number;

  @ApiProperty({ description: 'Elemento bloqueado', required: false })
  @IsOptional()
  locked?: boolean;

  @ApiProperty({ description: 'Filtro CSS', required: false })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiProperty({ description: 'Largura da borda', required: false })
  @IsOptional()
  borderWidth?: number;

  @ApiProperty({ description: 'Cor da borda', required: false })
  @IsOptional()
  @IsString()
  borderColor?: string;

  @ApiProperty({ description: 'Raio da borda', required: false })
  @IsOptional()
  borderRadius?: number;

  @ApiProperty({ description: 'Sombra', required: false })
  @IsOptional()
  shadow?: boolean;

  // Propriedades de texto
  @ApiProperty({ required: false })
  @IsOptional()
  fontSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fontWeight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fontStyle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  textAlign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  // Propriedades de crop
  @ApiProperty({ required: false })
  @IsOptional()
  cropX?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  cropY?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  cropScale?: number;
}

export class PageDto {
  @ApiProperty({ description: 'ID da página' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Tipo da página', enum: ['cover-front', 'cover-back', 'page'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Elementos da página', type: [PageElementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageElementDto)
  elements: PageElementDto[];

  @ApiProperty({ description: 'Cor/gradiente de fundo', required: false })
  @IsOptional()
  @IsString()
  background?: string;
}

export class SavePagesDto {
  @ApiProperty({ description: 'Nome do projeto' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Páginas do projeto', type: [PageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  pages: PageDto[];

  @ApiProperty({ description: 'Versão atual para controle de concorrência', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;

  @ApiProperty({ description: 'Configurações adicionais', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class ValidateImageDto {
  @ApiProperty({ description: 'Largura da imagem em pixels' })
  @IsInt()
  @Min(1)
  imageWidth: number;

  @ApiProperty({ description: 'Altura da imagem em pixels' })
  @IsInt()
  @Min(1)
  imageHeight: number;

  @ApiProperty({ description: 'Largura do elemento em mm' })
  elementWidth: number;

  @ApiProperty({ description: 'Altura do elemento em mm' })
  elementHeight: number;
}

export class CalculateSpineDto {
  @ApiProperty({ description: 'Número de páginas' })
  @IsInt()
  @Min(1)
  pageCount: number;

  @ApiProperty({ description: 'ID do papel', required: false })
  @IsOptional()
  @IsString()
  paperId?: string;

  @ApiProperty({ description: 'ID do tipo de capa', required: false })
  @IsOptional()
  @IsString()
  coverTypeId?: string;

  @ApiProperty({ description: 'Espessura do papel em mm (se paperId não fornecido)', required: false })
  @IsOptional()
  paperThickness?: number;

  @ApiProperty({ description: 'Tolerância de encadernação em mm (se coverTypeId não fornecido)', required: false })
  @IsOptional()
  bindingTolerance?: number;
}
