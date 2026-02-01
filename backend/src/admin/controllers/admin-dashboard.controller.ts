import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Get recent orders' })
  @ApiResponse({ status: 200, description: 'Recent orders retrieved successfully' })
  async getRecentOrders() {
    return this.dashboardService.getRecentOrders();
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities' })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  async getRecentActivities() {
    return this.dashboardService.getRecentActivities();
  }

  @Get('production-queue')
  @ApiOperation({ summary: 'Get production queue' })
  @ApiResponse({ status: 200, description: 'Production queue retrieved successfully' })
  async getProductionQueue() {
    return this.dashboardService.getProductionQueue();
  }
}
