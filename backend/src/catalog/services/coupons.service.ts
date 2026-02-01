import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto, CouponResponseDto } from '../dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async findAll(tenantId: string) {
    const coupons = await this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      coupons,
      total: coupons.length,
    };
  }

  async findActive(tenantId: string) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return { coupons };
  }

  async findById(id: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
      include: {
        usages: {
          orderBy: { usedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Cupom não encontrado');
    }

    return coupon;
  }

  async findByCode(code: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { 
        code: code.toUpperCase().trim(),
        tenantId,
      },
    });

    return coupon;
  }

  async create(tenantId: string, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();

    // Verificar se já existe
    const existing = await this.prisma.coupon.findFirst({
      where: { code, tenantId },
    });

    if (existing) {
      throw new ConflictException('Já existe um cupom com este código');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minPurchase: dto.minPurchase || 0,
        maxDiscount: dto.maxDiscount,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive !== false,
      },
    });

    this.logger.logUserAction('system', 'coupon_created', {
      couponId: coupon.id,
      code: coupon.code,
      tenantId,
    }, 'CouponsService');

    return coupon;
  }

  async update(id: string, tenantId: string, dto: UpdateCouponDto) {
    const existing = await this.findById(id, tenantId);

    // Se está alterando o código, verificar conflito
    if (dto.code && dto.code.toUpperCase().trim() !== existing.code) {
      const conflict = await this.prisma.coupon.findFirst({
        where: {
          code: dto.code.toUpperCase().trim(),
          tenantId,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException('Já existe um cupom com este código');
      }
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code ? dto.code.toUpperCase().trim() : undefined,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minPurchase: dto.minPurchase,
        maxDiscount: dto.maxDiscount,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        isActive: dto.isActive,
      },
    });

    this.logger.logUserAction('system', 'coupon_updated', {
      couponId: id,
      tenantId,
    }, 'CouponsService');

    return coupon;
  }

  async delete(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    await this.prisma.coupon.delete({
      where: { id },
    });

    this.logger.logUserAction('system', 'coupon_deleted', {
      couponId: id,
      tenantId,
    }, 'CouponsService');

    return { message: 'Cupom excluído com sucesso' };
  }

  async validate(tenantId: string, dto: ValidateCouponDto, userId?: string): Promise<CouponResponseDto> {
    const code = dto.code.toUpperCase().trim();
    const coupon = await this.findByCode(code, tenantId);

    if (!coupon) {
      return {
        id: '',
        code,
        type: '',
        value: 0,
        minPurchase: 0,
        usedCount: 0,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isValid: false,
        discountAmount: 0,
        message: 'Cupom não encontrado',
      };
    }

    const now = new Date();
    let isValid = true;
    let message = '';

    // Verificar se está ativo
    if (!coupon.isActive) {
      isValid = false;
      message = 'Cupom inativo';
    }

    // Verificar data de início
    if (isValid && coupon.validFrom && coupon.validFrom > now) {
      isValid = false;
      message = 'Cupom ainda não está válido';
    }

    // Verificar data de fim
    if (isValid && coupon.validUntil && coupon.validUntil < now) {
      isValid = false;
      message = 'Cupom expirado';
    }

    // Verificar limite de usos total
    if (isValid && coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      isValid = false;
      message = 'Cupom esgotado';
    }

    // Verificar compra mínima
    if (isValid && coupon.minPurchase > 0 && dto.subtotal < coupon.minPurchase) {
      isValid = false;
      message = `Compra mínima de R$ ${coupon.minPurchase.toFixed(2).replace('.', ',')} para usar este cupom`;
    }

    // Verificar limite por usuário
    if (isValid && userId && coupon.maxUsesPerUser) {
      const userUsages = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });

      if (userUsages >= coupon.maxUsesPerUser) {
        isValid = false;
        message = 'Você já usou este cupom o máximo de vezes permitido';
      }
    }

    // Calcular desconto
    let discountAmount = 0;
    if (isValid) {
      if (coupon.type === 'percentage') {
        discountAmount = (dto.subtotal * coupon.value) / 100;
        // Aplicar limite máximo se definido
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        discountAmount = coupon.value;
        // Não pode ser maior que o subtotal
        if (discountAmount > dto.subtotal) {
          discountAmount = dto.subtotal;
        }
      }
      message = `Desconto de R$ ${discountAmount.toFixed(2).replace('.', ',')} aplicado!`;
    }

    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description || undefined,
      type: coupon.type,
      value: coupon.value,
      minPurchase: coupon.minPurchase,
      maxDiscount: coupon.maxDiscount || undefined,
      maxUses: coupon.maxUses || undefined,
      maxUsesPerUser: coupon.maxUsesPerUser || undefined,
      usedCount: coupon.usedCount,
      validFrom: coupon.validFrom || undefined,
      validUntil: coupon.validUntil || undefined,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      isValid,
      discountAmount,
      message,
    };
  }

  async applyCoupon(couponId: string, userId: string | null, orderId: string | null, discount: number) {
    // Registrar uso
    await this.prisma.couponUsage.create({
      data: {
        couponId,
        userId,
        orderId,
        discount,
      },
    });

    // Incrementar contador
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async getStats(tenantId: string) {
    const [total, active, expired, totalDiscount] = await Promise.all([
      this.prisma.coupon.count({ where: { tenantId } }),
      this.prisma.coupon.count({ where: { tenantId, isActive: true } }),
      this.prisma.coupon.count({
        where: {
          tenantId,
          validUntil: { lt: new Date() },
        },
      }),
      this.prisma.couponUsage.aggregate({
        where: { coupon: { tenantId } },
        _sum: { discount: true },
      }),
    ]);

    return {
      total,
      active,
      expired,
      totalDiscount: totalDiscount._sum.discount || 0,
    };
  }

  // Validação pública (sem autenticação) - usa tenantId padrão
  async validatePublic(dto: ValidateCouponDto) {
    const code = dto.code.toUpperCase().trim();
    
    // Buscar cupom em qualquer tenant (para validação pública)
    const coupon = await this.prisma.coupon.findFirst({
      where: { code },
    });

    if (!coupon) {
      return {
        valid: false,
        message: 'Cupom não encontrado',
      };
    }

    const now = new Date();
    let valid = true;
    let message = '';

    // Verificar se está ativo
    if (!coupon.isActive) {
      valid = false;
      message = 'Cupom inativo';
    }

    // Verificar data de início
    if (valid && coupon.validFrom && coupon.validFrom > now) {
      valid = false;
      message = 'Cupom ainda não está válido';
    }

    // Verificar data de fim
    if (valid && coupon.validUntil && coupon.validUntil < now) {
      valid = false;
      message = 'Cupom expirado';
    }

    // Verificar limite de usos total
    if (valid && coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      valid = false;
      message = 'Cupom esgotado';
    }

    // Verificar compra mínima
    const orderTotal = dto.orderTotal || dto.subtotal || 0;
    if (valid && coupon.minPurchase > 0 && orderTotal < coupon.minPurchase) {
      valid = false;
      message = `Compra mínima de R$ ${coupon.minPurchase.toFixed(2).replace('.', ',')} para usar este cupom`;
    }

    // Calcular desconto
    let discountAmount = 0;
    if (valid) {
      if (coupon.type === 'percentage') {
        discountAmount = (orderTotal * coupon.value) / 100;
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        discountAmount = coupon.value;
        if (discountAmount > orderTotal) {
          discountAmount = orderTotal;
        }
      }
      message = `Desconto de R$ ${discountAmount.toFixed(2).replace('.', ',')} aplicado!`;
    }

    return {
      valid,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      discountAmount,
      message,
    };
  }
}
