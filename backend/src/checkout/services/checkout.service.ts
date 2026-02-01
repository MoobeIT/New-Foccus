import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../../common/services/logger.service';
import { CartService } from '../../cart/services/cart.service';
import { PricingService } from '../../pricing/services/pricing.service';
import { PaymentService, CreatePaymentRequest } from '../../payments/services/payment.service';
import { UsersService } from '../../users/users.service';
import {
  CheckoutSession,
  CheckoutStatus,
  CustomerData,
  Address,
  PaymentMethodData,
  OrderSummary,
  CheckoutItem,
  StartCheckoutRequest,
  UpdateCustomerDataRequest,
  UpdateAddressRequest,
  UpdatePaymentMethodRequest,
  ApplyCouponRequest,
  SelectShippingMethodRequest,
  CompleteCheckoutRequest,
  CheckoutValidationResult,
  CheckoutValidationError,
  CheckoutValidationWarning,
  CheckoutCompletionResult,
} from '../entities/checkout.entity';

@Injectable()
export class CheckoutService {
  private readonly CHECKOUT_TTL = 3600; // 1 hora
  private readonly CHECKOUT_EXPIRY_HOURS = 24; // 24 horas

  constructor(
    private cartService: CartService,
    private pricingService: PricingService,
    private paymentService: PaymentService,
    private usersService: UsersService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async startCheckout(
    tenantId: string,
    userId: string,
    request: StartCheckoutRequest,
  ): Promise<CheckoutSession> {
    try {
      this.logger.debug('Iniciando checkout', 'CheckoutService', { userId, request });

      let cart;
      
      if (request.cartId) {
        // Usar carrinho existente
        cart = await this.cartService.getCart(tenantId, userId);
        if (cart.items.length === 0) {
          throw new BadRequestException('Carrinho está vazio');
        }
      } else if (request.items && request.items.length > 0) {
        // Criar carrinho temporário com os itens fornecidos
        cart = await this.cartService.clearCart(tenantId, userId);
        
        for (const item of request.items) {
          await this.cartService.addItem(tenantId, userId, {
            productId: item.productId,
            variantId: item.variantId,
            projectId: item.projectId,
            quantity: item.quantity,
            unitPrice: (item as any).unitPrice || 0,
            customizations: item.customizations,
          });
        }
        
        cart = await this.cartService.getCart(tenantId, userId);
      } else {
        throw new BadRequestException('É necessário fornecer cartId ou items');
      }

      // Buscar dados do usuário se logado
      let customerData: Partial<CustomerData> = {};
      if (userId) {
        try {
          const user = await this.usersService.findById(userId);
          if (user) {
            customerData = {
              email: user.email,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              phone: user.phone || '',
            };
          }
        } catch (error) {
          this.logger.warn('Erro ao buscar dados do usuário', 'CheckoutService', { userId });
        }
      }

      // Converter itens do carrinho para checkout
      const checkoutItems = await this.convertCartItemsToCheckoutItems(cart.items, tenantId);

      // Criar sessão de checkout
      const checkoutSession: CheckoutSession = {
        id: this.generateCheckoutId(tenantId, userId),
        tenantId,
        userId,
        cartId: cart.id,
        customer: customerData as CustomerData,
        billingAddress: {} as Address,
        shippingAddress: cart.shippingAddress || ({} as Address),
        sameAsShipping: true,
        paymentMethod: {} as PaymentMethodData,
        orderSummary: {
          items: checkoutItems,
          subtotal: cart.subtotal,
          discounts: cart.discounts,
          taxes: cart.taxes,
          shipping: cart.shipping,
          total: cart.total,
          currency: cart.currency,
          appliedCoupons: cart.promoCode ? [{
            code: cart.promoCode,
            name: cart.promoCode,
            discountType: 'percentage',
            discountValue: 10,
            discountAmount: cart.discounts,
          }] : [],
        },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CHECKOUT_EXPIRY_HOURS * 60 * 60 * 1000),
        acceptedTerms: false,
        marketingConsent: false,
      };

      await this.saveCheckoutSession(checkoutSession);

      this.logger.debug(
        'Checkout iniciado com sucesso',
        'CheckoutService',
        { checkoutId: checkoutSession.id, itemCount: checkoutItems.length },
      );

      return checkoutSession;
    } catch (error) {
      this.logger.error('Erro ao iniciar checkout', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async getCheckoutSession(
    tenantId: string,
    userId: string,
    checkoutId: string,
  ): Promise<CheckoutSession> {
    try {
      const session = await this.cacheManager.get<CheckoutSession>(checkoutId);
      
      if (!session) {
        throw new NotFoundException('Sessão de checkout não encontrada');
      }

      if (session.tenantId !== tenantId || session.userId !== userId) {
        throw new NotFoundException('Sessão de checkout não encontrada');
      }

      // Verificar se expirou
      if (session.expiresAt && session.expiresAt < new Date()) {
        session.status = 'expired';
        await this.saveCheckoutSession(session);
      }

      return session;
    } catch (error) {
      this.logger.error('Erro ao buscar sessão de checkout', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async updateCustomerData(
    tenantId: string,
    userId: string,
    checkoutId: string,
    request: UpdateCustomerDataRequest,
  ): Promise<CheckoutSession> {
    try {
      const session = await this.getCheckoutSession(tenantId, userId, checkoutId);
      
      // Validar dados do cliente
      const validationResult = this.validateCustomerData(request.customer);
      if (!validationResult.isValid) {
        throw new BadRequestException({
          message: 'Dados do cliente inválidos',
          errors: validationResult.errors,
        });
      }

      // Atualizar dados
      session.customer = {
        ...session.customer,
        ...request.customer,
      };
      
      session.status = 'customer_info';
      session.updatedAt = new Date();

      await this.saveCheckoutSession(session);

      this.logger.debug(
        'Dados do cliente atualizados',
        'CheckoutService',
        { checkoutId, email: session.customer.email },
      );

      return session;
    } catch (error) {
      this.logger.error('Erro ao atualizar dados do cliente', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async updateAddress(
    tenantId: string,
    userId: string,
    checkoutId: string,
    request: UpdateAddressRequest,
  ): Promise<CheckoutSession> {
    try {
      const session = await this.getCheckoutSession(tenantId, userId, checkoutId);
      
      // Atualizar endereços
      if (request.billingAddress) {
        const validationResult = this.validateAddress(request.billingAddress);
        if (!validationResult.isValid) {
          throw new BadRequestException({
            message: 'Endereço de cobrança inválido',
            errors: validationResult.errors,
          });
        }
        session.billingAddress = request.billingAddress;
      }

      if (request.shippingAddress) {
        const validationResult = this.validateAddress(request.shippingAddress);
        if (!validationResult.isValid) {
          throw new BadRequestException({
            message: 'Endereço de entrega inválido',
            errors: validationResult.errors,
          });
        }
        session.shippingAddress = request.shippingAddress;
        
        // Recalcular frete
        await this.recalculateShipping(session);
      }

      if (request.sameAsShipping !== undefined) {
        session.sameAsShipping = request.sameAsShipping;
        if (request.sameAsShipping) {
          session.billingAddress = { ...session.shippingAddress };
        }
      }
      
      session.status = 'shipping_address';
      session.updatedAt = new Date();

      await this.saveCheckoutSession(session);

      this.logger.debug(
        'Endereços atualizados',
        'CheckoutService',
        { checkoutId, cep: session.shippingAddress.cep },
      );

      return session;
    } catch (error) {
      this.logger.error('Erro ao atualizar endereços', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async updatePaymentMethod(
    tenantId: string,
    userId: string,
    checkoutId: string,
    request: UpdatePaymentMethodRequest,
  ): Promise<CheckoutSession> {
    try {
      const session = await this.getCheckoutSession(tenantId, userId, checkoutId);
      
      // Validar método de pagamento
      const validationResult = this.validatePaymentMethod(request.paymentMethod);
      if (!validationResult.isValid) {
        throw new BadRequestException({
          message: 'Método de pagamento inválido',
          errors: validationResult.errors,
        });
      }

      session.paymentMethod = request.paymentMethod;
      session.status = 'payment_method';
      session.updatedAt = new Date();

      await this.saveCheckoutSession(session);

      this.logger.debug(
        'Método de pagamento atualizado',
        'CheckoutService',
        { checkoutId, paymentType: session.paymentMethod.type },
      );

      return session;
    } catch (error) {
      this.logger.error('Erro ao atualizar método de pagamento', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async applyCoupon(
    tenantId: string,
    userId: string,
    checkoutId: string,
    request: ApplyCouponRequest,
  ): Promise<CheckoutSession> {
    try {
      const session = await this.getCheckoutSession(tenantId, userId, checkoutId);
      
      // TODO: Validar cupom com serviço de promoções
      // Por enquanto, aplicar desconto mock
      const discountAmount = session.orderSummary.subtotal * 0.1; // 10%
      
      session.orderSummary.appliedCoupons = [{
        code: request.couponCode,
        name: `Cupom ${request.couponCode}`,
        discountType: 'percentage',
        discountValue: 10,
        discountAmount,
      }];
      
      session.orderSummary.discounts = discountAmount;
      session.orderSummary.total = 
        session.orderSummary.subtotal - 
        session.orderSummary.discounts + 
        session.orderSummary.taxes + 
        session.orderSummary.shipping;

      session.updatedAt = new Date();
      await this.saveCheckoutSession(session);

      this.logger.debug(
        'Cupom aplicado',
        'CheckoutService',
        { checkoutId, coupon: request.couponCode, discount: discountAmount },
      );

      return session;
    } catch (error) {
      this.logger.error('Erro ao aplicar cupom', error.stack, 'CheckoutService');
      throw error;
    }
  }

  async completeCheckout(
    tenantId: string,
    userId: string,
    checkoutId: string,
    request: CompleteCheckoutRequest,
  ): Promise<CheckoutCompletionResult> {
    try {
      const session = await this.getCheckoutSession(tenantId, userId, checkoutId);
      
      // Validar se checkout está completo
      const validationResult = this.validateCompleteCheckout(session, request);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
        };
      }

      session.acceptedTerms = request.acceptedTerms;
      session.marketingConsent = request.marketingConsent || false;
      session.status = 'processing';
      session.updatedAt = new Date();

      await this.saveCheckoutSession(session);

      // Criar pagamento com a interface correta
      const paymentRequest: CreatePaymentRequest = {
        tenantId,
        userId,
        orderId: session.id, // Usando checkoutId como orderId temporariamente
        amount: session.orderSummary.total,
        currency: session.orderSummary.currency,
        method: this.mapPaymentMethodType(session.paymentMethod.type),
        payer: {
          name: `${session.customer.firstName} ${session.customer.lastName}`,
          email: session.customer.email,
          document: session.customer.document,
          phone: session.customer.phone,
        },
        methodData: this.buildPaymentMethodData(session.paymentMethod),
        description: `Pedido - ${session.orderSummary.items.length} itens`,
        metadata: {
          checkoutId: session.id,
          cartId: session.cartId,
          items: session.orderSummary.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      };

      const paymentResult = await this.paymentService.createPayment(paymentRequest);

      if (paymentResult.payment.status === 'pending' || paymentResult.payment.status === 'paid') {
        session.status = 'completed';
        await this.saveCheckoutSession(session);

        // Limpar carrinho após checkout bem-sucedido
        await this.cartService.clearCart(tenantId, userId);

        this.logger.debug(
          'Checkout completado com sucesso',
          'CheckoutService',
          { checkoutId, paymentId: paymentResult.payment.id },
        );

        return {
          success: true,
          orderId: session.id, // TODO: Criar Order Service
          paymentId: paymentResult.payment.id,
          paymentData: paymentResult.paymentData,
        };
      } else {
        session.status = 'payment_method'; // Voltar para seleção de pagamento
        await this.saveCheckoutSession(session);

        return {
          success: false,
          errors: [{
            field: 'payment',
            code: 'PAYMENT_FAILED',
            message: 'Falha no processamento do pagamento',
          }],
        };
      }
    } catch (error) {
      this.logger.error('Erro ao completar checkout', error.stack, 'CheckoutService');
      throw error;
    }
  }

  private async convertCartItemsToCheckoutItems(
    cartItems: any[],
    tenantId: string,
  ): Promise<CheckoutItem[]> {
    // TODO: Buscar dados completos dos produtos
    return cartItems.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: `Produto ${item.productId}`, // TODO: Buscar nome real
      variantId: item.variantId,
      variantName: item.variantId ? `Variante ${item.variantId}` : undefined,
      projectId: item.projectId,
      projectName: item.projectId ? `Projeto ${item.projectId}` : undefined,
      quantity: item.quantity,
      pages: item.pages,
      customizations: item.customizations,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));
  }

  private async recalculateShipping(session: CheckoutSession): Promise<void> {
    if (!session.shippingAddress.cep || session.orderSummary.items.length === 0) {
      return;
    }

    try {
      // Usar o primeiro item para calcular frete (simplificado)
      const firstItem = session.orderSummary.items[0];
      const totalQuantity = session.orderSummary.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      const shippingResult = await this.pricingService.calculateShippingOnly(
        session.tenantId,
        firstItem.productId,
        firstItem.variantId,
        totalQuantity,
        session.shippingAddress.cep,
      );

      if (shippingResult.options.length > 0) {
        const cheapestOption = shippingResult.options.reduce((min, option) =>
          option.price < min.price ? option : min,
        );

        session.orderSummary.shipping = cheapestOption.price;
        session.orderSummary.shippingMethod = {
          id: cheapestOption.service,
          name: cheapestOption.serviceName,
          description: `Entrega em ${cheapestOption.deliveryTime} dias úteis`,
          price: cheapestOption.price,
          estimatedDays: cheapestOption.deliveryTime,
          carrier: cheapestOption.provider,
        };

        // Recalcular total
        session.orderSummary.total =
          session.orderSummary.subtotal -
          session.orderSummary.discounts +
          session.orderSummary.taxes +
          session.orderSummary.shipping;
      }
    } catch (error) {
      this.logger.warn('Erro ao recalcular frete', 'CheckoutService', { error: error.message });
    }
  }

  private mapPaymentMethodType(type: string): any {
    const mapping = {
      'pix': 'pix',
      'credit_card': 'credit_card',
      'debit_card': 'debit_card',
      'bank_slip': 'boleto',
    };
    return mapping[type] || 'pix';
  }

  private buildPaymentMethodData(paymentMethod: PaymentMethodData): any {
    switch (paymentMethod.type) {
      case 'pix':
        return {
          pix: {
            expirationMinutes: 30,
          },
        };
      case 'credit_card':
        return {
          creditCard: {
            cardToken: paymentMethod.cardData?.number || '',
            installments: paymentMethod.cardData?.installments || 1,
            holderName: paymentMethod.cardData?.holderName || '',
          },
        };
      case 'bank_slip':
        return {
          boleto: {
            expirationDays: 3,
          },
        };
      default:
        return {};
    }
  }

  private validateCustomerData(customer: Partial<CustomerData>): CheckoutValidationResult {
    const errors: CheckoutValidationError[] = [];
    const warnings: CheckoutValidationWarning[] = [];

    if (!customer.email) {
      errors.push({
        field: 'email',
        code: 'REQUIRED',
        message: 'Email é obrigatório',
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Email inválido',
      });
    }

    if (!customer.firstName) {
      errors.push({
        field: 'firstName',
        code: 'REQUIRED',
        message: 'Nome é obrigatório',
      });
    }

    if (!customer.lastName) {
      errors.push({
        field: 'lastName',
        code: 'REQUIRED',
        message: 'Sobrenome é obrigatório',
      });
    }

    if (!customer.document) {
      errors.push({
        field: 'document',
        code: 'REQUIRED',
        message: 'CPF/CNPJ é obrigatório',
      });
    }

    if (!customer.phone) {
      warnings.push({
        field: 'phone',
        code: 'RECOMMENDED',
        message: 'Telefone é recomendado para contato',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateAddress(address: Address): CheckoutValidationResult {
    const errors: CheckoutValidationError[] = [];

    if (!address.cep) {
      errors.push({
        field: 'cep',
        code: 'REQUIRED',
        message: 'CEP é obrigatório',
      });
    }

    if (!address.street) {
      errors.push({
        field: 'street',
        code: 'REQUIRED',
        message: 'Rua é obrigatória',
      });
    }

    if (!address.number) {
      errors.push({
        field: 'number',
        code: 'REQUIRED',
        message: 'Número é obrigatório',
      });
    }

    if (!address.neighborhood) {
      errors.push({
        field: 'neighborhood',
        code: 'REQUIRED',
        message: 'Bairro é obrigatório',
      });
    }

    if (!address.city) {
      errors.push({
        field: 'city',
        code: 'REQUIRED',
        message: 'Cidade é obrigatória',
      });
    }

    if (!address.state) {
      errors.push({
        field: 'state',
        code: 'REQUIRED',
        message: 'Estado é obrigatório',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validatePaymentMethod(paymentMethod: PaymentMethodData): CheckoutValidationResult {
    const errors: CheckoutValidationError[] = [];

    if (!paymentMethod.type) {
      errors.push({
        field: 'type',
        code: 'REQUIRED',
        message: 'Tipo de pagamento é obrigatório',
      });
    }

    if (paymentMethod.type === 'credit_card' || paymentMethod.type === 'debit_card') {
      if (!paymentMethod.cardData) {
        errors.push({
          field: 'cardData',
          code: 'REQUIRED',
          message: 'Dados do cartão são obrigatórios',
        });
      } else {
        if (!paymentMethod.cardData.holderName) {
          errors.push({
            field: 'cardData.holderName',
            code: 'REQUIRED',
            message: 'Nome do portador é obrigatório',
          });
        }

        if (!paymentMethod.cardData.number) {
          errors.push({
            field: 'cardData.number',
            code: 'REQUIRED',
            message: 'Número do cartão é obrigatório',
          });
        }

        if (!paymentMethod.cardData.expiryMonth || !paymentMethod.cardData.expiryYear) {
          errors.push({
            field: 'cardData.expiry',
            code: 'REQUIRED',
            message: 'Data de validade é obrigatória',
          });
        }

        if (!paymentMethod.cardData.cvv) {
          errors.push({
            field: 'cardData.cvv',
            code: 'REQUIRED',
            message: 'CVV é obrigatório',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validateCompleteCheckout(
    session: CheckoutSession,
    request: CompleteCheckoutRequest,
  ): CheckoutValidationResult {
    const errors: CheckoutValidationError[] = [];

    // Validar dados do cliente
    const customerValidation = this.validateCustomerData(session.customer);
    errors.push(...customerValidation.errors);

    // Validar endereços
    const shippingValidation = this.validateAddress(session.shippingAddress);
    errors.push(...shippingValidation.errors);

    const billingValidation = this.validateAddress(session.billingAddress);
    errors.push(...billingValidation.errors);

    // Validar método de pagamento
    const paymentValidation = this.validatePaymentMethod(session.paymentMethod);
    errors.push(...paymentValidation.errors);

    // Validar termos
    if (!request.acceptedTerms) {
      errors.push({
        field: 'acceptedTerms',
        code: 'REQUIRED',
        message: 'É necessário aceitar os termos de uso',
      });
    }

    // Validar itens
    if (session.orderSummary.items.length === 0) {
      errors.push({
        field: 'items',
        code: 'REQUIRED',
        message: 'Carrinho não pode estar vazio',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private generateCheckoutId(tenantId: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `checkout:${tenantId}:${userId}:${timestamp}:${random}`;
  }

  private async saveCheckoutSession(session: CheckoutSession): Promise<void> {
    await this.cacheManager.set(session.id, session, this.CHECKOUT_TTL);
    // TODO: Salvar também no banco de dados para persistência
  }
}