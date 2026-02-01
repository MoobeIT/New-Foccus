import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Nome do tenant', example: 'Minha Loja' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Slug único do tenant', example: 'minha-loja' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  slug: string;

  @ApiProperty({ 
    description: 'Configurações de tema', 
    example: { primaryColor: '#3B82F6', logo: '/logo.png' },
    required: false 
  })
  @IsOptional()
  @IsObject()
  themeConfig?: Record<string, any>;

  @ApiProperty({ 
    description: 'Configurações gerais', 
    example: { allowRegistration: true, maxProjectsPerUser: 50 },
    required: false 
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Se o tenant está ativo', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}