import api from './api';

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
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
  cardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    installments: number;
  };
}

export interface CheckoutSession {
  id: string;
  customer: CustomerData;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethodData;
  orderSummary: {
    items: any[];
    subtotal: number;
    discounts: number;
    taxes: number;
    shipping: number;
    total: number;
    shippingMethod?: any;
  };
  status: string;
}

export interface CheckoutCompletionResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  paymentData?: any;
  redirectUrl?: string;
  errors?: any[];
}

class CheckoutService {
  async startCheckout(params: { cartId?: string; items?: any[] }): Promise<CheckoutSession> {
    const response = await api.post('/checkout/start', params);
    return response.data;
  }

  async getSession(checkoutId: string): Promise<CheckoutSession> {
    const response = await api.get(`/checkout/${checkoutId}`);
    return response.data;
  }

  async updateCustomer(checkoutId: string, customer: Partial<CustomerData>): Promise<CheckoutSession> {
    const response = await api.patch(`/checkout/${checkoutId}/customer`, { customer });
    return response.data;
  }

  async updateAddress(
    checkoutId: string, 
    data: { 
      shippingAddress?: Address; 
      billingAddress?: Address;
      sameAsShipping?: boolean;
    }
  ): Promise<CheckoutSession> {
    const response = await api.patch(`/checkout/${checkoutId}/address`, data);
    return response.data;
  }

  async updatePaymentMethod(checkoutId: string, paymentMethod: PaymentMethodData): Promise<CheckoutSession> {
    const response = await api.patch(`/checkout/${checkoutId}/payment`, { paymentMethod });
    return response.data;
  }

  async applyCoupon(checkoutId: string, couponCode: string): Promise<CheckoutSession> {
    const response = await api.post(`/checkout/${checkoutId}/coupon`, { couponCode });
    return response.data;
  }

  async removeCoupon(checkoutId: string): Promise<CheckoutSession> {
    const response = await api.delete(`/checkout/${checkoutId}/coupon`);
    return response.data;
  }

  async selectShippingMethod(checkoutId: string, shippingMethodId: string): Promise<CheckoutSession> {
    const response = await api.patch(`/checkout/${checkoutId}/shipping`, { shippingMethodId });
    return response.data;
  }

  async getShippingOptions(checkoutId: string): Promise<any[]> {
    const response = await api.get(`/checkout/${checkoutId}/shipping-options`);
    return response.data;
  }

  async completeCheckout(
    checkoutId: string, 
    data: { acceptedTerms: boolean; marketingConsent?: boolean }
  ): Promise<CheckoutCompletionResult> {
    const response = await api.post(`/checkout/${checkoutId}/complete`, data);
    return response.data;
  }

  async cancelCheckout(checkoutId: string): Promise<void> {
    await api.delete(`/checkout/${checkoutId}`);
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
