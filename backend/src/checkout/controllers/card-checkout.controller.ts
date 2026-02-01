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
import { 
  CardIntegrationService, 
  CardPaymentData, 
  CardTokenizationData 
} from '../services/card-integration.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';

class TokenizeCardDto {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

class ProcessCardPaymentDto {
  checkoutId: string;
  cardToken: string;
  installments?: number;
}

@ApiTags('checkout-card')
@Controller('checkout/card')
export class CardCheckoutController {
  constructor(
    private checkoutService: CheckoutService,
    private cardIntegrationService: CardIntegrationService,
  ) {}

  @Post('tokenize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tokenizar dados do cartão' })
  @ApiBody({ type: TokenizeCardDto })
  @ApiResponse({ status: 200, description: 'Cartão tokenizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados do cartão inválidos' })
  async tokenizeCard(
    @Body() body: TokenizeCardDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CardTokenizationData> {
    if (!body.number || !body.holderName || !body.expiryMonth || !body.expiryYear || !body.cvv) {
      throw new BadRequestException('Todos os dados do cartão são obrigatórios');
    }

    return this.cardIntegrationService.tokenizeCard({
      number: body.number.replace(/\D/g, ''), // Remove caracteres não numéricos
      holderName: body.holderName.trim(),
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      cvv: body.cvv,
    });
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processar pagamento com cartão' })
  @ApiBody({ type: ProcessCardPaymentDto })
  @ApiResponse({ status: 200, description: 'Pagamento processado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Checkout não encontrado' })
  async processCardPayment(
    @Body() body: ProcessCardPaymentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CardPaymentData> {
    const userId = user?.id || '';

    if (!body.checkoutId || !body.cardToken) {
      throw new BadRequestException('checkoutId e cardToken são obrigatórios');
    }

    const installments = body.installments || 1;
    if (installments < 1 || installments > 12) {
      throw new BadRequestException('Número de parcelas deve ser entre 1 e 12');
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

    // Validar se método de pagamento é cartão
    if (session.paymentMethod.type !== 'credit_card' && session.paymentMethod.type !== 'debit_card') {
      throw new BadRequestException('Método de pagamento deve ser cartão');
    }

    // Processar pagamento
    return this.cardIntegrationService.processCardPayment(session, body.cardToken, installments);
  }

  @Get('status/:paymentId')
  @ApiOperation({ summary: 'Verificar status do pagamento com cartão' })
  @ApiParam({ name: 'paymentId', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getCardPaymentStatus(
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CardPaymentData> {
    if (!paymentId) {
      throw new BadRequestException('paymentId é obrigatório');
    }

    return this.cardIntegrationService.checkCardPaymentStatus(paymentId);
  }

  @Post('cancel/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pagamento com cartão' })
  @ApiParam({ name: 'paymentId', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado' })
  @ApiResponse({ status: 400, description: 'Erro ao cancelar pagamento' })
  async cancelCardPayment(
    @Param('paymentId') paymentId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!paymentId) {
      throw new BadRequestException('paymentId é obrigatório');
    }

    const success = await this.cardIntegrationService.cancelCardPayment(paymentId);

    return {
      success,
      message: success ? 'Pagamento cancelado com sucesso' : 'Erro ao cancelar pagamento',
    };
  }

  // Endpoint de teste para demonstrar fluxo completo com cartão
  @Post('demo/complete-flow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demonstração completa do fluxo com cartão' })
  @ApiResponse({ status: 200, description: 'Demonstração executada' })
  async demoCompleteCardFlow(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    checkout: any;
    tokenization: CardTokenizationData;
    payment: CardPaymentData;
    paymentStatus: CardPaymentData;
  }> {
    const userId = user?.id || 'demo-user';

    // 1. Criar checkout
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

    // 4. Configurar cartão como método de pagamento
    const updatedCheckout = await this.checkoutService.updatePaymentMethod(
      tenantId,
      userId,
      checkout.id,
      {
        paymentMethod: {
          type: 'credit_card',
          cardData: {
            holderName: 'João Silva',
            number: '4111111111111111', // Número de teste Visa
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            installments: 3,
          },
        },
      },
    );

    // 5. Tokenizar cartão
    const tokenization = await this.cardIntegrationService.tokenizeCard({
      number: '4111111111111111',
      holderName: 'João Silva',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
    });

    // 6. Processar pagamento
    const payment = await this.cardIntegrationService.processCardPayment(
      updatedCheckout,
      tokenization.cardToken,
      3, // 3 parcelas
    );

    // 7. Verificar status
    const paymentStatus = await this.cardIntegrationService.checkCardPaymentStatus(
      payment.paymentId,
    );

    return {
      checkout: updatedCheckout,
      tokenization,
      payment,
      paymentStatus,
    };
  }

  // Endpoint para testar diferentes cenários de cartão
  @Post('test/scenarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar diferentes cenários de pagamento com cartão' })
  @ApiResponse({ status: 200, description: 'Cenários testados' })
  async testCardScenarios(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    validCard: any;
    invalidCard: any;
    expiredCard: any;
    invalidCvv: any;
  }> {
    const scenarios = {
      validCard: null,
      invalidCard: null,
      expiredCard: null,
      invalidCvv: null,
    };

    // Teste 1: Cartão válido
    try {
      scenarios.validCard = await this.cardIntegrationService.tokenizeCard({
        number: '4111111111111111',
        holderName: 'João Silva',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
      });
    } catch (error) {
      scenarios.validCard = { error: error.message };
    }

    // Teste 2: Cartão inválido (número)
    try {
      scenarios.invalidCard = await this.cardIntegrationService.tokenizeCard({
        number: '1234567890123456',
        holderName: 'João Silva',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
      });
    } catch (error) {
      scenarios.invalidCard = { error: error.message };
    }

    // Teste 3: Cartão expirado
    try {
      scenarios.expiredCard = await this.cardIntegrationService.tokenizeCard({
        number: '4111111111111111',
        holderName: 'João Silva',
        expiryMonth: '01',
        expiryYear: '2020',
        cvv: '123',
      });
    } catch (error) {
      scenarios.expiredCard = { error: error.message };
    }

    // Teste 4: CVV inválido
    try {
      scenarios.invalidCvv = await this.cardIntegrationService.tokenizeCard({
        number: '4111111111111111',
        holderName: 'João Silva',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '12', // CVV muito curto
      });
    } catch (error) {
      scenarios.invalidCvv = { error: error.message };
    }

    return scenarios;
  }
}