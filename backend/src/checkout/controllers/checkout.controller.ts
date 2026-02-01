import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CheckoutService } from '../services/checkout.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import {
  CheckoutSession,
  StartCheckoutRequest,
  CheckoutCompletionResult,
  CustomerData,
  Address,
  PaymentMethodData,
} from '../entities/checkout.entity';

class StartCheckoutDto {
  cartId?: string;
  items?: {
    productId: string;
    variantId?: string;
    projectId?: string;
    quantity: number;
    pages?: number;
    customizations?: Record<string, any>;
  }[];
}

class UpdateCustomerDataDto {
  customer: Partial<CustomerData>;
}

class UpdateAddressDto {
  billingAddress?: Address;
  shippingAddress?: Address;
  sameAsShipping?: boolean;
}

class UpdatePaymentMethodDto {
  paymentMethod: PaymentMethodData;
}

class ApplyCouponDto {
  couponCode: string;
}

class CompleteCheckoutDto {
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar processo de checkout' })
  @ApiBody({ type: StartCheckoutDto })
  @ApiResponse({ status: 200, description: 'Checkout iniciado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async startCheckout(
    @Body() body: StartCheckoutDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';

    if (!body.cartId && (!body.items || body.items.length === 0)) {
      throw new BadRequestException('É necessário fornecer cartId ou items');
    }

    const request: StartCheckoutRequest = {
      cartId: body.cartId,
      items: body.items,
    };

    return this.checkoutService.startCheckout(tenantId, userId, request);
  }

  @Get(':checkoutId')
  @ApiOperation({ summary: 'Obter sessão de checkout' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiResponse({ status: 200, description: 'Sessão de checkout' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async getCheckoutSession(
    @Param('checkoutId') checkoutId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';
    return this.checkoutService.getCheckoutSession(tenantId, userId, checkoutId);
  }

  @Put(':checkoutId/customer')
  @ApiOperation({ summary: 'Atualizar dados do cliente' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiBody({ type: UpdateCustomerDataDto })
  @ApiResponse({ status: 200, description: 'Dados atualizados com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async updateCustomerData(
    @Param('checkoutId') checkoutId: string,
    @Body() body: UpdateCustomerDataDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';
    return this.checkoutService.updateCustomerData(tenantId, userId, checkoutId, body);
  }

  @Put(':checkoutId/address')
  @ApiOperation({ summary: 'Atualizar endereços' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ status: 200, description: 'Endereços atualizados com sucesso' })
  @ApiResponse({ status: 400, description: 'Endereços inválidos' })
  async updateAddress(
    @Param('checkoutId') checkoutId: string,
    @Body() body: UpdateAddressDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';
    return this.checkoutService.updateAddress(tenantId, userId, checkoutId, body);
  }

  @Put(':checkoutId/payment-method')
  @ApiOperation({ summary: 'Atualizar método de pagamento' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiBody({ type: UpdatePaymentMethodDto })
  @ApiResponse({ status: 200, description: 'Método de pagamento atualizado' })
  @ApiResponse({ status: 400, description: 'Método de pagamento inválido' })
  async updatePaymentMethod(
    @Param('checkoutId') checkoutId: string,
    @Body() body: UpdatePaymentMethodDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';
    return this.checkoutService.updatePaymentMethod(tenantId, userId, checkoutId, body);
  }

  @Post(':checkoutId/coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar cupom de desconto' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiBody({ type: ApplyCouponDto })
  @ApiResponse({ status: 200, description: 'Cupom aplicado com sucesso' })
  @ApiResponse({ status: 400, description: 'Cupom inválido' })
  async applyCoupon(
    @Param('checkoutId') checkoutId: string,
    @Body() body: ApplyCouponDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutSession> {
    const userId = user?.id || '';

    if (!body.couponCode || body.couponCode.trim().length === 0) {
      throw new BadRequestException('Código do cupom é obrigatório');
    }

    return this.checkoutService.applyCoupon(tenantId, userId, checkoutId, {
      couponCode: body.couponCode,
    });
  }

  @Post(':checkoutId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalizar checkout' })
  @ApiParam({ name: 'checkoutId', description: 'ID da sessão de checkout' })
  @ApiBody({ type: CompleteCheckoutDto })
  @ApiResponse({ status: 200, description: 'Checkout finalizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados incompletos ou inválidos' })
  async completeCheckout(
    @Param('checkoutId') checkoutId: string,
    @Body() body: CompleteCheckoutDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<CheckoutCompletionResult> {
    const userId = user?.id || '';

    if (!body.acceptedTerms) {
      throw new BadRequestException('É necessário aceitar os termos de uso');
    }

    return this.checkoutService.completeCheckout(tenantId, userId, checkoutId, body);
  }
}
