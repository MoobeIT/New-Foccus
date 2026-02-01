export interface Order {
  id: string;
  orderNumber: string;
  tenantId: string;
  userId: string;
  
  // Status e fluxo
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  shippingStatus: ShippingStatus;
  
  // Dados do cliente
  customer: OrderCustomer;
  
  // Endereços
  billingAddress: OrderAddress;
  shippingAddress: OrderAddress;
  
  // Itens do pedido
  items: OrderItem[];
  
  // Valores
  subtotal: number;
  discounts: number;
  taxes: number;
  shipping: number;
  total: number;
  currency: string;
  
  // Pagamento
  paymentId?: string;
  paymentMethod: string;
  paymentData?: Record<string, any>;
  
  // Produção e entrega
  productionData?: ProductionData;
  shippingData?: ShippingData;
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Configurações
  notes?: string;
  internalNotes?: string;
  metadata?: Record<string, any>;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  projectId?: string;
  projectName?: string;
  
  quantity: number;
  pages?: number;
  customizations?: Record<string, any>;
  
  unitPrice: number;
  totalPrice: number;
  
  // Status específico do item
  status: OrderItemStatus;
  productionStatus?: string;
  
  // Arquivos de produção
  productionFiles?: ProductionFile[];
  
  // Metadados
  metadata?: Record<string, any>;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
  
  // Para pessoa jurídica
  companyName?: string;
  stateRegistration?: string;
}

export interface OrderAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  reference?: string;
}

export interface ProductionData {
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  productionNotes?: string;
  qualityCheck?: QualityCheck;
  files?: ProductionFile[];
}

export interface ProductionFile {
  id: string;
  type: 'pdf' | 'image' | 'proof';
  filename: string;
  url: string;
  size: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface QualityCheck {
  status: 'pending' | 'approved' | 'rejected';
  checkedAt?: Date;
  checkedBy?: string;
  notes?: string;
  issues?: QualityIssue[];
}

export interface QualityIssue {
  type: 'color' | 'resolution' | 'content' | 'layout' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
}

export interface ShippingData {
  carrier: string;
  service: string;
  trackingCode?: string;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  
  // Eventos de rastreamento
  trackingEvents?: TrackingEvent[];
  
  // Dados da transportadora
  carrierData?: Record<string, any>;
}

export interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Enums
export type OrderStatus = 
  | 'pending'           // Aguardando pagamento
  | 'paid'              // Pago, aguardando produção
  | 'production'        // Em produção
  | 'quality_check'     // Verificação de qualidade
  | 'ready_to_ship'     // Pronto para envio
  | 'shipped'           // Enviado
  | 'delivered'         // Entregue
  | 'completed'         // Concluído
  | 'cancelled'         // Cancelado
  | 'refunded';         // Reembolsado

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type ProductionStatus = 
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'quality_check'
  | 'approved'
  | 'rejected'
  | 'completed';

export type ShippingStatus = 
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returned';

export type OrderItemStatus = 
  | 'pending'
  | 'production'
  | 'completed'
  | 'cancelled';

// DTOs para requests
export interface CreateOrderRequest {
  checkoutId: string;
  paymentId: string;
  notes?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  notes?: string;
  internalNotes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateOrderItemRequest {
  status?: OrderItemStatus;
  productionStatus?: string;
  metadata?: Record<string, any>;
}

export interface AddTrackingRequest {
  trackingCode: string;
  carrier: string;
  service: string;
  estimatedDelivery?: Date;
}

export interface UpdateTrackingRequest {
  status: string;
  description: string;
  location?: string;
  timestamp?: Date;
}

export interface ReorderRequest {
  orderId: string;
  items?: string[]; // IDs dos itens a serem reordenados
  modifications?: Record<string, any>;
}

// Responses
export interface OrderSummaryResponse {
  orders: OrderSummary[];
  total: number;
  hasMore: boolean;
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    ordersByStatus: { status: string; count: number }[];
  };
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: Date;
  estimatedDelivery?: Date;
  trackingCode?: string;
  canCancel: boolean;
  canReorder: boolean;
  thumbnailUrl?: string;
}

export interface OrderDetailsResponse extends Order {
  timeline: OrderTimelineEvent[];
  canCancel: boolean;
  canReorder: boolean;
  canDownloadInvoice: boolean;
  canTrack: boolean;
  relatedOrders?: OrderSummary[];
}

export interface OrderTimelineEvent {
  id: string;
  type: 'status_change' | 'payment' | 'production' | 'shipping' | 'note';
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
  metadata?: Record<string, any>;
}

export interface OrderFilters {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  productId?: string;
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface OrderSearchRequest {
  query: string;
  filters?: OrderFilters;
}