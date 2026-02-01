export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  userId: string;
  
  // Dados do pagamento
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Dados específicos do método
  methodData: PaymentMethodData;
  
  // Dados do gateway
  gatewayId?: string;
  gatewayResponse?: any;
  
  // Datas importantes
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  paidAt?: Date;
  
  // Metadados
  metadata: Record<string, any>;
}

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'bank_transfer';

export type PaymentStatus = 
  | 'pending'
  | 'processing' 
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentMethodData {
  pix?: PixData;
  creditCard?: CreditCardData;
  debitCard?: DebitCardData;
  boleto?: BoletoData;
  bankTransfer?: BankTransferData;
}

export interface PixData {
  qrCode: string;
  qrCodeBase64: string;
  pixKey: string;
  txId: string;
  endToEndId?: string;
  expiresAt: Date;
}

export interface CreditCardData {
  cardToken: string;
  brand: string;
  lastFourDigits: string;
  installments: number;
  installmentAmount: number;
  authorizationCode?: string;
  nsu?: string;
  tid?: string;
}

export interface DebitCardData {
  cardToken: string;
  brand: string;
  lastFourDigits: string;
  authorizationCode?: string;
  nsu?: string;
  tid?: string;
}

export interface BoletoData {
  barcodeNumber: string;
  digitableLine: string;
  boletoUrl: string;
  expiresAt: Date;
}

export interface BankTransferData {
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountDigit: string;
  document: string;
  name: string;
}

export interface PaymentWebhook {
  id: string;
  paymentId: string;
  gatewayId: string;
  event: string;
  data: any;
  signature?: string;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  gatewayRefundId?: string;
  createdAt: Date;
  processedAt?: Date;
}