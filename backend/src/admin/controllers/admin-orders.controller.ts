import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('admin/orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const where: any = {};
      
      if (status) {
        where.status = status.toUpperCase();
      }

      const orders = await this.prisma.order.findMany({
        where,
        take: limit || 50,
        skip: offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const total = await this.prisma.order.count({ where });

      return {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user?.name || 'Cliente',
          customerEmail: order.user?.email || '-',
          status: order.status?.toLowerCase() || 'pending',
          total: order.totalAmount || 0,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        total,
        limit: limit || 50,
        offset: offset || 0,
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { orders: [], total: 0 };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics' })
  async getStats() {
    try {
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING' } }),
        this.prisma.order.count({ where: { status: 'PROCESSING' } }),
        this.prisma.order.count({ where: { status: 'COMPLETED' } }),
        this.prisma.order.count({ where: { status: 'CANCELLED' } }),
        this.prisma.order.aggregate({
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        revenue: totalRevenue._sum.totalAmount || 0,
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(@Param('id') id: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!order) {
        return { error: 'Pedido não encontrado' };
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customer: {
          id: order.user?.id,
          name: order.user?.name || 'Cliente',
          email: order.user?.email,
        },
        status: order.status?.toLowerCase(),
        total: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      return { error: 'Erro ao buscar pedido' };
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    try {
      const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
      const status = body.status.toUpperCase();
      
      if (!validStatuses.includes(status)) {
        return { error: 'Status inválido' };
      }

      const order = await this.prisma.order.update({
        where: { id },
        data: { 
          status,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Status atualizado para ${status}`,
        order: {
          id: order.id,
          status: order.status?.toLowerCase(),
        },
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { error: 'Erro ao atualizar status' };
    }
  }
}
