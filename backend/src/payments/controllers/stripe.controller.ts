import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeService } from '../services/stripe.service';
import { LoggerService } from '../../common/services/logger.service';

// DTOs
class CreatePaymentIntentDto {
  amount: number; // in cents
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerName?: string;
  savePaymentMethod?: boolean;
}

class CreateCheckoutSessionDto {
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
}

class ConfirmPaymentDto {
  paymentIntentId: string;
  paymentMethodId: string;
}

@ApiTags('stripe')
@Controller('payments/stripe')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private logger: LoggerService,
  ) {}

  @Post('payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Payment Intent' })
  @ApiResponse({ status: 201, description: 'Payment Intent created' })
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: any,
  ) {
    const { amount, currency, description, metadata, customerEmail, customerName, savePaymentMethod } = dto;

    // Get or create customer if email provided
    let customerId: string | undefined;
    if (customerEmail) {
      const customer = await this.stripeService.getOrCreateCustomer(
        customerEmail,
        customerName || 'Customer',
        { userId: req.user?.id },
      );
      customerId = customer.id;
    }

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency: currency || 'brl',
      customerId,
      customerEmail,
      customerName,
      description,
      metadata: {
        ...metadata,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
      },
      setupFutureUsage: savePaymentMethod ? 'off_session' : undefined,
    });

    return {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
    };
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Checkout Session' })
  @ApiResponse({ status: 201, description: 'Checkout Session created' })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: any,
  ) {
    const session = await this.stripeService.createCheckoutSession({
      lineItems: dto.items,
      customerEmail: dto.customerEmail,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      mode: 'payment',
      metadata: {
        ...dto.metadata,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a Payment Intent' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    const paymentIntent = await this.stripeService.confirmPaymentIntent(
      dto.paymentIntentId,
      dto.paymentMethodId,
    );

    return {
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    };
  }

  @Get('payment-intent/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Payment Intent status' })
  @ApiResponse({ status: 200, description: 'Payment Intent retrieved' })
  async getPaymentIntent(@Param('id') id: string) {
    const paymentIntent = await this.stripeService.getPaymentIntent(id);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  @Post('payment-intent/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a Payment Intent' })
  @ApiResponse({ status: 200, description: 'Payment cancelled' })
  async cancelPaymentIntent(@Param('id') id: string) {
    const cancelled = await this.stripeService.cancelPaymentIntent(id);
    return { cancelled };
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a refund' })
  @ApiResponse({ status: 201, description: 'Refund created' })
  async createRefund(
    @Body() dto: { paymentIntentId: string; amount?: number; reason?: string },
  ) {
    const refund = await this.stripeService.createRefund(
      dto.paymentIntentId,
      dto.amount,
      dto.reason as any,
    );

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
    };
  }

  @Get('payment-methods/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
  async listPaymentMethods(@Param('customerId') customerId: string) {
    const paymentMethods = await this.stripeService.listPaymentMethods(customerId);

    return paymentMethods.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      const result = await this.stripeService.processWebhookEvent(event);

      this.logger.debug('Stripe webhook processed', 'StripeController', result);

      // TODO: Update order/payment status based on webhook result
      // This would typically emit an event or call another service

      return { received: true, type: result.type };
    } catch (error) {
      this.logger.error('Webhook processing failed', error.stack, 'StripeController');
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
