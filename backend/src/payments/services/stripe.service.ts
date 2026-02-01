import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { LoggerService } from '../../common/services/logger.service';

export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentRequest {
  amount: number; // in cents
  currency: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  setupFutureUsage?: 'on_session' | 'off_session';
  receiptEmail?: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface CreateCheckoutSessionRequest {
  lineItems: {
    name: string;
    description?: string;
    amount: number; // in cents
    quantity: number;
    images?: string[];
  }[];
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'payment' | 'subscription';
  metadata?: Record<string, string>;
  shippingAddressCollection?: {
    allowedCountries: string[];
  };
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
  paymentIntentId?: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    if (!apiKey) {
      this.logger.warn('Stripe API key not configured', 'StripeService');
      // Use test key for development
      this.stripe = new Stripe('sk_test_placeholder', {
        apiVersion: '2023-10-16',
      });
    } else {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async getOrCreateCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<StripeCustomer> {
    try {
      // Search for existing customer
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        this.logger.debug(`Found existing Stripe customer: ${customer.id}`, 'StripeService');
        return {
          id: customer.id,
          email: customer.email || email,
          name: customer.name || name,
          metadata: customer.metadata as Record<string, string>,
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      this.logger.debug(`Created new Stripe customer: ${customer.id}`, 'StripeService');

      return {
        id: customer.id,
        email: customer.email || email,
        name: customer.name || name,
        metadata: customer.metadata as Record<string, string>,
      };
    } catch (error) {
      this.logger.error('Error creating/retrieving Stripe customer', error.stack, 'StripeService');
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Create a Payment Intent for direct card payments
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResult> {
    try {
      this.logger.debug('Creating Stripe Payment Intent', 'StripeService', {
        amount: request.amount,
        currency: request.currency,
      });

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        payment_method_types: request.paymentMethodTypes || ['card'],
        description: request.description,
        metadata: request.metadata,
        receipt_email: request.receiptEmail,
      };

      if (request.customerId) {
        paymentIntentParams.customer = request.customerId;
      }

      if (request.setupFutureUsage) {
        paymentIntentParams.setup_future_usage = request.setupFutureUsage;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      this.logger.debug(`Payment Intent created: ${paymentIntent.id}`, 'StripeService');

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      this.logger.error('Error creating Payment Intent', error.stack, 'StripeService');
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Create a Checkout Session for hosted payment page
   */
  async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSessionResult> {
    try {
      this.logger.debug('Creating Stripe Checkout Session', 'StripeService');

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = request.lineItems.map(item => ({
        price_data: {
          currency: 'brl',
          product_data: {
            name: item.name,
            description: item.description,
            images: item.images,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      }));

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: request.mode,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        metadata: request.metadata,
      };

      if (request.customerId) {
        sessionParams.customer = request.customerId;
      } else if (request.customerEmail) {
        sessionParams.customer_email = request.customerEmail;
      }

      if (request.shippingAddressCollection) {
        sessionParams.shipping_address_collection = {
          allowed_countries: (request.shippingAddressCollection.allowedCountries || ['BR']) as any,
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.debug(`Checkout Session created: ${session.id}`, 'StripeService');

      return {
        id: session.id,
        url: session.url!,
        paymentIntentId: session.payment_intent as string,
      };
    } catch (error) {
      this.logger.error('Error creating Checkout Session', error.stack, 'StripeService');
      throw new BadRequestException(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Retrieve Payment Intent status
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Error retrieving Payment Intent', error.stack, 'StripeService');
      throw new BadRequestException('Payment not found');
    }
  }

  /**
   * Confirm a Payment Intent (server-side confirmation)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      this.logger.error('Error confirming Payment Intent', error.stack, 'StripeService');
      throw new BadRequestException(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Cancel a Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      this.logger.debug(`Payment Intent cancelled: ${paymentIntentId}`, 'StripeService');
      return true;
    } catch (error) {
      this.logger.error('Error cancelling Payment Intent', error.stack, 'StripeService');
      return false;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);
      this.logger.debug(`Refund created: ${refund.id}`, 'StripeService');
      return refund;
    } catch (error) {
      this.logger.error('Error creating refund', error.stack, 'StripeService');
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Verify and construct webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.stack, 'StripeService');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: Stripe.Event): Promise<{
    type: string;
    paymentIntentId?: string;
    status?: string;
    metadata?: Record<string, string>;
  }> {
    this.logger.debug(`Processing Stripe webhook: ${event.type}`, 'StripeService');

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment_succeeded',
          paymentIntentId: paymentIntent.id,
          status: 'paid',
          metadata: paymentIntent.metadata as Record<string, string>,
        };
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment_failed',
          paymentIntentId: paymentIntent.id,
          status: 'failed',
          metadata: paymentIntent.metadata as Record<string, string>,
        };
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          type: 'payment_canceled',
          paymentIntentId: paymentIntent.id,
          status: 'cancelled',
          metadata: paymentIntent.metadata as Record<string, string>,
        };
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: 'checkout_completed',
          paymentIntentId: session.payment_intent as string,
          status: 'paid',
          metadata: session.metadata as Record<string, string>,
        };
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        return {
          type: 'refund_completed',
          paymentIntentId: charge.payment_intent as string,
          status: 'refunded',
          metadata: charge.metadata as Record<string, string>,
        };
      }

      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`, 'StripeService');
        return { type: event.type };
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      this.logger.error('Error listing payment methods', error.stack, 'StripeService');
      return [];
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      this.logger.error('Error attaching payment method', error.stack, 'StripeService');
      throw new BadRequestException('Failed to save payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      this.logger.error('Error detaching payment method', error.stack, 'StripeService');
      return false;
    }
  }
}
