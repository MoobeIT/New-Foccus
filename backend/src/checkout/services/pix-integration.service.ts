import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { PixService } from '../../payments/services/pix.service';
import { CheckoutSession } from '../entities/checkout.entity';

export interface PixCheckoutData {
  qrCode: string;
  qrCodeBase64: string;
  pixKey: string;
  amount: number;
  description: string;
  expiresAt: Date;
  paymentId: string;
  instructions: string[];
}

export interface PixPaymentStatus {
  paymentId: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paidAt?: Date;
  amount?: number;
  payer?: {
    name?: string;
    document?: string;
  };
}

@Injectable()
export class PixIntegrationService {
  constructor(
    private pixService: PixService,
    private logger: LoggerService,
  ) {}

  async createPixPayment(session: CheckoutSession): Promise<PixCheckoutData> {
    try {
      this.logger.debug(
        'Criando pagamento PIX para checkout',
        'PixIntegrationService',
        { checkoutId: session.id, amount: session.orderSummary.total },
      );

      // Criar pagamento PIX
      const pixPayment = await this.pixService.createPixPayment({
        amount: session.orderSummary.total,
        description: `Pedido ${session.id} - ${session.orderSummary.items.length} itens`,
        payerName: `${session.customer.firstName} ${session.customer.lastName}`,
        payerDocument: session.customer.document,
        payerEmail: session.customer.email,
        orderId: session.id,
        expirationMinutes: 30,
      });

      // Gerar QR Code
      const qrCodeData = await this.generateQRCode(pixPayment);

      const pixCheckoutData: PixCheckoutData = {
        qrCode: qrCodeData.qrCode,
        qrCodeBase64: qrCodeData.qrCodeBase64,
        pixKey: pixPayment.pixKey,
        amount: session.orderSummary.total,
        description: `Pedido ${session.id}`,
        expiresAt: pixPayment.expiresAt,
        paymentId: pixPayment.txId,
        instructions: this.generatePixInstructions(session, pixPayment),
      };

      this.logger.debug(
        'Pagamento PIX criado com sucesso',
        'PixIntegrationService',
        { paymentId: pixPayment.txId, expiresAt: pixPayment.expiresAt },
      );

      return pixCheckoutData;
    } catch (error) {
      this.logger.error('Erro ao criar pagamento PIX', error.stack, 'PixIntegrationService');
      throw error;
    }
  }

  async checkPixPaymentStatus(paymentId: string): Promise<PixPaymentStatus> {
    try {
      const payment = await this.pixService.getPixPaymentStatus(paymentId);

      return {
        paymentId: paymentId,
        status: payment.status as any,
        paidAt: payment.paidAt,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar status do pagamento PIX', error.stack, 'PixIntegrationService');
      throw error;
    }
  }

  async cancelPixPayment(paymentId: string): Promise<boolean> {
    try {
      const result = await this.pixService.cancelPixPayment(paymentId);
      
      this.logger.debug(
        'Pagamento PIX cancelado',
        'PixIntegrationService',
        { paymentId },
      );

      return result;
    } catch (error) {
      this.logger.error('Erro ao cancelar pagamento PIX', error.stack, 'PixIntegrationService');
      return false;
    }
  }

  private async generateQRCode(pixPayment: any): Promise<{ qrCode: string; qrCodeBase64: string }> {
    // Gerar string PIX EMV
    const pixString = this.generatePixEMVString(pixPayment);
    
    // Gerar QR Code base64 (simulado - em produção usar biblioteca como qrcode)
    const qrCodeBase64 = await this.generateQRCodeBase64(pixString);

    return {
      qrCode: pixString,
      qrCodeBase64,
    };
  }

  private generatePixEMVString(pixPayment: any): string {
    // Formato EMV simplificado para PIX
    // Em produção, usar biblioteca específica para gerar EMV correto
    const merchantName = 'LOJA EXEMPLO';
    const merchantCity = 'SAO PAULO';
    const pixKey = pixPayment.pixKey;
    const amount = pixPayment.amount.toFixed(2);
    const txId = pixPayment.id.substring(0, 25);

    // Estrutura EMV básica (simplificada)
    const emvData = [
      '00020126', // Payload Format Indicator
      '580014BR.GOV.BCB.PIX', // Merchant Account Information
      `0114${pixKey}`, // PIX Key
      '52040000', // Merchant Category Code
      '5303986', // Transaction Currency (BRL)
      `54${amount.length.toString().padStart(2, '0')}${amount}`, // Transaction Amount
      '5802BR', // Country Code
      `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`, // Merchant Name
      `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`, // Merchant City
      `62${(4 + txId.length).toString().padStart(2, '0')}05${txId.length.toString().padStart(2, '0')}${txId}`, // Additional Data Field
    ].join('');

    // Calcular CRC16 (simplificado)
    const crc = this.calculateCRC16(emvData + '6304');
    
    return emvData + '6304' + crc;
  }

  private calculateCRC16(data: string): string {
    // CRC16-CCITT simplificado
    // Em produção, usar implementação completa
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  private async generateQRCodeBase64(pixString: string): Promise<string> {
    // Simulação de QR Code base64
    // Em produção, usar biblioteca como 'qrcode'
    const mockQRCode = Buffer.from(`QR_CODE_${pixString.substring(0, 50)}`).toString('base64');
    return `data:image/png;base64,${mockQRCode}`;
  }

  private generatePixInstructions(session: CheckoutSession, pixPayment: any): string[] {
    const expirationTime = new Date(pixPayment.expiresAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return [
      '1. Abra o app do seu banco ou carteira digital',
      '2. Procure pela opção PIX',
      '3. Escaneie o QR Code ou copie e cole o código PIX',
      `4. Confirme o pagamento de R$ ${session.orderSummary.total.toFixed(2)}`,
      `5. O pagamento expira às ${expirationTime}`,
      '6. Após o pagamento, você receberá a confirmação por email',
    ];
  }

  // Método para webhook de confirmação PIX
  async handlePixWebhook(webhookData: any): Promise<void> {
    try {
      this.logger.debug(
        'Processando webhook PIX',
        'PixIntegrationService',
        { paymentId: webhookData.paymentId, status: webhookData.status },
      );

      // TODO: Atualizar status do checkout/pedido
      // TODO: Enviar notificação para o cliente
      // TODO: Disparar processo de produção se pagamento confirmado

      if (webhookData.status === 'paid') {
        this.logger.debug(
          'Pagamento PIX confirmado',
          'PixIntegrationService',
          { paymentId: webhookData.paymentId, amount: webhookData.amount },
        );
      }
    } catch (error) {
      this.logger.error('Erro ao processar webhook PIX', error.stack, 'PixIntegrationService');
      throw error;
    }
  }
}