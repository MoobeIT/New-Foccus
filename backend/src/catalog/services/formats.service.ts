import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ValidationService } from '../../common/services/validation.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateFormatDto, UpdateFormatDto } from '../dto/format.dto';

@Injectable()
export class FormatsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {}

  async findAll(tenantId: string) {
    try {
      const formats = await this.prisma.format.findMany({
        where: { tenantId },
        include: { 
          product: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { name: 'asc' },
      });

      return {
        data: formats,
        total: formats.length,
        message: 'Formatos listados com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao listar formatos', error.stack, 'FormatsService');
      throw error;
    }
  }

  async findActive(tenantId: string) {
    try {
      const formats = await this.prisma.format.findMany({
        where: { tenantId, isActive: true },
        include: { 
          product: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { name: 'asc' },
      });

      return {
        data: formats,
        total: formats.length,
        message: 'Formatos ativos listados com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao listar formatos ativos', error.stack, 'FormatsService');
      throw error;
    }
  }

  async findByProduct(productId: string, tenantId: string) {
    try {
      const formats = await this.prisma.format.findMany({
        where: { productId, tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });

      return {
        data: formats,
        total: formats.length,
        message: 'Formatos do produto listados com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao listar formatos por produto', error.stack, 'FormatsService');
      throw error;
    }
  }

  async findById(id: string, tenantId: string) {
    // IDs podem ser strings customizadas
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    try {
      const format = await this.prisma.format.findFirst({
        where: { id, tenantId },
        include: { 
          product: {
            select: { id: true, name: true, type: true }
          },
          papers: { 
            include: { 
              paper: {
                select: { id: true, name: true, type: true, weight: true }
              }
            }
          }
        },
      });

      if (!format) {
        throw new NotFoundException('Formato não encontrado');
      }

      return {
        data: format,
        message: 'Formato encontrado com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao buscar formato por ID', error.stack, 'FormatsService');
      throw error;
    }
  }

  async create(tenantId: string, createFormatDto: CreateFormatDto) {
    const { productId, name, width, height, orientation, minPages, maxPages, pageIncrement, bleed, safeMargin, gutterMargin, basePrice, pricePerExtraPage, priceMultiplier } = createFormatDto;

    // Verificar se o produto existe
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId }
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Verificar se já existe um formato com o mesmo nome para este produto
    const existingFormat = await this.prisma.format.findFirst({
      where: { 
        tenantId, 
        productId,
        name: name.trim()
      }
    });

    if (existingFormat) {
      throw new ConflictException('Já existe um formato com este nome para este produto');
    }

    try {
      const format = await this.prisma.format.create({
        data: {
          tenantId,
          productId,
          name: name.trim(),
          width,
          height,
          orientation: orientation || 'square',
          minPages: minPages || 20,
          maxPages: maxPages || 200,
          pageIncrement: pageIncrement || 2,
          bleed: bleed || 3,
          safeMargin: safeMargin || 5,
          gutterMargin: gutterMargin || 10,
          basePrice: basePrice || 0,
          pricePerExtraPage: pricePerExtraPage || 0,
          priceMultiplier: priceMultiplier || 1.0,
          isActive: true,
        },
        include: {
          product: {
            select: { id: true, name: true, type: true }
          }
        }
      });

      this.logger.logUserAction('system', 'format_created', { 
        formatId: format.id, 
        tenantId,
        productId,
        name 
      }, 'FormatsService');

      return {
        data: format,
        message: 'Formato criado com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao criar formato', error.stack, 'FormatsService');
      throw error;
    }
  }

  async update(id: string, tenantId: string, updateFormatDto: Partial<UpdateFormatDto>) {
    // IDs podem ser strings customizadas (ex: format-30x20)
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se o formato existe
    const existingFormat = await this.prisma.format.findFirst({
      where: { id, tenantId }
    });

    if (!existingFormat) {
      throw new NotFoundException('Formato não encontrado');
    }

    // Se o nome está sendo alterado, verificar conflitos
    if (updateFormatDto.name && updateFormatDto.name !== existingFormat.name) {
      const conflictingFormat = await this.prisma.format.findFirst({
        where: { 
          tenantId, 
          productId: existingFormat.productId,
          name: updateFormatDto.name.trim(),
          id: { not: id }
        }
      });

      if (conflictingFormat) {
        throw new ConflictException('Já existe um formato com este nome para este produto');
      }
    }

    try {
      // Preparar dados para atualização
      const updateData: any = {};
      
      if (updateFormatDto.name !== undefined) updateData.name = updateFormatDto.name.trim();
      if (updateFormatDto.width !== undefined) updateData.width = updateFormatDto.width;
      if (updateFormatDto.height !== undefined) updateData.height = updateFormatDto.height;
      if (updateFormatDto.orientation !== undefined) updateData.orientation = updateFormatDto.orientation;
      if (updateFormatDto.minPages !== undefined) updateData.minPages = updateFormatDto.minPages;
      if (updateFormatDto.maxPages !== undefined) updateData.maxPages = updateFormatDto.maxPages;
      if (updateFormatDto.pageIncrement !== undefined) updateData.pageIncrement = updateFormatDto.pageIncrement;
      if (updateFormatDto.bleed !== undefined) updateData.bleed = updateFormatDto.bleed;
      if (updateFormatDto.safeMargin !== undefined) updateData.safeMargin = updateFormatDto.safeMargin;
      if (updateFormatDto.gutterMargin !== undefined) updateData.gutterMargin = updateFormatDto.gutterMargin;
      if (updateFormatDto.basePrice !== undefined) updateData.basePrice = updateFormatDto.basePrice;
      if (updateFormatDto.pricePerExtraPage !== undefined) updateData.pricePerExtraPage = updateFormatDto.pricePerExtraPage;
      if (updateFormatDto.priceMultiplier !== undefined) updateData.priceMultiplier = updateFormatDto.priceMultiplier;
      if (updateFormatDto.isActive !== undefined) updateData.isActive = updateFormatDto.isActive;

      const format = await this.prisma.format.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            select: { id: true, name: true, type: true }
          }
        }
      });

      this.logger.logUserAction('system', 'format_updated', { 
        formatId: id, 
        tenantId 
      }, 'FormatsService');

      return {
        data: format,
        message: 'Formato atualizado com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao atualizar formato', error.stack, 'FormatsService');
      throw error;
    }
  }

  async delete(id: string, tenantId: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID inválido');
    }

    // Verificar se o formato existe
    const format = await this.prisma.format.findFirst({
      where: { id, tenantId }
    });

    if (!format) {
      throw new NotFoundException('Formato não encontrado');
    }

    // Verificar se o formato está sendo usado em algum lugar
    // TODO: Adicionar verificações de uso quando necessário

    try {
      await this.prisma.format.delete({
        where: { id }
      });

      this.logger.logUserAction('system', 'format_deleted', { 
        formatId: id, 
        tenantId 
      }, 'FormatsService');

      return {
        message: 'Formato excluído com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao excluir formato', error.stack, 'FormatsService');
      throw error;
    }
  }

  async activate(id: string, tenantId: string) {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string) {
    return this.update(id, tenantId, { isActive: false });
  }

  async getStats(tenantId: string) {
    try {
      const [total, active, inactive, byProduct] = await Promise.all([
        this.prisma.format.count({ where: { tenantId } }),
        this.prisma.format.count({ where: { tenantId, isActive: true } }),
        this.prisma.format.count({ where: { tenantId, isActive: false } }),
        this.prisma.format.groupBy({
          by: ['productId'],
          where: { tenantId },
          _count: { id: true },
        }),
      ]);

      return {
        total,
        active,
        inactive,
        byProduct: byProduct.length,
        message: 'Estatísticas dos formatos obtidas com sucesso'
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas dos formatos', error.stack, 'FormatsService');
      throw error;
    }
  }

  async findProductsWithoutFormats(tenantId: string) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          tenantId,
          formats: {
            none: {}
          }
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      return products;
    } catch (error) {
      this.logger.error('Erro ao buscar produtos sem formatos', error.stack, 'FormatsService');
      throw error;
    }
  }
}
