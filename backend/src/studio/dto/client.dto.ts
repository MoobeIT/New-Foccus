import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ description: 'Nome completo do cliente' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email do cliente' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Endereço do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: 'Observações sobre o cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  totalSpent: number;

  @ApiProperty()
  projectsCount: number;

  @ApiPropertyOptional()
  lastProjectAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ClientStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  activeClients: number;

  @ApiProperty()
  newThisMonth: number;

  @ApiProperty()
  totalRevenue: number;
}
