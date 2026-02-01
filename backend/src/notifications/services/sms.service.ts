import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface SMSMessage {
  to: string; // Número no formato internacional (+5511999999999)
  body: string;
  from?: string; // Número ou ID do remetente
  mediaUrl?: string[]; // Para MMS
  statusCallback?: string; // URL para webhook de status
  validityPeriod?: number; // Tempo de validade em segundos
  scheduledTime?: Date; // Para agendamento
}

export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
  cost?: {
    amount: number;
    currency: string;
  };
}

export interface SMSProviderConfig {
  provider: 'twilio' | 'aws_sns' | 'zenvia' | 'totalvoice' | 'mock';
  
  // Twilio
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  
  // AWS SNS
  sns?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  
  // Zenvia
  zenvia?: {
    apiToken: string;
    from: string;
  };
  
  // TotalVoice
  totalvoice?: {
    accessToken: string;
  };
}

export interface SMSWebhookEvent {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  timestamp: string;
  to: string;
  from: string;
  errorCode?: string;
  errorMessage?: string;
  provider: string;
}

@Injectable()
export class SMSService {
  private config: SMSProviderConfig;

  constructor(private logger: LoggerService) {
    this.config = this.loadSMSConfig();
  }

  async sendSMS(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      this.logger.debug(
        'Enviando SMS',
        'SMSService',
        { to: message.to, provider: this.config.provider },
      );

      // Validar mensagem
      this.validateSMSMessage(message);

      // Enviar baseado no provedor configurado
      let result: SMSDeliveryResult;

      switch (this.config.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(message);
          break;
        case 'aws_sns':
          result = await this.sendViaAWSSNS(message);
          break;
        case 'zenvia':
          result = await this.sendViaZenvia(message);
          break;
        case 'totalvoice':
          result = await this.sendViaTotalVoice(message);
          break;
        case 'mock':
        default:
          result = await this.sendViaMock(message);
          break;
      }

      if (result.success) {
        this.logger.debug(
          'SMS enviado com sucesso',
          'SMSService',
          { messageId: result.messageId, provider: result.provider },
        );
      } else {
        this.logger.error(
          'Falha ao enviar SMS',
          result.error || 'Erro desconhecido',
          'SMSService',
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Erro ao enviar SMS', error.stack, 'SMSService');
      return {
        success: false,
        error: error.message,
        provider: this.config.provider,
        timestamp: new Date(),
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSDeliveryResult[]> {
    try {
      this.logger.debug(
        'Enviando SMS em lote',
        'SMSService',
        { count: messages.length, provider: this.config.provider },
      );

      const results: SMSDeliveryResult[] = [];

      // Processar em paralelo com limite
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(message => this.sendSMS(message))
        );
        results.push(...batchResults);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.debug(
        'Lote de SMS processado',
        'SMSService',
        { total: results.length, success: successCount, failed: failureCount },
      );

      return results;
    } catch (error) {
      this.logger.error('Erro ao enviar SMS em lote', error.stack, 'SMSService');
      throw error;
    }
  }

  async sendOrderConfirmation(
    to: string,
    orderData: {
      customerName: string;
      orderNumber: string;
      total: number;
      currency: string;
    },
  ): Promise<SMSDeliveryResult> {
    const message = `🎉 Pedido ${orderData.orderNumber} confirmado! Total: ${this.formatCurrency(orderData.total, orderData.currency)}. Acompanhe pelo nosso site. Obrigado, ${orderData.customerName}!`;

    return this.sendSMS({
      to,
      body: message,
    });
  }

  async sendOrderStatusUpdate(
    to: string,
    orderData: {
      customerName: string;
      orderNumber: string;
      status: string;
      trackingCode?: string;
    },
  ): Promise<SMSDeliveryResult> {
    let message = `📦 ${orderData.customerName}, seu pedido ${orderData.orderNumber} foi atualizado: ${orderData.status}`;

    if (orderData.trackingCode) {
      message += `. Rastreamento: ${orderData.trackingCode}`;
    }

    return this.sendSMS({
      to,
      body: message,
    });
  }

  async sendCartAbandonedReminder(
    to: string,
    cartData: {
      customerName: string;
      total: number;
      currency: string;
      cartUrl: string;
    },
  ): Promise<SMSDeliveryResult> {
    const message = `🛒 ${cartData.customerName}, você esqueceu itens no carrinho! Total: ${this.formatCurrency(cartData.total, cartData.currency)}. Finalize: ${cartData.cartUrl} e ganhe 10% OFF!`;

    return this.sendSMS({
      to,
      body: message,
    });
  }

  async sendVerificationCode(
    to: string,
    code: string,
    expirationMinutes: number = 5,
  ): Promise<SMSDeliveryResult> {
    const message = `Seu código de verificação é: ${code}. Válido por ${expirationMinutes} minutos. Não compartilhe este código.`;

    return this.sendSMS({
      to,
      body: message,
      validityPeriod: expirationMinutes * 60,
    });
  }

  async sendPasswordReset(
    to: string,
    resetUrl: string,
  ): Promise<SMSDeliveryResult> {
    const message = `🔐 Redefinir senha: ${resetUrl}. Link válido por 1 hora. Se não solicitou, ignore esta mensagem.`;

    return this.sendSMS({
      to,
      body: message,
      validityPeriod: 3600, // 1 hora
    });
  }

  async validatePhoneNumber(phone: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
    country?: string;
  }> {
    try {
      // Validação básica de formato
      const cleaned = phone.replace(/\D/g, '');
      
      // Validar formato brasileiro
      if (cleaned.length === 11 && cleaned.startsWith('11')) {
        return {
          valid: true,
          formatted: `+55${cleaned}`,
          type: 'mobile',
          country: 'BR',
        };
      } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return {
          valid: true,
          formatted: `+${cleaned}`,
          type: 'mobile',
          country: 'BR',
        };
      }

      return {
        valid: false,
      };
    } catch (error) {
      this.logger.error('Erro ao validar número de telefone', error.stack, 'SMSService');
      return {
        valid: false,
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered' | 'unknown';
    timestamp?: Date;
    details?: string;
    cost?: { amount: number; currency: string };
  }> {
    try {
      // TODO: Implementar consulta de status baseada no provedor
      // Por enquanto, retornar status mock
      return {
        status: 'delivered',
        timestamp: new Date(),
        details: 'SMS entregue com sucesso',
        cost: { amount: 0.05, currency: 'BRL' },
      };
    } catch (error) {
      this.logger.error('Erro ao consultar status de entrega', error.stack, 'SMSService');
      return {
        status: 'unknown',
        details: 'Erro ao consultar status',
      };
    }
  }

  async processWebhook(event: SMSWebhookEvent): Promise<void> {
    try {
      this.logger.debug(
        'Processando webhook de SMS',
        'SMSService',
        { messageId: event.messageId, status: event.status },
      );

      // TODO: Atualizar status no banco de dados
      // TODO: Disparar eventos para outros serviços
      // TODO: Processar falhas e retry se necessário

      if (event.status === 'failed') {
        this.logger.warn(
          'SMS falhou na entrega',
          'SMSService',
          { messageId: event.messageId, error: event.errorMessage },
        );
      }
    } catch (error) {
      this.logger.error('Erro ao processar webhook de SMS', error.stack, 'SMSService');
    }
  }

  // Implementações específicas por provedor
  private async sendViaTwilio(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      // TODO: Implementar envio via Twilio
      await this.simulateDelay(300, 1000);

      const success = Math.random() > 0.03; // 97% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `twilio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'twilio',
          timestamp: new Date(),
          cost: { amount: 0.08, currency: 'BRL' },
        };
      } else {
        return {
          success: false,
          error: 'Twilio delivery failed',
          provider: 'twilio',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'twilio',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaAWSSNS(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      // TODO: Implementar envio via AWS SNS
      await this.simulateDelay(200, 800);

      const success = Math.random() > 0.02; // 98% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `sns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'aws_sns',
          timestamp: new Date(),
          cost: { amount: 0.06, currency: 'BRL' },
        };
      } else {
        return {
          success: false,
          error: 'AWS SNS delivery failed',
          provider: 'aws_sns',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'aws_sns',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaZenvia(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      // TODO: Implementar envio via Zenvia
      await this.simulateDelay(400, 1200);

      const success = Math.random() > 0.04; // 96% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `zenvia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'zenvia',
          timestamp: new Date(),
          cost: { amount: 0.07, currency: 'BRL' },
        };
      } else {
        return {
          success: false,
          error: 'Zenvia delivery failed',
          provider: 'zenvia',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'zenvia',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaTotalVoice(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      // TODO: Implementar envio via TotalVoice
      await this.simulateDelay(350, 1100);

      const success = Math.random() > 0.05; // 95% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `totalvoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'totalvoice',
          timestamp: new Date(),
          cost: { amount: 0.09, currency: 'BRL' },
        };
      } else {
        return {
          success: false,
          error: 'TotalVoice delivery failed',
          provider: 'totalvoice',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'totalvoice',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaMock(message: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      await this.simulateDelay(100, 500);

      const success = Math.random() > 0.01; // 99% de sucesso para mock
      
      if (success) {
        return {
          success: true,
          messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'mock',
          timestamp: new Date(),
          cost: { amount: 0.01, currency: 'BRL' },
        };
      } else {
        return {
          success: false,
          error: 'Mock delivery failed',
          provider: 'mock',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'mock',
        timestamp: new Date(),
      };
    }
  }

  // Métodos auxiliares
  private loadSMSConfig(): SMSProviderConfig {
    const provider = (process.env.SMS_PROVIDER || 'mock') as SMSProviderConfig['provider'];

    const config: SMSProviderConfig = { provider };

    switch (provider) {
      case 'twilio':
        config.twilio = {
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          fromNumber: process.env.TWILIO_FROM_NUMBER || '',
        };
        break;

      case 'aws_sns':
        config.sns = {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        };
        break;

      case 'zenvia':
        config.zenvia = {
          apiToken: process.env.ZENVIA_API_TOKEN || '',
          from: process.env.ZENVIA_FROM || '',
        };
        break;

      case 'totalvoice':
        config.totalvoice = {
          accessToken: process.env.TOTALVOICE_ACCESS_TOKEN || '',
        };
        break;
    }

    return config;
  }

  private async validateSMSMessage(message: SMSMessage): Promise<void> {
    if (!message.to) {
      throw new Error('Número de destino é obrigatório');
    }

    if (!message.body || message.body.trim().length === 0) {
      throw new Error('Conteúdo da mensagem é obrigatório');
    }

    if (message.body.length > 1600) {
      throw new Error('Mensagem muito longa (máximo 1600 caracteres)');
    }

    // Validar número de telefone
    const phoneValidation = await this.validatePhoneNumber(message.to);
    if (!phoneValidation.valid) {
      throw new Error('Número de telefone inválido');
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}