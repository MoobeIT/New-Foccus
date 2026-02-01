import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto, UpdateClientDto, ClientResponseDto, ClientStatsDto } from '../dto/client.dto';

export interface ClientFilters {
  userId: string;
  tenantId: string;
  search?: string;
  sortBy?: 'name' | 'recent' | 'projects' | 'spent';
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreateClientDto): Promise<ClientResponseDto> {
    // Verificar se já existe cliente com mesmo email para este fotógrafo
    const existing = await this.prisma.client.findUnique({
      where: { userId_email: { userId, email: dto.email } },
    });

    if (existing) {
      throw new ConflictException('Já existe um cliente com este email');
    }

    const client = await this.prisma.client.create({
      data: {
        userId,
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes,
      },
    });

    return this.toResponseDto(client);
  }

  async findAll(filters: ClientFilters): Promise<ClientResponseDto[]> {
    const { userId, tenantId, search, sortBy } = filters;

    const where: any = { userId, tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    let orderBy: any = { name: 'asc' };
    switch (sortBy) {
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'projects':
        orderBy = { projectsCount: 'desc' };
        break;
      case 'spent':
        orderBy = { totalSpent: 'desc' };
        break;
    }

    const clients = await this.prisma.client.findMany({
      where,
      orderBy,
    });

    return clients.map(c => this.toResponseDto(c));
  }

  async findOne(id: string, userId: string, tenantId: string): Promise<ClientResponseDto> {
    const client = await this.prisma.client.findFirst({
      where: { id, userId, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return this.toResponseDto(client);
  }

  async update(id: string, userId: string, tenantId: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
    // Verificar se cliente existe
    await this.findOne(id, userId, tenantId);

    // Se está atualizando email, verificar duplicidade
    if (dto.email) {
      const existing = await this.prisma.client.findFirst({
        where: {
          userId,
          email: dto.email,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Já existe um cliente com este email');
      }
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.toResponseDto(client);
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    // Verificar se cliente existe
    await this.findOne(id, userId, tenantId);

    await this.prisma.client.delete({
      where: { id },
    });
  }

  async getStats(userId: string, tenantId: string): Promise<ClientStatsDto> {
    const clients = await this.prisma.client.findMany({
      where: { userId, tenantId },
      select: {
        projectsCount: true,
        totalSpent: true,
        createdAt: true,
      },
    });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    return {
      total: clients.length,
      activeClients: clients.filter(c => c.projectsCount > 0).length,
      newThisMonth: clients.filter(c => new Date(c.createdAt) > monthAgo).length,
      totalRevenue: clients.reduce((sum, c) => sum + c.totalSpent, 0),
    };
  }

  // Atualizar estatísticas do cliente quando um projeto é criado/finalizado
  async updateClientStats(clientEmail: string, userId: string, amount?: number): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { userId_email: { userId, email: clientEmail } },
    });

    if (client) {
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          projectsCount: { increment: 1 },
          lastProjectAt: new Date(),
          ...(amount && { totalSpent: { increment: amount } }),
        },
      });
    }
  }

  private toResponseDto(client: any): ClientResponseDto {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      totalSpent: client.totalSpent,
      projectsCount: client.projectsCount,
      lastProjectAt: client.lastProjectAt,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
