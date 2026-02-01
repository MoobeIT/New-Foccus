// Services
export { CheckoutService } from './services/checkout.service';
export { PixIntegrationService } from './services/pix-integration.service';
export { CardIntegrationService } from './services/card-integration.service';

// Controllers
export { CheckoutController } from './controllers/checkout.controller';
export { PixCheckoutController } from './controllers/pix-checkout.controller';
export { CardCheckoutController } from './controllers/card-checkout.controller';

// Entities
export type {
  CheckoutSession,
  CheckoutStatus,
  CustomerData,
  Address,
  PaymentMethodData,
  OrderSummary,
  CheckoutItem,
  ShippingMethod,
  AppliedCoupon,
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
} from './entities/checkout.entity';

// Module
export { CheckoutModule } from './checkout.module';