import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PaymentService } from './services/payment.service';
import { PixService } from './services/pix.service';
import { StripeService } from './services/stripe.service';
import { WebhookService } from './services/webhook.service';
import { PaymentController } from './controllers/payment.controller';
import { StripeController } from './controllers/stripe.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PricingModule } from '../pricing/pricing.module';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TenantsModule,
    PricingModule,
    CommonModule,
    CacheModule.register({
      ttl: 600, // 10 minutos para dados de pagamento
    }),
  ],
  controllers: [PaymentController, StripeController, WebhookController],
  providers: [PaymentService, PixService, StripeService, WebhookService],
  exports: [PaymentService, PixService, StripeService, WebhookService],
})
export class PaymentsModule {}