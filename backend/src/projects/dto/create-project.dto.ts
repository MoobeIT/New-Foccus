import { IsString, IsNotEmpty, IsOptional, IsObject, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Nome do projeto', example: 'Meu Fotolivro de Viagem' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'ID do produto', example: 'photobook-default', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'ID do formato', example: 'format-30x30', required: false })
  @IsOptional()
  @IsString()
  formatId?: string;

  @ApiProperty({ description: 'ID do papel', example: 'paper-premium-300', required: false })
  @IsOptional()
  @IsString()
  paperId?: string;

  @ApiProperty({ description: 'ID do tipo de capa', example: 'cover-hard', required: false })
  @IsOptional()
  @IsString()
  coverTypeId?: string;

  @ApiProperty({ description: 'Número de páginas', example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pageCount?: number;

  @ApiProperty({ 
    description: 'Configurações do projeto',
    example: {
      colorProfile: 'sRGB',
      resolution: 300,
      units: 'mm'
    },
    required: false 
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
