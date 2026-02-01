import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { PixService, PixPaymentRequest } from './pix.service';
import { PricingService } from '../../pricing/services/pricing.service';
import { Payment, PaymentMethod, PaymentStatus, PaymentMethodData } from '../entities/payment.entity';

export interface CreatePaymentRequest {
  tenantId: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  
  // Dados do pagador
  payer: {
    name: string;
    email: string;
    document: string;
    phone?: string;
  };
  
  // Dados específicos do método
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
  
  // Metadados adicionais
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  payment: Payment;
  paymentData?: {
    pix?: {
      qrCode: string;
      qrCodeBase64: string;
      expiresAt: Date;
    };
    creditCard?: {
      authorizationCode: string;
      installments: number;
    };
    boleto?: {
      barcodeNumber: string;
      digitableLine: string;
      boletoUrl: string;
    };
  };
}

@Injectable()
export class PaymentService {
  constructor(
    private pixService: PixService,
    private pricingService: PricingService,
    private logger: LoggerService,
  ) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    try {
      this.logger.debug(
        `Criando pagamento: ${request.method} - R$ ${request.amount}`,
        'PaymentService',
        { 
          orderId: request.orderId, 
          method: request.method, 
          amount: request.amount 
        },
      );

      // Validar entrada
      this.validatePaymentRequest(request);

      // Criar pagamento baseado no método
      switch (request.method) {
        case 'pix':
          return this.createPixPayment(request);
        case 'credit_card':
          return this.createCreditCardPayment(request);
        case 'boleto':
          return this.createBoletoPayment(request);
        default:
          throw new BadRequestException(`Método de pagamento não suportado: ${request.method}`);
      }
    } catch (error) {
      this.logger.error(
        'Erro ao criar pagamento',
        error.stack,
        'PaymentService',
        { request },
      );
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<{
    status: PaymentStatus;
    paidAt?: Date;
    metadata?: Record<string, any>;
  }> {
    try {
      // TODO: Buscar pagamento no banco de dados
      // Por enquanto, simular consulta
      
      const payment = await this.findPaymentById(paymentId);
      
      if (!payment) {
        throw new BadRequestException('Pagamento não encontrado');
      }

      // Consultar status atualizado baseado no método
      let updatedStatus = payment.status;
      let paidAt = payment.paidAt;
      let metadata = payment.metadata;

      if (payment.method === 'pix' && payment.status === 'pending') {
        const pixStatus = await this.pixService.getPixPaymentStatus(payment.gatewayId!);
        updatedStatus = this.mapPixStatusToPaymentStatus(pixStatus.status);
        paidAt = pixStatus.paidAt;
        
        if (pixStatus.endToEndId) {
          metadata = { ...metadata, endToEndId: pixStatus.endToEndId };
        }
      }

      return {
        status: updatedStatus,
        paidAt,
        metadata,
      };
    } catch (error) {
      this.logger.error('Erro ao consultar status do pagamento', error.stack, 'PaymentService');
      throw error;
    }
  }

  async cancelPayment(paymentId: string, reason: string): Promise<boolean> {
    try {
      const payment = await this.findPaymentById(paymentId);
      
      if (!payment) {
        throw new BadRequestException('Pagamento não encontrado');
      }

      if (!['pending', 'processing'].includes(payment.status)) {
        throw new BadRequestException('Pagamento não pode ser cancelado');
      }

      let cancelled = false;

      // Cancelar baseado no método
      switch (payment.method) {
        case 'pix':
          cancelled = await this.pixService.cancelPixPayment(payment.gatewayId!);
          break;
        case 'credit_card':
          cancelled = await this.cancelCreditCardPayment(payment);
          break;
        case 'boleto':
          cancelled = await this.cancelBoletoPayment(payment);
          break;
      }

      if (cancelled) {
        // TODO: Atualizar status no banco
        this.logger.debug(
          `Pagamento cancelado: ${paymentId}`,
          'PaymentService',
          { reason },
        );
      }

      return cancelled;
    } catch (error) {
      this.logger.error('Erro ao cancelar pagamento', error.stack, 'PaymentService');
      throw error;
    }
  }

  async processWebhook(
    method: PaymentMethod,
    webhookData: any,
    signature?: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Processando webhook: ${method}`,
        'PaymentService',
        { method },
      );

      // Processar baseado no método
      switch (method) {
        case 'pix':
          return this.pixService.processPixWebhook(webhookData);
        case 'credit_card':
          return this.processCreditCardWebhook(webhookData, signature);
        case 'boleto':
          return this.processBoletoWebhook(webhookData, signature);
        default:
          this.logger.warn(`Webhook não suportado: ${method}`, 'PaymentService');
          return false;
      }
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error.stack, 'PaymentService');
      return false;
    }
  }

  private async createPixPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const pixRequest: PixPaymentRequest = {
      amount: request.amount,
      description: request.description,
      payerName: request.payer.name,
      payerDocument: request.payer.document,
      payerEmail: request.payer.email,
      orderId: request.orderId,
      expirationMinutes: request.methodData?.pix?.expirationMinutes,
    };

    const pixResponse = await this.pixService.createPixPayment(pixRequest);

    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: request.tenantId,
      orderId: request.orderId,
      userId: request.userId,
      amount: request.amount,
      currency: request.currency,
      method: 'pix',
      status: 'pending',
      methodData: {
        pix: {
          qrCode: pixResponse.qrCode,
          qrCodeBase64: pixResponse.qrCodeBase64,
          pixKey: pixResponse.pixKey,
          txId: pixResponse.txId,
          expiresAt: pixResponse.expiresAt,
        },
      },
      gatewayId: pixResponse.txId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: pixResponse.expiresAt,
      metadata: request.metadata || {},
    };

    // TODO: Salvar no banco de dados

    return {
      payment,
      paymentData: {
        pix: {
          qrCode: pixResponse.qrCode,
          qrCodeBase64: pixResponse.qrCodeBase64,
          expiresAt: pixResponse.expiresAt,
        },
      },
    };
  }

  private async createCreditCardPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    // TODO: Implementar pagamento com cartão de crédito
    throw new BadRequestException('Pagamento com cartão ainda não implementado');
  }

  private async createBoletoPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    // TODO: Implementar pagamento com boleto
    throw new BadRequestException('Pagamento com boleto ainda não implementado');
  }

  private async findPaymentById(paymentId: string): Promise<Payment | null> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retornar mock
    return {
      id: paymentId,
      tenantId: 'mock-tenant',
      orderId: 'mock-order',
      userId: 'mock-user',
      amount: 100.00,
      currency: 'BRL',
      method: 'pix',
      status: 'pending',
      methodData: {},
      gatewayId: 'mock-gateway-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
  }

  private mapPixStatusToPaymentStatus(pixStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': 'pending',
      'paid': 'paid',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'expired',
    };

    return statusMap[pixStatus] || 'pending';
  }

  private async cancelCreditCardPayment(payment: Payment): Promise<boolean> {
    // TODO: Implementar cancelamento de cartão
    return false;
  }

  private async cancelBoletoPayment(payment: Payment): Promise<boolean> {
    // TODO: Implementar cancelamento de boleto
    return false;
  }

  private async processCreditCardWebhook(webhookData: any, signature?: string): Promise<boolean> {
    // TODO: Implementar processamento de webhook de cartão
    return false;
  }

  private async processBoletoWebhook(webhookData: any, signature?: string): Promise<boolean> {
    // TODO: Implementar processamento de webhook de boleto
    return false;
  }

  private validatePaymentRequest(request: CreatePaymentRequest): void {
    if (!request.tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }

    if (!request.userId) {
      throw new BadRequestException('User ID é obrigatório');
    }

    if (!request.orderId) {
      throw new BadRequestException('Order ID é obrigatório');
    }

    if (!request.amount || request.amount <= 0) {
      throw new BadRequestException('Valor deve ser maior que zero');
    }

    if (!request.currency) {
      throw new BadRequestException('Moeda é obrigatória');
    }

    if (!request.method) {
      throw new BadRequestException('Método de pagamento é obrigatório');
    }

    if (!request.payer?.name) {
      throw new BadRequestException('Nome do pagador é obrigatório');
    }

    if (!request.payer?.email) {
      throw new BadRequestException('Email do pagador é obrigatório');
    }

    if (!request.payer?.document) {
      throw new BadRequestException('Documento do pagador é obrigatório');
    }

    if (!request.description) {
      throw new BadRequestException('Descrição é obrigatória');
    }
  }

  // Método para obter estatísticas de pagamentos
  async getPaymentStats(tenantId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    successRate: number;
    methodBreakdown: Record<PaymentMethod, number>;
  }> {
    // TODO: Implementar consulta real ao banco
    return {
      totalPayments: 0,
      totalAmount: 0,
      successRate: 0,
      methodBreakdown: {
        pix: 0,
        credit_card: 0,
        debit_card: 0,
        boleto: 0,
        bank_transfer: 0,
      },
    };
  }
}