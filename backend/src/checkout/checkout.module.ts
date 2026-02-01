import { Module } from '@nestjs/common';
import { CheckoutService } from './services/checkout.service';
import { PixIntegrationService } from './services/pix-integration.service';
import { CardIntegrationService } from './services/card-integration.service';
import { CheckoutController } from './controllers/checkout.controller';
import { PixCheckoutController } from './controllers/pix-checkout.controller';
import { CardCheckoutController } from './controllers/card-checkout.controller';
import { CartModule } from '../cart/cart.module';
import { PricingModule } from '../pricing/pricing.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TenantsModule,
    CartModule,
    PricingModule,
    PaymentsModule,
    UsersModule,
  ],
  controllers: [CheckoutController, PixCheckoutController, CardCheckoutController],
  providers: [CheckoutService, PixIntegrationService, CardIntegrationService],
  exports: [CheckoutService, PixIntegrationService, CardIntegrationService],
})
export class CheckoutModule {}