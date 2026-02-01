import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CheckoutService } from '../services/checkout.service';
import { PixIntegrationService, PixCheckoutData, PixPaymentStatus } from '../services/pix-integration.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';

class CreatePixPaymentDto {
  checkoutId: string;
}

class PixWebhookDto {
  paymentId: string;
  status: string;
  amount?: number;
  paidAt?: string;
  payer?: {
    name?: string;
    document?: string;
  };
}

@ApiTags('checkout-pix')
@Controller('checkout/pix')
export class PixCheckoutController {
  constructor(
    private checkoutService: CheckoutService,
    private pixIntegrationService: PixIntegrationService,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Criar pagamento PIX para checkout' })
  @ApiBody({ type: CreatePixPaymentDto })
  @ApiResponse({ status: 200, description: 'Pagamento PIX criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Checkout não encontrado' })
  async createPixPayment(
    @Body() body: CreatePixPaymentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<PixCheckoutData> {
    const userId = user?.id || '';

    if (!body.checkoutId) {
      throw new BadRequestException('checkoutId é obrigatório');
    }

    // Buscar sessão de checkout
    const session = await this.checkoutService.getCheckoutSession(
      tenantId,
      userId,
      body.checkoutId,
    );

    // Validar se checkout está pronto para pagamento
    if (session.status !== 'payment_method' && session.status !== 'review') {
      throw new BadRequestException('Checkout não está pronto para pagamento');
    }

    // Validar se método de pagamento é PIX
    if (session.paymentMethod.type !== 'pix') {
      throw new BadRequestException('Método de pagamento deve ser PIX');
    }

    // Criar pagamento PIX
    return this.pixIntegrationService.createPixPayment(session);
  }

  @Get('status/:paymentId')
  @ApiOperation({ summary: 'Verificar status do pagamento PIX' })
  @ApiParam({ name: 'paymentId', description: 'ID do pagamento PIX' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getPixPaymentStatus(
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<PixPaymentStatus> {
    if (!paymentId) {
      throw new BadRequestException('paymentId é obrigatório');
    }

    return this.pixIntegrationService.checkPixPaymentStatus(paymentId);
  }

  @Post('cancel/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pagamento PIX' })
  @ApiParam({ name: 'paymentId', description: 'ID do pagamento PIX' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado' })
  @ApiResponse({ status: 400, description: 'Erro ao cancelar pagamento' })
  async cancelPixPayment(
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!paymentId) {
      throw new BadRequestException('paymentId é obrigatório');
    }

    const success = await this.pixIntegrationService.cancelPixPayment(paymentId);

    return {
      success,
      message: success ? 'Pagamento cancelado com sucesso' : 'Erro ao cancelar pagamento',
    };
  }

  // Webhook público para receber confirmações PIX
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook para confirmação de pagamento PIX' })
  @ApiBody({ type: PixWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handlePixWebhook(@Body() body: PixWebhookDto): Promise<{ received: boolean }> {
    if (!body.paymentId || !body.status) {
      throw new BadRequestException('paymentId e status são obrigatórios');
    }

    await this.pixIntegrationService.handlePixWebhook(body);

    return { received: true };
  }

  // Endpoint de teste para simular pagamento PIX
  @Post('test/simulate-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular confirmação de pagamento PIX (apenas teste)' })
  @ApiResponse({ status: 200, description: 'Pagamento simulado' })
  async simulatePixPayment(
    @Body() body: { paymentId: string },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!body.paymentId) {
      throw new BadRequestException('paymentId é obrigatório');
    }

    // Simular webhook de confirmação
    await this.pixIntegrationService.handlePixWebhook({
      paymentId: body.paymentId,
      status: 'paid',
      amount: 100.00,
      paidAt: new Date().toISOString(),
      payer: {
        name: 'João Silva',
        document: '12345678901',
      },
    });

    return {
      success: true,
      message: 'Pagamento PIX simulado com sucesso',
    };
  }

  // Endpoint para demonstração completa do fluxo PIX
  @Post('demo/complete-flow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demonstração completa do fluxo PIX' })
  @ApiResponse({ status: 200, description: 'Demonstração executada' })
  async demoCompletePixFlow(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    checkout: any;
    pixPayment: PixCheckoutData;
    paymentStatus: PixPaymentStatus;
    simulatedConfirmation: any;
  }> {
    const userId = user?.id || 'demo-user';

    // 1. Criar checkout com PIX
    const checkout = await this.checkoutService.startCheckout(tenantId, userId, {
      items: [
        {
          productId: 'demo-fotolivro',
          quantity: 1,
          pages: 20,
        },
      ],
    });

    // 2. Configurar dados do cliente
    await this.checkoutService.updateCustomerData(tenantId, userId, checkout.id, {
      customer: {
        email: 'demo@exemplo.com',
        firstName: 'João',
        lastName: 'Silva',
        phone: '11999999999',
        document: '12345678901',
        documentType: 'cpf',
      },
    });

    // 3. Configurar endereço
    await this.checkoutService.updateAddress(tenantId, userId, checkout.id, {
      shippingAddress: {
        cep: '01310-100',
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
      },
      sameAsShipping: true,
    });

    // 4. Configurar PIX como método de pagamento
    const updatedCheckout = await this.checkoutService.updatePaymentMethod(
      tenantId,
      userId,
      checkout.id,
      {
        paymentMethod: {
          type: 'pix',
          pixData: {
            pixKey: 'demo@exemplo.com',
            pixKeyType: 'email',
          },
        },
      },
    );

    // 5. Criar pagamento PIX
    const pixPayment = await this.pixIntegrationService.createPixPayment(updatedCheckout);

    // 6. Verificar status inicial
    const paymentStatus = await this.pixIntegrationService.checkPixPaymentStatus(
      pixPayment.paymentId,
    );

    // 7. Simular confirmação de pagamento
    const simulatedConfirmation = await this.pixIntegrationService.handlePixWebhook({
      paymentId: pixPayment.paymentId,
      status: 'paid',
      amount: updatedCheckout.orderSummary.total,
      paidAt: new Date().toISOString(),
      payer: {
        name: 'João Silva',
        document: '12345678901',
      },
    });

    return {
      checkout: updatedCheckout,
      pixPayment,
      paymentStatus,
      simulatedConfirmation,
    };
  }
}