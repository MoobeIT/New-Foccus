import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdersService } from '../services/orders.service';
import {
  OrderFilters,
  OrderStatus,
  AddTrackingRequest,
  UpdateTrackingRequest,
} from '../entities/order.entity';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: 'date' | 'amount' | 'status',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters: OrderFilters = {
      status: status ? (status.split(',') as OrderStatus[]) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      sortBy,
      sortOrder,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };

    return this.ordersService.listOrders(
      req.user.tenantId,
      req.user.id,
      filters,
    );
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOrder(
      req.user.tenantId,
      req.user.id,
      orderId,
    );
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  async cancelOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrder(
      req.user.tenantId,
      req.user.id,
      orderId,
      reason,
    );
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get order by order number' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderByNumber(
    @Request() req: any,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.getOrderByNumber(
      req.user.tenantId,
      orderNumber,
    );
  }
}
