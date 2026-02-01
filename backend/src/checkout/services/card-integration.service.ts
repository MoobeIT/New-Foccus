import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { PaymentService } from '../../payments/services/payment.service';
import { CheckoutSession } from '../entities/checkout.entity';

export interface CardPaymentData {
  paymentId: string;
  status: 'pending' | 'approved' | 'declined' | 'processing';
  authorizationCode?: string;
  transactionId?: string;
  installments: number;
  installmentAmount: number;
  totalAmount: number;
  approvedAt?: Date;
  declineReason?: string;
  receipt?: {
    merchantName: string;
    cardMask: string;
    authCode: string;
    transactionId: string;
    amount: number;
    installments: number;
    date: Date;
  };
}

export interface CardTokenizationData {
  cardToken: string;
  cardMask: string;
  cardBrand: string;
  expiresAt: Date;
}

@Injectable()
export class CardIntegrationService {
  constructor(
    private paymentService: PaymentService,
    private logger: LoggerService,
  ) {}

  async tokenizeCard(cardData: {
    number: string;
    holderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  }): Promise<CardTokenizationData> {
    try {
      this.logger.debug(
        'Tokenizando cartão',
        'CardIntegrationService',
        { holderName: cardData.holderName, lastFour: cardData.number.slice(-4) },
      );

      // Validar dados do cartão
      this.validateCardData(cardData);

      // Simular tokenização (em produção, usar gateway real)
      const cardToken = this.generateCardToken();
      const cardMask = this.maskCardNumber(cardData.number);
      const cardBrand = this.detectCardBrand(cardData.number);

      const tokenData: CardTokenizationData = {
        cardToken,
        cardMask,
        cardBrand,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      };

      this.logger.debug(
        'Cartão tokenizado com sucesso',
        'CardIntegrationService',
        { cardToken, cardMask, cardBrand },
      );

      return tokenData;
    } catch (error) {
      this.logger.error('Erro ao tokenizar cartão', error.stack, 'CardIntegrationService');
      throw error;
    }
  }

  async processCardPayment(
    session: CheckoutSession,
    cardToken: string,
    installments: number = 1,
  ): Promise<CardPaymentData> {
    try {
      this.logger.debug(
        'Processando pagamento com cartão',
        'CardIntegrationService',
        { 
          checkoutId: session.id, 
          amount: session.orderSummary.total,
          installments,
        },
      );

      // Validar dados
      if (!cardToken) {
        throw new BadRequestException('Token do cartão é obrigatório');
      }

      if (installments < 1 || installments > 12) {
        throw new BadRequestException('Número de parcelas deve ser entre 1 e 12');
      }

      // Calcular valor das parcelas
      const installmentAmount = session.orderSummary.total / installments;

      // Criar pagamento via PaymentService
      const paymentResult = await this.paymentService.createPayment({
        tenantId: session.tenantId,
        userId: session.userId,
        orderId: session.id,
        amount: session.orderSummary.total,
        currency: session.orderSummary.currency,
        method: 'credit_card',
        payer: {
          name: `${session.customer.firstName} ${session.customer.lastName}`,
          email: session.customer.email,
          document: session.customer.document,
          phone: session.customer.phone,
        },
        methodData: {
          creditCard: {
            cardToken,
            installments,
            holderName: `${session.customer.firstName} ${session.customer.lastName}`,
          },
        },
        description: `Pedido ${session.id} - ${session.orderSummary.items.length} itens`,
        metadata: {
          checkoutId: session.id,
          installments,
          installmentAmount,
        },
      });

      // Simular processamento (em produção, aguardar resposta do gateway)
      const cardPaymentData: CardPaymentData = {
        paymentId: paymentResult.payment.id,
        status: this.simulateCardApproval() ? 'approved' : 'declined',
        authorizationCode: this.generateAuthCode(),
        transactionId: this.generateTransactionId(),
        installments,
        installmentAmount,
        totalAmount: session.orderSummary.total,
        approvedAt: new Date(),
        receipt: {
          merchantName: 'LOJA EXEMPLO',
          cardMask: '****-****-****-1234', // Buscar do token
          authCode: this.generateAuthCode(),
          transactionId: this.generateTransactionId(),
          amount: session.orderSummary.total,
          installments,
          date: new Date(),
        },
      };

      if (cardPaymentData.status === 'declined') {
        cardPaymentData.declineReason = 'Cartão recusado pelo banco emissor';
        cardPaymentData.approvedAt = undefined;
        cardPaymentData.receipt = undefined;
      }

      this.logger.debug(
        'Pagamento com cartão processado',
        'CardIntegrationService',
        { 
          paymentId: cardPaymentData.paymentId,
          status: cardPaymentData.status,
          installments,
        },
      );

      return cardPaymentData;
    } catch (error) {
      this.logger.error('Erro ao processar pagamento com cartão', error.stack, 'CardIntegrationService');
      throw error;
    }
  }

