import { api } from './api';

// Stripe.js types
declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance;
  }
}

interface StripeInstance {
  elements: (options?: any) => StripeElements;
  confirmCardPayment: (clientSecret: string, data?: any) => Promise<StripePaymentResult>;
  confirmPayment: (options: any) => Promise<StripePaymentResult>;
  redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: StripeError }>;
}

interface StripeElements {
  create: (type: string, options?: any) => StripeElement;
}

interface StripeElement {
  mount: (selector: string | HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (event: any) => void) => void;
  update: (options: any) => void;
}

interface StripePaymentResult {
  paymentIntent?: {
    id: string;
    status: string;
  };
  error?: StripeError;
}

interface StripeError {
  type: string;
  code?: string;
  message: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

class StripePaymentService {
  private stripe: StripeInstance | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeElement | null = null;
  private publishableKey: string;

  constructor() {
    // Get from environment or config
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
  }

  /**
   * Initialize Stripe.js
   */
  async initialize(): Promise<void> {
    if (this.stripe) return;

    // Load Stripe.js if not already loaded
    if (!window.Stripe) {
      await this.loadStripeScript();
    }

    if (window.Stripe) {
      this.stripe = window.Stripe(this.publishableKey);
    } else {
      throw new Error('Failed to load Stripe.js');
    }
  }

  private loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="stripe.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Create and mount card element
   */
  mountCardElement(selector: string | HTMLElement, options?: any): StripeElement | null {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      return null;
    }

    this.elements = this.stripe.elements({
      locale: 'pt-BR',
    });

    const style = {
      base: {
        color: '#1f2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    };

    this.cardElement = this.elements.create('card', {
      style,
      hidePostalCode: true,
      ...options,
    });

    this.cardElement.mount(selector);
    return this.cardElement;
  }

  /**
   * Unmount card element
   */
  unmountCardElement(): void {
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
  }

  /**
   * Create Payment Intent on backend
   */
  async createPaymentIntent(data: {
    amount: number;
    currency?: string;
    description?: string;
    customerEmail?: string;
    customerName?: string;
    metadata?: Record<string, string>;
    savePaymentMethod?: boolean;
  }): Promise<CreatePaymentIntentResponse> {
    const response = await api.post('/payments/stripe/payment-intent', {
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency || 'brl',
      description: data.description,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      metadata: data.metadata,
      savePaymentMethod: data.savePaymentMethod,
    });
    return response.data;
  }

  /**
   * Confirm card payment
   */
  async confirmCardPayment(
    clientSecret: string,
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    },
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    if (!this.stripe || !this.cardElement) {
      return { success: false, error: 'Stripe not initialized' };
    }

    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: billingDetails,
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      if (result.paymentIntent?.status === 'succeeded') {
        return { success: true, paymentIntentId: result.paymentIntent.id };
      }

      return { success: false, error: 'Payment not completed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create Checkout Session and redirect
   */
  async createCheckoutSession(data: {
    items: {
      name: string;
      description?: string;
      amount: number;
      quantity: number;
      images?: string[];
    }[];
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CreateCheckoutSessionResponse> {
    const response = await api.post('/payments/stripe/checkout-session', {
      items: data.items.map(item => ({
        ...item,
        amount: Math.round(item.amount * 100), // Convert to cents
      })),
      customerEmail: data.customerEmail,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
      metadata: data.metadata,
    });
    return response.data;
  }

  /**
   * Redirect to Stripe Checkout
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const result = await this.stripe.redirectToCheckout({ sessionId });
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  /**
   * Get Payment Intent status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{
    id: string;
    status: string;
    amount: number;
    currency: string;
  }> {
    const response = await api.get(`/payments/stripe/payment-intent/${paymentIntentId}`);
    return response.data;
  }

  /**
   * Cancel Payment Intent
   */
  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    const response = await api.post(`/payments/stripe/payment-intent/${paymentIntentId}/cancel`);
    return response.data.cancelled;
  }

  /**
   * Request refund
   */
  async requestRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{
    refundId: string;
    status: string;
    amount: number;
  }> {
    const response = await api.post('/payments/stripe/refund', {
      paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
    });
    return response.data;
  }

  /**
   * Get saved payment methods
   */
  async getSavedPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    const response = await api.get(`/payments/stripe/payment-methods/${customerId}`);
    return response.data;
  }
}

export const stripeService = new StripePaymentService();
export default stripeService;
