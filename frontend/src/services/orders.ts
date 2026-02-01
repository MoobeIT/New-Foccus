import api from './api';

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  productionStatus: string;
  shippingStatus: string;
  items: OrderItem[];
  subtotal: number;
  discounts: number;
  taxes: number;
  shipping: number;
  total: number;
  currency: string;
  customer: any;
  shippingAddress: any;
  shippingData?: any;
  createdAt: Date;
  updatedAt: Date;
  timeline?: TimelineEvent[];
  canCancel?: boolean;
  canReorder?: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
}

export interface OrderFilters {
  status?: string[];
  paymentStatus?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  hasMore: boolean;
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    ordersByStatus: { status: string; count: number }[];
  };
}

class OrdersService {
  async listOrders(filters?: OrderFilters): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.paymentStatus?.length) params.set('paymentStatus', filters.paymentStatus.join(','));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.offset) params.set('offset', filters.offset.toString());
    }

    const response = await api.get(`/orders?${params.toString()}`);
    return response.data;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order> {
    const response = await api.get(`/orders/number/${orderNumber}`);
    return response.data;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  }

  async getTracking(orderId: string): Promise<any> {
    const response = await api.get(`/orders/${orderId}/tracking`);
    return response.data;
  }

  async reorder(orderId: string): Promise<{ cartId: string }> {
    const response = await api.post(`/orders/${orderId}/reorder`);
    return response.data;
  }

  async downloadInvoice(orderId: string): Promise<Blob> {
    const response = await api.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const ordersService = new OrdersService();
export default ordersService;