  async checkCardPaymentStatus(paymentId: string): Promise<CardPaymentData> {
    try {
      // Buscar status via PaymentService
      const paymentStatus = await this.paymentService.getPaymentStatus(paymentId);

      return {
        paymentId: paymentId,
        status: paymentStatus.status as any,
        authorizationCode: paymentStatus.metadata?.authCode,
        transactionId: paymentStatus.metadata?.transactionId,
        installments: paymentStatus.metadata?.installments || 1,
        installmentAmount: (paymentStatus.metadata?.amount || 0) / (paymentStatus.metadata?.installments || 1),
        totalAmount: paymentStatus.metadata?.amount || 0,
        approvedAt: paymentStatus.paidAt,
        declineReason: paymentStatus.metadata?.errorMessage,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar status do pagamento', error.stack, 'CardIntegrationService');
      throw error;
    }
  }

  async cancelCardPayment(paymentId: string): Promise<boolean> {
    try {
      // Cancelar via PaymentService
      await this.paymentService.cancelPayment(paymentId, 'Cancelado pelo usuário');
      
      this.logger.debug(
        'Pagamento com cartão cancelado',
        'CardIntegrationService',
        { paymentId },
      );

      return true;
    } catch (error) {
      this.logger.error('Erro ao cancelar pagamento', error.stack, 'CardIntegrationService');
      return false;
    }
  }

  private validateCardData(cardData: {
    number: string;
    holderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  }): void {
    // Validar número do cartão (Luhn algorithm)
    if (!this.isValidCardNumber(cardData.number)) {
      throw new BadRequestException('Número do cartão inválido');
    }

    // Validar nome do portador
    if (!cardData.holderName || cardData.holderName.trim().length < 2) {
      throw new BadRequestException('Nome do portador inválido');
    }

    // Validar data de validade
    const month = parseInt(cardData.expiryMonth);
    const year = parseInt(cardData.expiryYear);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) {
      throw new BadRequestException('Mês de validade inválido');
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new BadRequestException('Cartão expirado');
    }

    // Validar CVV
    if (!cardData.cvv || !/^\d{3,4}$/.test(cardData.cvv)) {
      throw new BadRequestException('CVV inválido');
    }
  }

  private isValidCardNumber(cardNumber: string): boolean {
    // Algoritmo de Luhn
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  private detectCardBrand(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(digits)) return 'visa';
    if (/^5[1-5]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^6(?:011|5)/.test(digits)) return 'discover';
    if (/^(?:2131|1800|35\d{3})\d{11}$/.test(digits)) return 'jcb';
    
    return 'unknown';
  }

  private maskCardNumber(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    const firstFour = digits.substring(0, 4);
    const lastFour = digits.substring(digits.length - 4);
    return `${firstFour}****${lastFour}`;
  }

  private generateCardToken(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuthCode(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private simulateCardApproval(): boolean {
    // 90% de aprovação para simulação
    return Math.random() > 0.1;
  }
}