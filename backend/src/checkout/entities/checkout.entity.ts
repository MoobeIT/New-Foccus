export interface CheckoutSession {
  id: string;
  tenantId: string;
  userId: string;
  cartId: string;
  
  // Dados do cliente
  customer: CustomerData;
  
  // Endereços
  billingAddress: Address;
  shippingAddress: Address;
  sameAsShipping: boolean;
  
  // Método de pagamento
  paymentMethod: PaymentMethodData;
  
  // Resumo do pedido
  orderSummary: OrderSummary;
  
  // Status e metadados
  status: CheckoutStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  
  // Configurações
  acceptedTerms: boolean;
  marketingConsent: boolean;
  
  // Dados de rastreamento
  sessionData?: Record<string, any>;
}

export interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  document: string; // CPF/CNPJ
  documentType: 'cpf' | 'cnpj';
  birthDate?: string;
  
  // Para pessoa jurídica
  companyName?: string;
  tradeName?: string;
  stateRegistration?: string;
}

export interface Address {
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

export interface PaymentMethodData {
  type: 'pix' | 'credit_card' | 'debit_card' | 'bank_slip';
  
  // Para cartão
  cardData?: {
    holderName: string;
    number: string; // Tokenizado
    expiryMonth: string;
    expiryYear: string;
    cvv: string; // Tokenizado
    installments: number;
  };
  
  // Para PIX
  pixData?: {
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  };
}

export interface OrderSummary {
  items: CheckoutItem[];
  subtotal: number;
  discounts: number;
  taxes: number;
  shipping: number;
  total: number;
  currency: string;
  
  // Detalhes de frete
  shippingMethod?: ShippingMethod;
  
  // Cupons aplicados
  appliedCoupons: AppliedCoupon[];
}

export interface CheckoutItem {
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
  
  // Preview/thumbnail
  thumbnailUrl?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
  carrier: string;
}

export interface AppliedCoupon {
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
}

export type CheckoutStatus = 
  | 'draft' 
  | 'customer_info' 
  | 'shipping_address' 
  | 'payment_method' 
  | 'review' 
  | 'processing' 
  | 'completed' 
  | 'expired' 
  | 'cancelled';

// DTOs para requests
export interface StartCheckoutRequest {
  cartId?: string;
  items?: {
    productId: string;
    variantId?: string;
    projectId?: string;
    quantity: number;
    pages?: number;
    customizations?: Record<string, any>;
  }[];
}

export interface UpdateCustomerDataRequest {
  customer: Partial<CustomerData>;
}

export interface UpdateAddressRequest {
  billingAddress?: Address;
  shippingAddress?: Address;
  sameAsShipping?: boolean;
}

export interface UpdatePaymentMethodRequest {
  paymentMethod: PaymentMethodData;
}

export interface ApplyCouponRequest {
  couponCode: string;
}

export interface SelectShippingMethodRequest {
  shippingMethodId: string;
}

export interface CompleteCheckoutRequest {
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

// Responses
export interface CheckoutValidationResult {
  isValid: boolean;
  errors: CheckoutValidationError[];
  warnings: CheckoutValidationWarning[];
}

export interface CheckoutValidationError {
  field: string;
  code: string;
  message: string;
  details?: any;
}

export interface CheckoutValidationWarning {
  field: string;
  code: string;
  message: string;
  details?: any;
}

export interface CheckoutCompletionResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  paymentData?: any; // QR Code PIX, etc.
  redirectUrl?: string;
  errors?: CheckoutValidationError[];
}