import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { TemplateService } from './services/template.service';
import { WhatsAppService } from './services/whatsapp.service';
import { SMSService } from './services/sms.service';
import { ShippingNotificationService } from './services/shipping-notification.service';
import { NotificationController } from './controllers/notification.controller';
import { EmailController } from './controllers/email.controller';
import { MessagingController } from './controllers/messaging.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TenantsModule,
    CommonModule,
    CacheModule.register({
      ttl: 300, // 5 minutos para cache de templates
    }),
  ],
  controllers: [NotificationController, EmailController, MessagingController],
  providers: [
    NotificationService,
    EmailService,
    TemplateService,
    WhatsAppService,
    SMSService,
    ShippingNotificationService,
  ],
  exports: [
    NotificationService,
    EmailService,
    TemplateService,
    WhatsAppService,
    SMSService,
    ShippingNotificationService,
  ],
})
export class NotificationsModule {}