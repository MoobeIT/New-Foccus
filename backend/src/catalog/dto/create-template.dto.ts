import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Nome do template', example: 'Template Clássico' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ 
    description: 'Tipo de produto do template', 
    example: 'photobook',
    required: false 
  })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiProperty({ 
    description: 'Tipo de template', 
    example: 'page',
    required: false 
  })
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiProperty({ 
    description: 'Categoria do template', 
    example: 'elegant',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    description: 'Descrição do template', 
    example: 'Layout clássico com uma foto por página',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'URL da imagem de preview', 
    required: false 
  })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiProperty({ 
    description: 'URL da thumbnail', 
    required: false 
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ 
    description: 'Dimensões do template',
    required: false 
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, any>;

  @ApiProperty({ 
    description: 'Margens do template',
    required: false 
  })
  @IsOptional()
  @IsObject()
  margins?: Record<string, any>;

  @ApiProperty({ 
    description: 'Área segura do template',
    required: false 
  })
  @IsOptional()
  @IsObject()
  safeArea?: Record<string, any>;

  @ApiProperty({ 
    description: 'Elementos do template',
    required: false 
  })
  @IsOptional()
  @IsArray()
  elements?: any[];

  @ApiProperty({ 
    description: 'Paleta de cores',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiProperty({ 
    description: 'Fontes utilizadas',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fonts?: string[];

  @ApiProperty({ 
    description: 'Tags do template', 
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Se é template do sistema', required: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiProperty({ description: 'Se o template está ativo', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
