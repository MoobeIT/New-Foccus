import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface DashboardStats {
  totalProjects: number;
  projectsThisMonth: number;
  pendingOrders: number;
  ordersInProduction: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueGrowth: number;
  totalClients: number;
  newClientsThisMonth: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface RevenueData {
  period: string;
  data: { label: string; value: number }[];
  total: number;
  average: number;
  growth: number;
}

export interface ProductStats {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  averagePrice: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  newThisMonth: number;
  churnRate: number;
  averageLifetimeValue: number;
  topClients: {
    id: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
  }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private logger: LoggerService) {}

  async getDashboardStats(tenantId: string, userId: string): Promise<DashboardStats> {
    // In production, this would query the database
    // For now, return mock data
    return {
      totalProjects: 47,
      projectsThisMonth: 8,
      pendingOrders: 5,
      ordersInProduction: 3,
      totalRevenue: 28450,
      revenueThisMonth: 7350,
      revenueGrowth: 12,
      totalClients: 32,
      newClientsThisMonth: 4,
      averageOrderValue: 285,
      conversionRate: 68,
    };
  }

  async getRevenueData(
    tenantId: string,
    userId: string,
    period: '3m' | '6m' | '1y',
  ): Promise<RevenueData> {
    const now = new Date();
    const data: { label: string; value: number }[] = [];
    
    let months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' });
      // Mock revenue data with some variation
      const baseValue = 3000 + Math.random() * 4000;
      data.push({ label, value: Math.round(baseValue) });
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const average = total / data.length;
    
    // Calculate growth (compare last month to previous)
    const lastMonth = data[data.length - 1]?.value || 0;
    const prevMonth = data[data.length - 2]?.value || lastMonth;
    const growth = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

    return {
      period,
      data,
      total,
      average,
      growth,
    };
  }

  async getProductStats(tenantId: string): Promise<ProductStats[]> {
    return [
      {
        productId: '1',
        productName: 'Álbum Casamento Premium',
        totalSold: 45,
        revenue: 13455,
        averagePrice: 299,
        trend: 'up',
      },
      {
        productId: '2',
        productName: 'Álbum Ensaio 25x25',
        totalSold: 32,
        revenue: 6368,
        averagePrice: 199,
        trend: 'stable',
      },
      {
        productId: '3',
        productName: 'Estojo Madeira Luxo',
        totalSold: 28,
        revenue: 5292,
        averagePrice: 189,
        trend: 'up',
      },
      {
        productId: '4',
        productName: 'Álbum Newborn',
        totalSold: 18,
        revenue: 2682,
        averagePrice: 149,
        trend: 'down',
      },
    ];
  }

  async getClientStats(tenantId: string, userId: string): Promise<ClientStats> {
    return {
      totalClients: 32,
      activeClients: 28,
      newThisMonth: 4,
      churnRate: 5,
      averageLifetimeValue: 890,
      topClients: [
        { id: '1', name: 'Maria Silva', totalOrders: 8, totalSpent: 2450 },
        { id: '2', name: 'João Santos', totalOrders: 6, totalSpent: 1890 },
        { id: '3', name: 'Ana Costa', totalOrders: 5, totalSpent: 1450 },
        { id: '4', name: 'Pedro Lima', totalOrders: 4, totalSpent: 1200 },
        { id: '5', name: 'Carla Oliveira', totalOrders: 4, totalSpent: 980 },
      ],
    };
  }

  async getOrdersTimeline(
    tenantId: string,
    userId: string,
    days: number = 30,
  ): Promise<{ date: string; orders: number; revenue: number }[]> {
    const data: { date: string; orders: number; revenue: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        orders: Math.floor(Math.random() * 5),
        revenue: Math.floor(Math.random() * 1500),
      });
    }

    return data;
  }

  async getConversionFunnel(tenantId: string): Promise<{
    visitors: number;
    productViews: number;
    addedToCart: number;
    startedCheckout: number;
    completed: number;
  }> {
    return {
      visitors: 1250,
      productViews: 890,
      addedToCart: 320,
      startedCheckout: 180,
      completed: 122,
    };
  }
}
