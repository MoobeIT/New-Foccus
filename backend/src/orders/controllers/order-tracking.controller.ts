import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdersService } from '../services/orders.service';
import { AddTrackingRequest, UpdateTrackingRequest } from '../entities/order.entity';

@ApiTags('order-tracking')
@Controller('orders/:orderId/tracking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderTrackingController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get order tracking information' })
  @ApiResponse({ status: 200, description: 'Tracking info retrieved' })
  async getTracking(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.ordersService.getOrder(
      req.user.tenantId,
      req.user.id,
      orderId,
    );
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      shippingStatus: order.shippingStatus,
      shippingData: order.shippingData,
      timeline: order.timeline,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Add tracking information (admin)' })
  @ApiResponse({ status: 201, description: 'Tracking added successfully' })
  async addTracking(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body() request: AddTrackingRequest,
  ) {
    return this.ordersService.addTracking(
      req.user.tenantId,
      orderId,
      request,
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update tracking status (admin)' })
  @ApiResponse({ status: 200, description: 'Tracking updated successfully' })
  async updateTracking(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body() request: UpdateTrackingRequest,
  ) {
    return this.ordersService.updateTracking(
      req.user.tenantId,
      orderId,
      request,
    );
  }
}
