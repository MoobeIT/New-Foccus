import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import {
  Client,
  ClientOrder,
  ClientWithOrders,
  CreateClientDto,
  UpdateClientDto,
  UpcomingDate,
} from '../entities/client.entity';

@Injectable()
export class ClientsService {
  private clients: Map<string, Client> = new Map();
  private clientOrders: Map<string, ClientOrder[]> = new Map();

  constructor(private logger: LoggerService) {
    // Initialize with some mock data
    this.initMockData();
  }

  private initMockData() {
    const mockClients: Client[] = [
      {
        id: 'client-1',
        tenantId: 'default',
        userId: 'user-1',
        name: 'Maria Silva',
        email: 'maria@email.com',
        phone: '11999991111',
        type: 'individual',
        status: 'active',
        birthday: new Date('1990-05-20'),
        weddingAnniversary: new Date('2022-11-12'),
        totalOrders: 5,
        totalSpent: 1450,
        lastOrderAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        notes: 'Cliente VIP',
        tags: ['vip', 'casamento'],
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date(),
      },
      {
        id: 'client-2',
        tenantId: 'default',
        userId: 'user-1',
        name: 'João Santos',
        email: 'joao@email.com',
        phone: '11999992222',
        type: 'individual',
        status: 'active',
        birthday: new Date('1985-08-15'),
        totalOrders: 3,
        totalSpent: 750,
        lastOrderAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-06-20'),
        updatedAt: new Date(),
      },
    ];

    mockClients.forEach(client => {
      this.clients.set(client.id, client);
      this.clientOrders.set(client.id, []);
    });
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateClientDto,
  ): Promise<Client> {
    const client: Client = {
      id: `client-${Date.now()}`,
      tenantId,
      userId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      type: dto.type || 'individual',
      status: 'active',
      birthday: dto.birthday,
      weddingAnniversary: dto.weddingAnniversary,
      totalOrders: 0,
      totalSpent: 0,
      notes: dto.notes,
      tags: dto.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clients.set(client.id, client);
    this.clientOrders.set(client.id, []);

    this.logger.debug('Client created', 'ClientsService', { clientId: client.id });

    return client;
  }

  async findAll(
    tenantId: string,
    userId: string,
    filters?: {
      status?: 'active' | 'inactive';
      search?: string;
      sortBy?: 'name' | 'recent' | 'orders' | 'revenue';
    },
  ): Promise<Client[]> {
    let clients = Array.from(this.clients.values()).filter(
      c => c.tenantId === tenantId && c.userId === userId,
    );

    if (filters?.status) {
      clients = clients.filter(c => c.status === filters.status);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      clients = clients.filter(
        c =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search),
      );
    }

    switch (filters?.sortBy) {
      case 'recent':
        clients.sort((a, b) => (b.lastOrderAt?.getTime() || 0) - (a.lastOrderAt?.getTime() || 0));
        break;
      case 'orders':
        clients.sort((a, b) => b.totalOrders - a.totalOrders);
        break;
      case 'revenue':
        clients.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      default:
        clients.sort((a, b) => a.name.localeCompare(b.name));
    }

    return clients;
  }

  async findOne(
    tenantId: string,
    userId: string,
    clientId: string,
  ): Promise<ClientWithOrders> {
    const client = this.clients.get(clientId);

    if (!client || client.tenantId !== tenantId || client.userId !== userId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const orders = this.clientOrders.get(clientId) || [];

    return { ...client, orders };
  }

  async update(
    tenantId: string,
    userId: string,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const client = this.clients.get(clientId);

    if (!client || client.tenantId !== tenantId || client.userId !== userId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    Object.assign(client, dto, { updatedAt: new Date() });
    this.clients.set(clientId, client);

    return client;
  }

  async delete(tenantId: string, userId: string, clientId: string): Promise<void> {
    const client = this.clients.get(clientId);

    if (!client || client.tenantId !== tenantId || client.userId !== userId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    this.clients.delete(clientId);
    this.clientOrders.delete(clientId);
  }

  async getUpcomingDates(
    tenantId: string,
    userId: string,
    days: number = 30,
  ): Promise<UpcomingDate[]> {
    const clients = await this.findAll(tenantId, userId);
    const upcoming: UpcomingDate[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    for (const client of clients) {
      // Check birthday
      if (client.birthday) {
        const thisYearBirthday = new Date(
          now.getFullYear(),
          client.birthday.getMonth(),
          client.birthday.getDate(),
        );
        
        if (thisYearBirthday < now) {
          thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
        }

        if (thisYearBirthday <= endDate) {
          const daysUntil = Math.ceil(
            (thisYearBirthday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          );
          upcoming.push({
            clientId: client.id,
            clientName: client.name,
            type: 'Aniversário',
            date: thisYearBirthday,
            daysUntil,
          });
        }
      }

      // Check wedding anniversary
      if (client.weddingAnniversary) {
        const thisYearAnniversary = new Date(
          now.getFullYear(),
          client.weddingAnniversary.getMonth(),
          client.weddingAnniversary.getDate(),
        );

        if (thisYearAnniversary < now) {
          thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
        }

        if (thisYearAnniversary <= endDate) {
          const daysUntil = Math.ceil(
            (thisYearAnniversary.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          );
          upcoming.push({
            clientId: client.id,
            clientName: client.name,
            type: 'Aniversário de Casamento',
            date: thisYearAnniversary,
            daysUntil,
          });
        }
      }
    }

    // Sort by date
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    return upcoming;
  }

  async recordOrder(
    clientId: string,
    order: { id: string; productName: string; status: string; total: number },
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.totalOrders += 1;
    client.totalSpent += order.total;
    client.lastOrderAt = new Date();
    client.updatedAt = new Date();

    const orders = this.clientOrders.get(clientId) || [];
    orders.push({
      id: order.id,
      clientId,
      productName: order.productName,
      status: order.status,
      total: order.total,
      date: new Date(),
    });
    this.clientOrders.set(clientId, orders);
  }
}
