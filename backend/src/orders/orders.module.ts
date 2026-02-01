import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './services/orders.service';
import { OrderTrackingService } from './services/order-tracking.service';
import { OrdersController } from './controllers/orders.controller';
import { OrderTrackingController } from './controllers/order-tracking.controller';
import { PaymentsModule } from '../payments/payments.module';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from '../tenants/tenants.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TenantsModule,
    forwardRef(() => PaymentsModule),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [OrdersController, OrderTrackingController],
  providers: [OrdersService, OrderTrackingService],
  exports: [OrdersService, OrderTrackingService],
})
export class OrdersModule {}