import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaperDto, UpdatePaperDto } from '../dto/paper.dto';

export interface PaperFilters {
  active?: boolean;
  type?: string;
}

@Injectable()
export class PapersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: PaperFilters = {}) {
    const where: any = { tenantId };

    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.paper.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
    });
  }

  async findActive(tenantId: string) {
    return this.prisma.paper.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const paper = await this.prisma.paper.findFirst({
      where: { id, tenantId },
    });

    if (!paper) {
      throw new NotFoundException('Papel não encontrado');
    }

    return paper;
  }

  async create(tenantId: string, createPaperDto: CreatePaperDto) {
    // Verificar se já existe um papel com o mesmo nome
    const existingPaper = await this.prisma.paper.findFirst({
      where: {
        tenantId,
        name: createPaperDto.name,
      },
    });

    if (existingPaper) {
      throw new ConflictException('Já existe um papel com este nome');
    }

    // Calcular orientação baseada nas dimensões se não fornecida
    const orientation = this.calculateOrientation(createPaperDto.type);

    return this.prisma.paper.create({
      data: {
        tenantId,
        name: createPaperDto.name,
        type: createPaperDto.type,
        weight: createPaperDto.weight,
        thickness: createPaperDto.thickness,
        finish: createPaperDto.finish,
        lamination: createPaperDto.lamination || 'none',
        pricePerPage: createPaperDto.pricePerPage,
        description: createPaperDto.description,
        isActive: createPaperDto.isActive !== false,
      },
    });
  }

  async update(id: string, tenantId: string, updatePaperDto: UpdatePaperDto) {
    // Verificar se o papel existe
    await this.findById(id, tenantId);

    // Se está alterando o nome, verificar se não conflita
    if (updatePaperDto.name) {
      const existingPaper = await this.prisma.paper.findFirst({
        where: {
          tenantId,
          name: updatePaperDto.name,
          id: { not: id },
        },
      });

      if (existingPaper) {
        throw new ConflictException('Já existe um papel com este nome');
      }
    }

    const updatedPaper = await this.prisma.paper.update({
      where: { id },
      data: updatePaperDto,
    });

    return updatedPaper;
  }

  async delete(id: string, tenantId: string) {
    // Verificar se o papel existe
    await this.findById(id, tenantId);

    // Verificar se o papel está sendo usado em algum produto
    const productPapers = await this.prisma.productPaper.findMany({
      where: { paperId: id },
      include: { product: true },
    });

    if (productPapers.length > 0) {
      const productNames = productPapers.map(pp => pp.product.name).join(', ');
      throw new ConflictException(
        `Não é possível excluir este papel pois está sendo usado nos produtos: ${productNames}`
      );
    }

    // Verificar se está sendo usado em projetos
    const projects = await this.prisma.project.findMany({
      where: { paperId: id },
    });

    if (projects.length > 0) {
      throw new ConflictException(
        `Não é possível excluir este papel pois está sendo usado em ${projects.length} projeto(s)`
      );
    }

    await this.prisma.paper.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string, tenantId: string) {
    const paper = await this.findById(id, tenantId);

    return this.prisma.paper.update({
      where: { id },
      data: { isActive: !paper.isActive },
    });
  }

  // Métodos auxiliares
  private calculateOrientation(type: string): string {
    // Lógica para determinar orientação baseada no tipo
    return 'square'; // Por padrão
  }

  // Método para buscar papéis compatíveis com um formato
  async findCompatibleWithFormat(formatId: string, tenantId: string) {
    return this.prisma.paper.findMany({
      where: {
        tenantId,
        isActive: true,
        compatibleFormats: {
          some: { formatId }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  // Método para obter estatísticas
  async getStats(tenantId: string) {
    const [total, active, byType] = await Promise.all([
      this.prisma.paper.count({ where: { tenantId } }),
      this.prisma.paper.count({ where: { tenantId, isActive: true } }),
      this.prisma.paper.groupBy({
        by: ['type'],
        where: { tenantId, isActive: true },
        _count: { type: true },
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
    };
  }
}
