import { Controller, Get, Query, Request } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardStats(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.analyticsService.getDashboardStats(tenantId, userId);
  }

  @Get('revenue')
  async getRevenueData(
    @Request() req: any,
    @Query('period') period: '3m' | '6m' | '1y' = '6m',
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.analyticsService.getRevenueData(tenantId, userId, period);
  }

  @Get('products')
  async getProductStats(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.analyticsService.getProductStats(tenantId);
  }

  @Get('clients')
  async getClientStats(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.analyticsService.getClientStats(tenantId, userId);
  }

  @Get('orders-timeline')
  async getOrdersTimeline(
    @Request() req: any,
    @Query('days') days: number = 30,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.analyticsService.getOrdersTimeline(tenantId, userId, days);
  }

  @Get('funnel')
  async getConversionFunnel(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.analyticsService.getConversionFunnel(tenantId);
  }
}
