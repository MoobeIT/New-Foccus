// Services
export { NotificationService } from './services/notification.service';
export { EmailService } from './services/email.service';
export { TemplateService } from './services/template.service';
export { WhatsAppService } from './services/whatsapp.service';
export { SMSService } from './services/sms.service';

// Controllers
export { NotificationController } from './controllers/notification.controller';
export { EmailController } from './controllers/email.controller';
export { MessagingController } from './controllers/messaging.controller';

// Entities
export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationRecipient,
  NotificationPreferences,
  EmailTemplate,
  TemplateVariable,
  SendNotificationRequest,
  SendEmailRequest,
  EmailDeliveryResult,
  EmailProviderConfig,
  EmailAttachment,
  NotificationBatch,
  NotificationStats,
  NotificationPreferencesUpdate,
  NotificationEvent,
} from './entities/notification.entity';

// Module
export { NotificationsModule } from './notifications.module';