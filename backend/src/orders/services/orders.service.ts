import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../../common/services/logger.service';
import { PaymentService } from '../../payments/services/payment.service';
import { ShippingNotificationService } from '../../notifications/services/shipping-notification.service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ProductionStatus,
  ShippingStatus,
  OrderItem,
  OrderItemStatus,
  OrderCustomer,
  OrderAddress,
  ProductionData,
  ShippingData,
  TrackingEvent,
  CreateOrderRequest,
  UpdateOrderRequest,
  AddTrackingRequest,
  UpdateTrackingRequest,
  OrderSummaryResponse,
  OrderSummary,
  OrderDetailsResponse,
  OrderTimelineEvent,
  OrderFilters,
} from '../entities/order.entity';
import { CheckoutSession } from '../../checkout/entities/checkout.entity';

@Injectable()
export class OrdersService {
  // In-memory storage for development (replace with database in production)
  private orders: Map<string, Order> = new Map();
  private ordersByUser: Map<string, string[]> = new Map();
  private orderCounter = 1000;

  constructor(
    private logger: LoggerService,
    private paymentService: PaymentService,
    private shippingNotificationService: ShippingNotificationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Create order from checkout session
   */
  async createOrderFromCheckout(
    checkoutSession: CheckoutSession,
    paymentId: string,
  ): Promise<Order> {
    try {
      this.logger.debug('Creating order from checkout', 'OrdersService', {
        checkoutId: checkoutSession.id,
        paymentId,
      });

      const orderNumber = this.generateOrderNumber(checkoutSession.tenantId);
      const orderId = `order:${checkoutSession.tenantId}:${orderNumber}`;

      const order: Order = {
        id: orderId,
        orderNumber,
        tenantId: checkoutSession.tenantId,
        userId: checkoutSession.userId,
        status: 'pending',
        paymentStatus: 'pending',
        productionStatus: 'pending',
        shippingStatus: 'pending',
        customer: {
          name: `${checkoutSession.customer.firstName} ${checkoutSession.customer.lastName}`,
          email: checkoutSession.customer.email,
          phone: checkoutSession.customer.phone,
          document: checkoutSession.customer.document,
          documentType: checkoutSession.customer.documentType || 'cpf',
          companyName: checkoutSession.customer.companyName,
          stateRegistration: checkoutSession.customer.stateRegistration,
        },
        billingAddress: this.mapAddress(checkoutSession.billingAddress),
        shippingAddress: this.mapAddress(checkoutSession.shippingAddress),
        items: checkoutSession.orderSummary.items.map((item, index) => ({
          id: `${orderId}:item:${index}`,
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          projectId: item.projectId,
          projectName: item.projectName,
          quantity: item.quantity,
          pages: item.pages,
          customizations: item.customizations,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status: 'pending' as OrderItemStatus,
        })),
        subtotal: checkoutSession.orderSummary.subtotal,
        discounts: checkoutSession.orderSummary.discounts,
        taxes: checkoutSession.orderSummary.taxes,
        shipping: checkoutSession.orderSummary.shipping,
        total: checkoutSession.orderSummary.total,
        currency: checkoutSession.orderSummary.currency,
        paymentId,
        paymentMethod: checkoutSession.paymentMethod.type,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          checkoutId: checkoutSession.id,
          cartId: checkoutSession.cartId,
        },
      };

      await this.saveOrder(order);

      this.logger.debug('Order created successfully', 'OrdersService', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      return order;
    } catch (error) {
      this.logger.error('Error creating order', error.stack, 'OrdersService');
      throw error;
    }
  }


  /**
   * Get order by ID
   */
  async getOrder(
    tenantId: string,
    userId: string,
    orderId: string,
  ): Promise<OrderDetailsResponse> {
    try {
      const order = this.orders.get(orderId);

      if (!order) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (order.tenantId !== tenantId || order.userId !== userId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      const timeline = this.buildOrderTimeline(order);

      return {
        ...order,
        timeline,
        canCancel: this.canCancelOrder(order),
        canReorder: this.canReorder(order),
        canDownloadInvoice: order.paymentStatus === 'paid',
        canTrack: !!order.shippingData?.trackingCode,
      };
    } catch (error) {
      this.logger.error('Error getting order', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(
    tenantId: string,
    orderNumber: string,
  ): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.tenantId === tenantId && order.orderNumber === orderNumber) {
        return order;
      }
    }
    return null;
  }

  /**
   * List user orders with filters
   */
  async listOrders(
    tenantId: string,
    userId: string,
    filters: OrderFilters = {},
  ): Promise<OrderSummaryResponse> {
    try {
      const userOrderIds = this.ordersByUser.get(`${tenantId}:${userId}`) || [];
      let orders = userOrderIds
        .map(id => this.orders.get(id))
        .filter((order): order is Order => !!order);

      // Apply filters
      if (filters.status?.length) {
        orders = orders.filter(o => filters.status!.includes(o.status));
      }

      if (filters.paymentStatus?.length) {
        orders = orders.filter(o => filters.paymentStatus!.includes(o.paymentStatus));
      }

      if (filters.dateFrom) {
        orders = orders.filter(o => o.createdAt >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        orders = orders.filter(o => o.createdAt <= filters.dateTo!);
      }

      if (filters.minAmount !== undefined) {
        orders = orders.filter(o => o.total >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        orders = orders.filter(o => o.total <= filters.maxAmount!);
      }

      // Sort
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'desc';
      
      orders.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'amount':
            comparison = a.total - b.total;
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Pagination
      const total = orders.length;
      const offset = filters.offset || 0;
      const limit = filters.limit || 20;
      const paginatedOrders = orders.slice(offset, offset + limit);

      // Build summaries
      const summaries: OrderSummary[] = paginatedOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        currency: order.currency,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        estimatedDelivery: order.shippingData?.estimatedDelivery,
        trackingCode: order.shippingData?.trackingCode,
        canCancel: this.canCancelOrder(order),
        canReorder: this.canReorder(order),
      }));

      // Calculate stats
      const stats = this.calculateOrderStats(orders);

      return {
        orders: summaries,
        total,
        hasMore: offset + limit < total,
        stats,
      };
    } catch (error) {
      this.logger.error('Error listing orders', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      // Validate status transition
      if (!this.isValidStatusTransition(order.status, newStatus)) {
        throw new BadRequestException(
          `Transição de status inválida: ${order.status} -> ${newStatus}`,
        );
      }

      order.status = newStatus;
      order.updatedAt = new Date();

      if (notes) {
        order.internalNotes = order.internalNotes
          ? `${order.internalNotes}\n[${new Date().toISOString()}] ${notes}`
          : `[${new Date().toISOString()}] ${notes}`;
      }

      // Update related statuses
      if (newStatus === 'completed') {
        order.completedAt = new Date();
      } else if (newStatus === 'cancelled') {
        order.cancelledAt = new Date();
      }

      await this.saveOrder(order);

      this.logger.debug('Order status updated', 'OrdersService', {
        orderId,
        newStatus,
      });

      return order;
    } catch (error) {
      this.logger.error('Error updating order status', error.stack, 'OrdersService');
      throw error;
    }
  }


  /**
   * Update payment status
   */
  async updatePaymentStatus(
    tenantId: string,
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      order.paymentStatus = paymentStatus;
      order.updatedAt = new Date();

      // Auto-update order status based on payment
      if (paymentStatus === 'paid' && order.status === 'pending') {
        order.status = 'paid';
        order.productionStatus = 'queued';
      } else if (paymentStatus === 'refunded') {
        order.status = 'refunded';
      }

      await this.saveOrder(order);

      this.logger.debug('Payment status updated', 'OrdersService', {
        orderId,
        paymentStatus,
      });

      return order;
    } catch (error) {
      this.logger.error('Error updating payment status', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Start production for order
   */
  async startProduction(
    tenantId: string,
    orderId: string,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (order.paymentStatus !== 'paid') {
        throw new BadRequestException('Pagamento não confirmado');
      }

      order.status = 'production';
      order.productionStatus = 'in_progress';
      order.productionData = {
        startedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      };
      order.updatedAt = new Date();

      // Update item statuses
      order.items.forEach(item => {
        item.status = 'production';
      });

      await this.saveOrder(order);

      this.logger.debug('Production started', 'OrdersService', { orderId });

      return order;
    } catch (error) {
      this.logger.error('Error starting production', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Complete production for order
   */
  async completeProduction(
    tenantId: string,
    orderId: string,
    productionFiles?: { type: string; filename: string; url: string; size: number }[],
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      order.productionStatus = 'completed';
      order.status = 'ready_to_ship';
      
      if (!order.productionData) {
        order.productionData = {};
      }
      
      order.productionData.completedAt = new Date();
      
      if (productionFiles) {
        order.productionData.files = productionFiles.map((file, index) => ({
          id: `file:${orderId}:${index}`,
          type: file.type as any,
          filename: file.filename,
          url: file.url,
          size: file.size,
          createdAt: new Date(),
        }));
      }

      order.updatedAt = new Date();

      // Update item statuses
      order.items.forEach(item => {
        item.status = 'completed';
      });

      await this.saveOrder(order);

      this.logger.debug('Production completed', 'OrdersService', { orderId });

      return order;
    } catch (error) {
      this.logger.error('Error completing production', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Add tracking information
   */
  async addTracking(
    tenantId: string,
    orderId: string,
    request: AddTrackingRequest,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      const trackingUrl = this.shippingNotificationService.getTrackingUrl(
        request.carrier,
        request.trackingCode,
      );

      order.shippingData = {
        carrier: request.carrier,
        service: request.service,
        trackingCode: request.trackingCode,
        estimatedDelivery: request.estimatedDelivery,
        shippedAt: new Date(),
        trackingEvents: [{
          id: `tracking:${orderId}:0`,
          status: 'shipped',
          description: 'Pedido enviado',
          timestamp: new Date(),
        }],
      };

      order.status = 'shipped';
      order.shippingStatus = 'shipped';
      order.updatedAt = new Date();

      await this.saveOrder(order);

      // Enviar notificação de envio
      try {
        await this.shippingNotificationService.sendShippedNotification(
          tenantId,
          order.userId,
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            customerEmail: order.customer.email,
            customerPhone: order.customer.phone,
            trackingCode: request.trackingCode,
            carrier: request.carrier,
            carrierName: this.getCarrierName(request.carrier),
            estimatedDelivery: request.estimatedDelivery,
            trackingUrl,
          },
        );
      } catch (notifError) {
        this.logger.warn('Failed to send shipping notification', 'OrdersService', {
          orderId,
          error: notifError.message,
        });
      }

      this.logger.debug('Tracking added', 'OrdersService', {
        orderId,
        trackingCode: request.trackingCode,
      });

      return order;
    } catch (error) {
      this.logger.error('Error adding tracking', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Update tracking status
   */
  async updateTracking(
    tenantId: string,
    orderId: string,
    request: UpdateTrackingRequest,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (!order.shippingData) {
        throw new BadRequestException('Pedido não possui dados de envio');
      }

      const event: TrackingEvent = {
        id: `tracking:${orderId}:${order.shippingData.trackingEvents?.length || 0}`,
        status: request.status,
        description: request.description,
        location: request.location,
        timestamp: request.timestamp || new Date(),
      };

      if (!order.shippingData.trackingEvents) {
        order.shippingData.trackingEvents = [];
      }
      order.shippingData.trackingEvents.push(event);

      // Update shipping status based on event
      if (request.status === 'delivered') {
        order.shippingStatus = 'delivered';
        order.status = 'delivered';
        order.shippingData.deliveredAt = new Date();
      } else if (request.status === 'in_transit') {
        order.shippingStatus = 'in_transit';
      } else if (request.status === 'out_for_delivery') {
        order.shippingStatus = 'out_for_delivery';
      }

      order.updatedAt = new Date();

      await this.saveOrder(order);

      // Enviar notificações baseadas no status
      const trackingUrl = this.shippingNotificationService.getTrackingUrl(
        order.shippingData.carrier,
        order.shippingData.trackingCode,
      );

      const notificationData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        trackingCode: order.shippingData.trackingCode,
        carrier: order.shippingData.carrier,
        carrierName: this.getCarrierName(order.shippingData.carrier),
        estimatedDelivery: order.shippingData.estimatedDelivery,
        trackingUrl,
      };

      try {
        if (request.status === 'out_for_delivery') {
          await this.shippingNotificationService.sendOutForDeliveryNotification(
            tenantId,
            order.userId,
            notificationData,
          );
        } else if (request.status === 'delivered') {
          await this.shippingNotificationService.sendDeliveredNotification(
            tenantId,
            order.userId,
            notificationData,
          );
        } else {
          await this.shippingNotificationService.sendTrackingUpdateNotification(
            tenantId,
            order.userId,
            notificationData,
            event,
          );
        }
      } catch (notifError) {
        this.logger.warn('Failed to send tracking notification', 'OrdersService', {
          orderId,
          status: request.status,
          error: notifError.message,
        });
      }

      return order;
    } catch (error) {
      this.logger.error('Error updating tracking', error.stack, 'OrdersService');
      throw error;
    }
  }


  /**
   * Cancel order
   */
  async cancelOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    reason?: string,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId || order.userId !== userId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (!this.canCancelOrder(order)) {
        throw new BadRequestException('Este pedido não pode ser cancelado');
      }

      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.updatedAt = new Date();

      if (reason) {
        order.notes = order.notes
          ? `${order.notes}\nMotivo do cancelamento: ${reason}`
          : `Motivo do cancelamento: ${reason}`;
      }

      // Cancel items
      order.items.forEach(item => {
        item.status = 'cancelled';
      });

      // Request refund if paid
      if (order.paymentStatus === 'paid' && order.paymentId) {
        try {
          await this.paymentService.cancelPayment(order.paymentId, reason);
          order.paymentStatus = 'refunded';
        } catch (error) {
          this.logger.warn('Failed to process refund', 'OrdersService', {
            orderId,
            error: error.message,
          });
        }
      }

      await this.saveOrder(order);

      this.logger.debug('Order cancelled', 'OrdersService', { orderId, reason });

      return order;
    } catch (error) {
      this.logger.error('Error cancelling order', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Mark order as delivered
   */
  async markAsDelivered(
    tenantId: string,
    orderId: string,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      order.status = 'delivered';
      order.shippingStatus = 'delivered';
      
      if (order.shippingData) {
        order.shippingData.deliveredAt = new Date();
      }

      order.updatedAt = new Date();

      await this.saveOrder(order);

      return order;
    } catch (error) {
      this.logger.error('Error marking as delivered', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Complete order
   */
  async completeOrder(
    tenantId: string,
    orderId: string,
  ): Promise<Order> {
    try {
      const order = this.orders.get(orderId);

      if (!order || order.tenantId !== tenantId) {
        throw new NotFoundException('Pedido não encontrado');
      }

      order.status = 'completed';
      order.completedAt = new Date();
      order.updatedAt = new Date();

      await this.saveOrder(order);

      this.logger.debug('Order completed', 'OrdersService', { orderId });

      return order;
    } catch (error) {
      this.logger.error('Error completing order', error.stack, 'OrdersService');
      throw error;
    }
  }

  /**
   * Get order statistics for admin
   */
  async getOrderStats(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { status: string; count: number }[];
    ordersByDay: { date: string; count: number; revenue: number }[];
  }> {
    try {
      let orders = Array.from(this.orders.values()).filter(
        o => o.tenantId === tenantId,
      );

      if (dateFrom) {
        orders = orders.filter(o => o.createdAt >= dateFrom);
      }

      if (dateTo) {
        orders = orders.filter(o => o.createdAt <= dateTo);
      }

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Group by status
      const statusCounts = new Map<string, number>();
      orders.forEach(o => {
        statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
      });

      const ordersByStatus = Array.from(statusCounts.entries()).map(
        ([status, count]) => ({ status, count }),
      );

      // Group by day
      const dayCounts = new Map<string, { count: number; revenue: number }>();
      orders.forEach(o => {
        const date = o.createdAt.toISOString().split('T')[0];
        const existing = dayCounts.get(date) || { count: 0, revenue: 0 };
        dayCounts.set(date, {
          count: existing.count + 1,
          revenue: existing.revenue + o.total,
        });
      });

      const ordersByDay = Array.from(dayCounts.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
        ordersByDay,
      };
    } catch (error) {
      this.logger.error('Error getting order stats', error.stack, 'OrdersService');
      throw error;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private generateOrderNumber(tenantId: string): string {
    this.orderCounter++;
    const timestamp = Date.now().toString(36).toUpperCase();
    const counter = this.orderCounter.toString().padStart(6, '0');
    return `${timestamp}${counter}`;
  }

  private mapAddress(address: any): OrderAddress {
    return {
      cep: address.cep || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement,
      neighborhood: address.neighborhood || '',
      city: address.city || '',
      state: address.state || '',
      country: address.country || 'Brasil',
      reference: address.reference,
    };
  }

  private async saveOrder(order: Order): Promise<void> {
    this.orders.set(order.id, order);

    // Update user index
    const userKey = `${order.tenantId}:${order.userId}`;
    const userOrders = this.ordersByUser.get(userKey) || [];
    if (!userOrders.includes(order.id)) {
      userOrders.push(order.id);
      this.ordersByUser.set(userKey, userOrders);
    }

    // Cache for quick access
    await this.cacheManager.set(`order:${order.id}`, order, 3600);
  }

  private canCancelOrder(order: Order): boolean {
    const cancellableStatuses: OrderStatus[] = ['pending', 'paid'];
    return cancellableStatuses.includes(order.status);
  }

  private canReorder(order: Order): boolean {
    const reorderableStatuses: OrderStatus[] = ['completed', 'delivered', 'cancelled'];
    return reorderableStatuses.includes(order.status);
  }

  private isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['paid', 'cancelled'],
      paid: ['production', 'cancelled', 'refunded'],
      production: ['quality_check', 'ready_to_ship'],
      quality_check: ['production', 'ready_to_ship'],
      ready_to_ship: ['shipped'],
      shipped: ['delivered'],
      delivered: ['completed'],
      completed: [],
      cancelled: [],
      refunded: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private buildOrderTimeline(order: Order): OrderTimelineEvent[] {
    const events: OrderTimelineEvent[] = [];

    // Order created
    events.push({
      id: `timeline:${order.id}:created`,
      type: 'status_change',
      title: 'Pedido criado',
      description: `Pedido #${order.orderNumber} foi criado`,
      timestamp: order.createdAt,
      status: 'pending',
    });

    // Payment events
    if (order.paymentStatus === 'paid') {
      events.push({
        id: `timeline:${order.id}:paid`,
        type: 'payment',
        title: 'Pagamento confirmado',
        description: `Pagamento via ${order.paymentMethod} confirmado`,
        timestamp: order.updatedAt,
        status: 'paid',
      });
    }

    // Production events
    if (order.productionData?.startedAt) {
      events.push({
        id: `timeline:${order.id}:production_start`,
        type: 'production',
        title: 'Produção iniciada',
        description: 'Seu pedido está sendo produzido',
        timestamp: order.productionData.startedAt,
        status: 'production',
      });
    }

    if (order.productionData?.completedAt) {
      events.push({
        id: `timeline:${order.id}:production_complete`,
        type: 'production',
        title: 'Produção concluída',
        description: 'Seu pedido foi produzido e está pronto para envio',
        timestamp: order.productionData.completedAt,
        status: 'ready_to_ship',
      });
    }

    // Shipping events
    if (order.shippingData?.trackingEvents) {
      order.shippingData.trackingEvents.forEach((event, index) => {
        events.push({
          id: `timeline:${order.id}:shipping:${index}`,
          type: 'shipping',
          title: event.description,
          description: event.location || '',
          timestamp: event.timestamp,
          status: event.status,
        });
      });
    }

    // Completion
    if (order.completedAt) {
      events.push({
        id: `timeline:${order.id}:completed`,
        type: 'status_change',
        title: 'Pedido concluído',
        description: 'Seu pedido foi entregue com sucesso',
        timestamp: order.completedAt,
        status: 'completed',
      });
    }

    // Cancellation
    if (order.cancelledAt) {
      events.push({
        id: `timeline:${order.id}:cancelled`,
        type: 'status_change',
        title: 'Pedido cancelado',
        description: order.notes || 'Pedido foi cancelado',
        timestamp: order.cancelledAt,
        status: 'cancelled',
      });
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  private calculateOrderStats(orders: Order[]): {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    ordersByStatus: { status: string; count: number }[];
  } {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const statusCounts = new Map<string, number>();
    orders.forEach(o => {
      statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
    });

    const ordersByStatus = Array.from(statusCounts.entries()).map(
      ([status, count]) => ({ status, count }),
    );

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      ordersByStatus,
    };
  }

  private getCarrierName(carrier: string): string {
    const carriers: Record<string, string> = {
      correios: 'Correios',
      sedex: 'Correios SEDEX',
      pac: 'Correios PAC',
      jadlog: 'JadLog',
      loggi: 'Loggi',
      azul_cargo: 'Azul Cargo',
      total_express: 'Total Express',
    };
    return carriers[carrier.toLowerCase()] || carrier;
  }
}
