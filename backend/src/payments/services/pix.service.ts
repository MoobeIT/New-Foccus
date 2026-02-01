import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { PixData, Payment } from '../entities/payment.entity';
import { createHash, randomBytes } from 'crypto';

export interface PixPaymentRequest {
  amount: number;
  description: string;
  payerName: string;
  payerDocument: string;
  payerEmail: string;
  orderId: string;
  expirationMinutes?: number;
}

export interface PixPaymentResponse {
  txId: string;
  qrCode: string;
  qrCodeBase64: string;
  pixKey: string;
  expiresAt: Date;
  amount: number;
}

export interface PixWebhookData {
  txId: string;
  endToEndId: string;
  amount: number;
  status: 'paid' | 'failed' | 'cancelled';
  paidAt?: Date;
  payerDocument?: string;
  payerName?: string;
}

@Injectable()
export class PixService {
  private readonly PIX_EXPIRATION_MINUTES = 30;
  private readonly PIX_KEY = 'pix@empresa.com.br'; // Chave PIX da empresa

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    try {
      this.logger.debug(
        `Criando pagamento PIX: R$ ${request.amount}`,
        'PixService',
        { orderId: request.orderId, amount: request.amount },
      );

      // Validar entrada
      this.validatePixRequest(request);

      // Gerar identificadores únicos
      const txId = this.generateTxId();
      const expirationMinutes = request.expirationMinutes || this.PIX_EXPIRATION_MINUTES;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      // Usar mock para desenvolvimento
      if (this.configService.get('features.mockPayments')) {
        return this.createMockPixPayment(request, txId, expiresAt);
      }

      // Integrar com gateway real (ex: PagSeguro, Mercado Pago, etc.)
      const gatewayResponse = await this.callPixGateway(request, txId, expiresAt);

      // Gerar QR Code
      const qrCodeData = this.generatePixQRCode(request, txId);
      const qrCodeBase64 = await this.generateQRCodeImage(qrCodeData);

      const response: PixPaymentResponse = {
        txId,
        qrCode: qrCodeData,
        qrCodeBase64,
        pixKey: this.PIX_KEY,
        expiresAt,
        amount: request.amount,
      };

      // Salvar no cache para consulta posterior
      await this.cacheManager.set(`pix:${txId}`, {
        ...response,
        orderId: request.orderId,
        status: 'pending',
      }, expirationMinutes * 60);

      this.logger.debug(
        `PIX criado com sucesso: ${txId}`,
        'PixService',
        { txId, expiresAt },
      );

      return response;
    } catch (error) {
      this.logger.error(
        'Erro ao criar pagamento PIX',
        error.stack,
        'PixService',
        { request },
      );
      throw error;
    }
  }

  async getPixPaymentStatus(txId: string): Promise<{
    status: string;
    paidAt?: Date;
    endToEndId?: string;
  }> {
    try {
      // Verificar cache primeiro
      const cachedPayment = await this.cacheManager.get(`pix:${txId}`);
      
      if (cachedPayment && (cachedPayment as any).status !== 'pending') {
        return {
          status: (cachedPayment as any).status,
          paidAt: (cachedPayment as any).paidAt,
          endToEndId: (cachedPayment as any).endToEndId,
        };
      }

      // Consultar gateway se não estiver no cache ou ainda pendente
      if (this.configService.get('features.mockPayments')) {
        return this.getMockPixStatus(txId);
      }

      const gatewayStatus = await this.queryPixGateway(txId);
      
      // Atualizar cache com novo status
      if (cachedPayment) {
        await this.cacheManager.set(`pix:${txId}`, {
          ...(cachedPayment as any),
          status: gatewayStatus.status,
          paidAt: gatewayStatus.paidAt,
          endToEndId: gatewayStatus.endToEndId,
        }, 3600); // 1 hora para status final
      }

      return gatewayStatus;
    } catch (error) {
      this.logger.error('Erro ao consultar status PIX', error.stack, 'PixService');
      throw error;
    }
  }

  async processPixWebhook(webhookData: PixWebhookData): Promise<boolean> {
    try {
      this.logger.debug(
        `Processando webhook PIX: ${webhookData.txId}`,
        'PixService',
        { status: webhookData.status, amount: webhookData.amount },
      );

      // Validar webhook
      if (!this.validatePixWebhook(webhookData)) {
        this.logger.warn('Webhook PIX inválido', 'PixService', { webhookData });
        return false;
      }

      // Atualizar cache
      const cachedPayment = await this.cacheManager.get(`pix:${webhookData.txId}`);
      
      if (cachedPayment) {
        await this.cacheManager.set(`pix:${webhookData.txId}`, {
          ...(cachedPayment as any),
          status: webhookData.status,
          paidAt: webhookData.paidAt,
          endToEndId: webhookData.endToEndId,
        }, 3600);
      }

      this.logger.debug(
        `Webhook PIX processado: ${webhookData.txId}`,
        'PixService',
        { status: webhookData.status },
      );

      return true;
    } catch (error) {
      this.logger.error('Erro ao processar webhook PIX', error.stack, 'PixService');
      return false;
    }
  }

  async cancelPixPayment(txId: string): Promise<boolean> {
    try {
      // Usar mock para desenvolvimento
      if (this.configService.get('features.mockPayments')) {
        return this.cancelMockPixPayment(txId);
      }

      // Cancelar no gateway
      const cancelled = await this.cancelPixGateway(txId);

      if (cancelled) {
        // Atualizar cache
        const cachedPayment = await this.cacheManager.get(`pix:${txId}`);
        if (cachedPayment) {
          await this.cacheManager.set(`pix:${txId}`, {
            ...(cachedPayment as any),
            status: 'cancelled',
          }, 3600);
        }
      }

      return cancelled;
    } catch (error) {
      this.logger.error('Erro ao cancelar PIX', error.stack, 'PixService');
      return false;
    }
  }

  private validatePixRequest(request: PixPaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    if (request.amount > 100000) {
      throw new Error('Valor máximo para PIX é R$ 100.000');
    }

    if (!request.payerDocument || !this.isValidDocument(request.payerDocument)) {
      throw new Error('Documento do pagador inválido');
    }

    if (!request.payerEmail || !this.isValidEmail(request.payerEmail)) {
      throw new Error('Email do pagador inválido');
    }

    if (!request.description || request.description.length < 5) {
      throw new Error('Descrição deve ter pelo menos 5 caracteres');
    }
  }

  private generateTxId(): string {
    // Gerar ID único para transação PIX
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `PIX${timestamp}${random}`.toUpperCase();
  }

  private generatePixQRCode(request: PixPaymentRequest, txId: string): string {
    // Gerar payload PIX EMV (simplificado)
    // Em produção, usar biblioteca específica para PIX
    const payload = {
      pixKey: this.PIX_KEY,
      merchantName: 'EMPRESA LTDA',
      merchantCity: 'SAO PAULO',
      amount: request.amount.toFixed(2),
      txId: txId,
      description: request.description,
    };

    // Simular payload EMV
    return `00020126580014BR.GOV.BCB.PIX0136${this.PIX_KEY}0208${txId}520400005303986540${payload.amount}5802BR5913${payload.merchantName}6009${payload.merchantCity}62070503***6304`;
  }

  private async generateQRCodeImage(qrCodeData: string): Promise<string> {
    // TODO: Implementar geração real de QR Code
    // Por enquanto, retornar base64 mock
    return this.generateMockQRCodeBase64(qrCodeData);
  }

  private async callPixGateway(
    request: PixPaymentRequest,
    txId: string,
    expiresAt: Date,
  ): Promise<any> {
    // TODO: Implementar integração real com gateway
    // Ex: PagSeguro, Mercado Pago, Asaas, etc.
    return {
      success: true,
      gatewayTxId: txId,
      status: 'pending',
    };
  }

  private async queryPixGateway(txId: string): Promise<any> {
    // TODO: Implementar consulta real ao gateway
    return {
      status: 'pending',
      paidAt: null,
      endToEndId: null,
    };
  }

  private async cancelPixGateway(txId: string): Promise<boolean> {
    // TODO: Implementar cancelamento real no gateway
    return true;
  }

  private validatePixWebhook(webhookData: PixWebhookData): boolean {
    return !!(
      webhookData.txId &&
      webhookData.amount &&
      webhookData.status &&
      ['paid', 'failed', 'cancelled'].includes(webhookData.status)
    );
  }

  private isValidDocument(document: string): boolean {
    const cleanDoc = document.replace(/\D/g, '');
    return cleanDoc.length === 11 || cleanDoc.length === 14; // CPF ou CNPJ
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Métodos mock para desenvolvimento
  private async createMockPixPayment(
    request: PixPaymentRequest,
    txId: string,
    expiresAt: Date,
  ): Promise<PixPaymentResponse> {
    const qrCodeData = this.generatePixQRCode(request, txId);
    const qrCodeBase64 = this.generateMockQRCodeBase64(qrCodeData);

    return {
      txId,
      qrCode: qrCodeData,
      qrCodeBase64,
      pixKey: this.PIX_KEY,
      expiresAt,
      amount: request.amount,
    };
  }

  private async getMockPixStatus(txId: string): Promise<any> {
    // Simular diferentes status baseado no ID
    const hash = createHash('md5').update(txId).digest('hex');
    const lastChar = hash.slice(-1);

    if (['0', '1', '2'].includes(lastChar)) {
      return {
        status: 'paid',
        paidAt: new Date(),
        endToEndId: `E${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      };
    } else if (['3', '4'].includes(lastChar)) {
      return {
        status: 'failed',
        paidAt: null,
        endToEndId: null,
      };
    } else {
      return {
        status: 'pending',
        paidAt: null,
        endToEndId: null,
      };
    }
  }

  private async cancelMockPixPayment(txId: string): Promise<boolean> {
    // Simular cancelamento sempre bem-sucedido
    return true;
  }

  private generateMockQRCodeBase64(qrCodeData: string): string {
    // Gerar base64 mock de um QR Code
    // Em produção, usar biblioteca como 'qrcode'
    const mockQRCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
    return mockQRCode;
  }

  // Método para obter estatísticas PIX
  async getPixStats(tenantId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    averageAmount: number;
  }> {
    // TODO: Implementar consulta real ao banco
    return {
      totalTransactions: 0,
      totalAmount: 0,
      successRate: 0,
      averageAmount: 0,
    };
  }

  // Método para configurar chave PIX
  async setPixKey(tenantId: string, pixKey: string): Promise<void> {
    // TODO: Implementar configuração de chave PIX por tenant
    this.logger.debug(`Chave PIX configurada para tenant ${tenantId}`, 'PixService');
  }
}