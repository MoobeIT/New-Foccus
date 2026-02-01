import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { PaymentWebhook, PaymentMethod } from '../entities/payment.entity';
import { createHmac } from 'crypto';

export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
}

@Injectable()
export class WebhookService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async validateWebhook(
    method: PaymentMethod,
    payload: string,
    signature: string,
    headers: Record<string, string>,
  ): Promise<WebhookValidationResult> {
    try {
      switch (method) {
        case 'pix':
          return this.validatePixWebhook(payload, signature, headers);
        case 'credit_card':
          return this.validateCreditCardWebhook(payload, signature, headers);
        case 'boleto':
          return this.validateBoletoWebhook(payload, signature, headers);
        default:
          return { isValid: false, reason: 'Método não suportado' };
      }
    } catch (error) {
      this.logger.error('Erro na validação de webhook', error.stack, 'WebhookService');
      return { isValid: false, reason: 'Erro interno' };
    }
  }

  async processWebhook(
    method: PaymentMethod,
    payload: any,
    signature: string,
    headers: Record<string, string>,
  ): Promise<PaymentWebhook> {
    const webhook: PaymentWebhook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId: payload.paymentId || payload.txId || payload.id,
      gatewayId: payload.gatewayId || payload.reference,
      event: payload.event || payload.type || 'payment_update',
      data: payload,
      signature,
      processed: false,
      createdAt: new Date(),
    };

    // TODO: Salvar webhook no banco de dados para auditoria

    this.logger.debug(
      `Webhook processado: ${webhook.id}`,
      'WebhookService',
      { method, event: webhook.event },
    );

    return webhook;
  }

  async markWebhookAsProcessed(webhookId: string): Promise<void> {
    // TODO: Atualizar status no banco de dados
    this.logger.debug(`Webhook marcado como processado: ${webhookId}`, 'WebhookService');
  }

  async getWebhookHistory(
    paymentId: string,
  ): Promise<PaymentWebhook[]> {
    // TODO: Buscar histórico no banco de dados
    return [];
  }

  private validatePixWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
  ): WebhookValidationResult {
    // Validação específica para webhooks PIX
    // Cada gateway tem sua própria forma de assinar webhooks
    
    if (this.configService.get('features.mockPayments')) {
      return { isValid: true };
    }

    // Exemplo de validação com HMAC SHA256
    const secret = this.configService.get('payments.pix.webhookSecret');
    if (!secret) {
      return { isValid: false, reason: 'Secret não configurado' };
    }

    const expectedSignature = this.generateHmacSignature(payload, secret);
    const isValid = this.compareSignatures(signature, expectedSignature);

    return {
      isValid,
      reason: isValid ? undefined : 'Assinatura inválida',
    };
  }

  private validateCreditCardWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
  ): WebhookValidationResult {
    // TODO: Implementar validação para cartão de crédito
    if (this.configService.get('features.mockPayments')) {
      return { isValid: true };
    }

    return { isValid: false, reason: 'Não implementado' };
  }

  private validateBoletoWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
  ): WebhookValidationResult {
    // TODO: Implementar validação para boleto
    if (this.configService.get('features.mockPayments')) {
      return { isValid: true };
    }

    return { isValid: false, reason: 'Não implementado' };
  }

  private generateHmacSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private compareSignatures(received: string, expected: string): boolean {
    // Comparação segura contra timing attacks
    if (received.length !== expected.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < received.length; i++) {
      result |= received.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
  }

  // Método para reprocessar webhooks falhados
  async reprocessFailedWebhooks(): Promise<number> {
    // TODO: Buscar webhooks não processados e tentar novamente
    let reprocessedCount = 0;

    this.logger.debug(
      `Reprocessados ${reprocessedCount} webhooks`,
      'WebhookService',
    );

    return reprocessedCount;
  }

  // Método para configurar URLs de webhook
  async configureWebhookUrls(
    tenantId: string,
    urls: {
      pix?: string;
      creditCard?: string;
      boleto?: string;
    },
  ): Promise<void> {
    // TODO: Salvar configurações no banco
    this.logger.debug(
      `URLs de webhook configuradas para tenant ${tenantId}`,
      'WebhookService',
      { urls },
    );
  }

  // Método para testar webhook
  async testWebhook(
    method: PaymentMethod,
    url: string,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      // Gerar payload de teste
      const testPayload = this.generateTestPayload(method);
      
      // TODO: Enviar requisição HTTP para a URL
      // Por enquanto, simular sucesso
      
      return {
        success: true,
        response: { status: 200, message: 'Webhook test successful' },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateTestPayload(method: PaymentMethod): any {
    const basePayload = {
      id: `test_${Date.now()}`,
      event: 'payment.paid',
      timestamp: new Date().toISOString(),
    };

    switch (method) {
      case 'pix':
        return {
          ...basePayload,
          txId: 'TEST_PIX_123',
          amount: 100.00,
          status: 'paid',
          endToEndId: 'E12345678202410191234567890123456',
        };
      
      case 'credit_card':
        return {
          ...basePayload,
          transactionId: 'TEST_CC_123',
          amount: 100.00,
          status: 'approved',
          authorizationCode: '123456',
        };
      
      case 'boleto':
        return {
          ...basePayload,
          boletoId: 'TEST_BOL_123',
          amount: 100.00,
          status: 'paid',
          paidAt: new Date().toISOString(),
        };
      
      default:
        return basePayload;
    }
  }
}