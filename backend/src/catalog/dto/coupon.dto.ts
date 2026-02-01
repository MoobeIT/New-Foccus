import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max, Length, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateCouponDto {
  @ApiProperty({ description: 'Código do cupom', example: 'DESCONTO10' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  code: string;

  @ApiPropertyOptional({ description: 'Descrição interna' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tipo do desconto', enum: CouponType, default: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: 'Valor do desconto (10 = 10% ou R$ 10)', example: 10 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value: number;

  @ApiPropertyOptional({ description: 'Compra mínima para usar', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPurchase?: number;

  @ApiPropertyOptional({ description: 'Desconto máximo (para percentual)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Limite total de usos' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Limite de usos por usuário' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ description: 'Data início da validade' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Data fim da validade' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Se está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ description: 'Código do cupom' })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  code?: string;

  @ApiPropertyOptional({ description: 'Descrição interna' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tipo do desconto', enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({ description: 'Valor do desconto' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @ApiPropertyOptional({ description: 'Compra mínima' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPurchase?: number;

  @ApiPropertyOptional({ description: 'Desconto máximo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Limite total de usos' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Limite por usuário' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ description: 'Data início' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Data fim' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Se está ativo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ description: 'Código do cupom' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Valor do subtotal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Valor total do pedido' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderTotal?: number;
}

export class CouponResponseDto {
  id: string;
  code: string;
  description?: string;
  type: string;
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  usedCount: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Campos calculados
  isValid?: boolean;
  discountAmount?: number;
  message?: string;
}
