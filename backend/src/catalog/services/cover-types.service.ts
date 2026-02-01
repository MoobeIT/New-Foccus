import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCoverTypeDto, UpdateCoverTypeDto } from '../dto/cover-type.dto';

export interface CoverTypeFilters {
  active?: boolean;
  type?: string;
}

@Injectable()
export class CoverTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: CoverTypeFilters = {}) {
    const where: any = { tenantId };

    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.coverType.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
    });
  }

  async findActive(tenantId: string) {
    return this.prisma.coverType.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, tenantId: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    const coverType = await this.prisma.coverType.findFirst({
      where: { id, tenantId },
    });

    if (!coverType) {
      throw new NotFoundException('Tipo de capa não encontrado');
    }

    return coverType;
  }

  async create(tenantId: string, createCoverTypeDto: CreateCoverTypeDto) {
    // Verificar se já existe um tipo de capa com o mesmo nome
    const existingCoverType = await this.prisma.coverType.findFirst({
      where: {
        tenantId,
        name: createCoverTypeDto.name,
      },
    });

    if (existingCoverType) {
      throw new ConflictException('Já existe um tipo de capa com este nome');
    }

    return this.prisma.coverType.create({
      data: {
        tenantId,
        name: createCoverTypeDto.name,
        type: createCoverTypeDto.type,
        material: createCoverTypeDto.material,
        bindingTolerance: createCoverTypeDto.bindingTolerance || 0,
        price: createCoverTypeDto.price,
        description: createCoverTypeDto.description,
        imageUrl: createCoverTypeDto.imageUrl,
        isActive: createCoverTypeDto.isActive !== false,
      },
    });
  }

  async update(id: string, tenantId: string, updateCoverTypeDto: UpdateCoverTypeDto) {
    // Verificar se o tipo de capa existe
    await this.findById(id, tenantId);

    // Se está alterando o nome, verificar se não conflita
    if (updateCoverTypeDto.name) {
      const existingCoverType = await this.prisma.coverType.findFirst({
        where: {
          tenantId,
          name: updateCoverTypeDto.name,
          id: { not: id },
        },
      });

      if (existingCoverType) {
        throw new ConflictException('Já existe um tipo de capa com este nome');
      }
    }

    return this.prisma.coverType.update({
      where: { id },
      data: updateCoverTypeDto,
    });
  }

  async delete(id: string, tenantId: string) {
    // Verificar se o tipo de capa existe
    await this.findById(id, tenantId);

    // Verificar se o tipo de capa está sendo usado em algum produto
    const productCoverTypes = await this.prisma.productCoverType.findMany({
      where: { coverTypeId: id },
      include: { product: true },
    });

    if (productCoverTypes.length > 0) {
      const productNames = productCoverTypes.map(pct => pct.product.name).join(', ');
      throw new ConflictException(
        `Não é possível excluir este tipo de capa pois está sendo usado nos produtos: ${productNames}`
      );
    }

    // Verificar se está sendo usado em projetos
    const projects = await this.prisma.project.findMany({
      where: { coverTypeId: id },
    });

    if (projects.length > 0) {
      throw new ConflictException(
        `Não é possível excluir este tipo de capa pois está sendo usado em ${projects.length} projeto(s)`
      );
    }

    await this.prisma.coverType.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string, tenantId: string) {
    const coverType = await this.findById(id, tenantId);

    return this.prisma.coverType.update({
      where: { id },
      data: { isActive: !coverType.isActive },
    });
  }

  // Métodos auxiliares
  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Método para obter estatísticas de uso
  async getUsageStats(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    const [productCount, projectCount] = await Promise.all([
      this.prisma.productCoverType.count({
        where: { coverTypeId: id, isActive: true }
      }),
      this.prisma.project.count({
        where: { coverTypeId: id }
      }),
    ]);

    return {
      productsUsing: productCount,
      projectsUsing: projectCount,
      totalUsage: productCount + projectCount,
    };
  }

  // Método para obter estatísticas gerais
  async getStats(tenantId: string) {
    const [total, active, byType, byMaterial] = await Promise.all([
      this.prisma.coverType.count({ where: { tenantId } }),
      this.prisma.coverType.count({ where: { tenantId, isActive: true } }),
      this.prisma.coverType.groupBy({
        by: ['type'],
        where: { tenantId, isActive: true },
        _count: { type: true },
      }),
      this.prisma.coverType.groupBy({
        by: ['material'],
        where: { tenantId, isActive: true, material: { not: null } },
        _count: { material: true },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      byMaterial: byMaterial.reduce((acc, item) => {
        if (item.material) {
          acc[item.material] = item._count.material;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Método para calcular preço com ajustes
  async calculatePrice(coverTypeId: string, productId?: string): Promise<number> {
    const coverType = await this.prisma.coverType.findUnique({
      where: { id: coverTypeId },
    });

    if (!coverType) {
      throw new NotFoundException('Tipo de capa não encontrado');
    }

    let finalPrice = coverType.price;

    // Se há um produto específico, aplicar ajuste de preço
    if (productId) {
      const productCoverType = await this.prisma.productCoverType.findUnique({
        where: {
          productId_coverTypeId: {
            productId,
            coverTypeId,
          },
        },
      });

      if (productCoverType) {
        finalPrice += productCoverType.priceAdjustment;
      }
    }

    return Math.max(0, finalPrice); // Garantir que o preço não seja negativo
  }
}
