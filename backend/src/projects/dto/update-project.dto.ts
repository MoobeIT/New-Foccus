import { IsString, IsOptional, IsUUID, IsObject, IsInt, Min, Max, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '../entities/project.entity';

export class UpdateProjectDto {
  @ApiProperty({ description: 'Nome do projeto', example: 'Meu Fotolivro de Viagem', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Status do projeto', enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ description: 'ID do produto', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'ID do formato', required: false })
  @IsOptional()
  @IsUUID()
  formatId?: string;

  @ApiProperty({ description: 'ID do papel', required: false })
  @IsOptional()
  @IsUUID()
  paperId?: string;

  @ApiProperty({ description: 'ID do tipo de capa', required: false })
  @IsOptional()
  @IsUUID()
  coverTypeId?: string;

  @ApiProperty({ description: 'Número de páginas', example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pageCount?: number;

  @ApiProperty({ 
    description: 'Configurações do projeto',
    example: { colorProfile: 'sRGB' },
    required: false 
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
