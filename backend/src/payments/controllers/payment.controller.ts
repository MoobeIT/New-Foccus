import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaymentService, CreatePaymentRequest, PaymentResult } from '../services/payment.service';
import { PixService } from '../services/pix.service';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';

class CreatePaymentDto {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  
  payer: {
    name: string;
    email: string;
    document: string;
    phone?: string;
  };
  
  methodData?: {
    pix?: {
      expirationMinutes?: number;
    };
    creditCard?: {
      cardToken: string;
      installments: number;
      holderName: string;
    };
    boleto?: {
      expirationDays?: number;
    };
  };
  
  description: string;
  metadata?: Record<string, any>;
}

class CreatePixPaymentDto {
  orderId: string;
  amount: number;
  description: string;
  payerName: string;
  payerDocument: string;
  payerEmail: string;
  expirationMinutes?: number;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private pixService: PixService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pagamento' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createPayment(
    @Body() body: CreatePaymentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<PaymentResult> {
    const request: CreatePaymentRequest = {
      tenantId,
      userId: user.id,
      ...body,
    };

    return this.paymentService.createPayment(request);
  }

  @Post('pix')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pagamento PIX' })
  @ApiBody({ type: CreatePixPaymentDto })
  @ApiResponse({ status: 201, description: 'PIX criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createPixPayment(
    @Body() body: CreatePixPaymentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<PaymentResult> {
    const request: CreatePaymentRequest = {
      tenantId,
      userId: user.id,
      orderId: body.orderId,
      amount: body.amount,
      currency: 'BRL',
      method: 'pix',
      payer: {
        name: body.payerName,
        email: body.payerEmail,
        document: body.payerDocument,
      },
      methodData: {
        pix: {
          expirationMinutes: body.expirationMinutes,
        },
      },
      description: body.description,
    };

    return this.paymentService.createPayment(request);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Consultar status do pagamento' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getPaymentStatus(
    @Param('id') paymentId: string,
  ): Promise<{
    status: PaymentStatus;
    paidAt?: Date;
    metadata?: Record<string, any>;
  }> {
    return this.paymentService.getPaymentStatus(paymentId);
  }

  @Delete(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado' })
  @ApiResponse({ status: 400, description: 'Pagamento não pode ser cancelado' })
  async cancelPayment(
    @Param('id') paymentId: string,
    @Body() body: { reason: string },
  ): Promise<{ success: boolean }> {
    if (!body.reason) {
      throw new BadRequestException('Motivo do cancelamento é obrigatório');
    }

    const success = await this.paymentService.cancelPayment(paymentId, body.reason);
    return { success };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de pagamentos' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos pagamentos' })
  async getPaymentStats(
    @CurrentTenant() tenantId: string,
  ): Promise<{
    totalPayments: number;
    totalAmount: number;
    successRate: number;
    methodBreakdown: Record<PaymentMethod, number>;
  }> {
    return this.paymentService.getPaymentStats(tenantId);
  }

  // Endpoints específicos para PIX
  @Get('pix/:txId/status')
  @ApiOperation({ summary: 'Consultar status PIX por txId' })
  @ApiResponse({ status: 200, description: 'Status do PIX' })
  async getPixStatus(
    @Param('txId') txId: string,
  ): Promise<{
    status: string;
    paidAt?: Date;
    endToEndId?: string;
  }> {
    return this.pixService.getPixPaymentStatus(txId);
  }

  @Delete('pix/:txId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar PIX' })
  @ApiResponse({ status: 200, description: 'PIX cancelado' })
  async cancelPix(
    @Param('txId') txId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.pixService.cancelPixPayment(txId);
    return { success };
  }

  @Get('pix/stats')
  @ApiOperation({ summary: 'Estatísticas PIX' })
  @ApiResponse({ status: 200, description: 'Estatísticas PIX' })
  async getPixStats(
    @CurrentTenant() tenantId: string,
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    averageAmount: number;
  }> {
    return this.pixService.getPixStats(tenantId);
  }

  // Endpoint para teste de pagamentos
  @Post('test/pix')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar PIX de teste' })
  @ApiResponse({ status: 201, description: 'PIX de teste criado' })
  async createTestPix(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ): Promise<PaymentResult> {
    const testRequest: CreatePaymentRequest = {
      tenantId,
      userId: user.id,
      orderId: `test_order_${Date.now()}`,
      amount: 50.00,
      currency: 'BRL',
      method: 'pix',
      payer: {
        name: 'João da Silva',
        email: 'joao@exemplo.com',
        document: '12345678901',
        phone: '11999999999',
      },
      methodData: {
        pix: {
          expirationMinutes: 30,
        },
      },
      description: 'Pagamento de teste PIX',
      metadata: {
        test: true,
        environment: 'development',
      },
    };

    return this.paymentService.createPayment(testRequest);
  }

  // Endpoint para configurar chave PIX
  @Post('pix/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configurar chave PIX do tenant' })
  @ApiResponse({ status: 200, description: 'Chave PIX configurada' })
  async configurePixKey(
    @Body() body: { pixKey: string },
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean }> {
    if (!body.pixKey) {
      throw new BadRequestException('Chave PIX é obrigatória');
    }

    await this.pixService.setPixKey(tenantId, body.pixKey);
    return { success: true };
  }

  // Endpoint para simular pagamento (desenvolvimento)
  @Post(':id/simulate-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular pagamento (desenvolvimento)' })
  @ApiResponse({ status: 200, description: 'Pagamento simulado' })
  async simulatePayment(
    @Param('id') paymentId: string,
    @Body() body: { status: 'paid' | 'failed' },
  ): Promise<{ success: boolean }> {
    // TODO: Implementar simulação de pagamento para testes
    // Por enquanto, apenas retornar sucesso
    return { success: true };
  }
}