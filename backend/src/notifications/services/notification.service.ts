import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../../common/services/logger.service';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { WhatsAppService } from './whatsapp.service';
import { SMSService } from './sms.service';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  SendNotificationRequest,
  NotificationBatch,
  NotificationStats,
  NotificationPreferencesUpdate,
  NotificationRecipient,
} from '../entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly NOTIFICATION_TTL = 86400; // 24 horas

  constructor(
    private emailService: EmailService,
    private templateService: TemplateService,
    private whatsappService: WhatsAppService,
    private smsService: SMSService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async sendNotification(request: SendNotificationRequest): Promise<Notification> {
    try {
      this.logger.debug(
        'Enviando notificação',
        'NotificationService',
        { 
          type: request.type,
          channel: request.channel,
          recipient: request.recipient.email || request.recipient.phone,
        },
      );

      // Criar notificação
      const notification = await this.createNotification(request);

      // Verificar preferências do usuário
      if (request.userId) {
        const canSend = await this.checkUserPreferences(
          request.tenantId,
          request.userId,
          request.type,
          request.channel,
        );

        if (!canSend) {
          notification.status = 'cancelled';
          notification.errorMessage = 'Usuário optou por não receber este tipo de notificação';
          await this.saveNotification(notification);
          return notification;
        }
      }

      // Processar envio baseado no canal
      await this.processNotification(notification);

      return notification;
    } catch (error) {
      this.logger.error('Erro ao enviar notificação', error.stack, 'NotificationService');
      throw error;
    }
  }

  async sendBulkNotifications(
    tenantId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipients: NotificationRecipient[],
    options: {
      templateId?: string;
      templateData?: Record<string, any>;
      subject?: string;
      message?: string;
      priority?: NotificationPriority;
      scheduledFor?: Date;
    },
  ): Promise<NotificationBatch> {
    try {
      this.logger.debug(
        'Enviando notificações em lote',
        'NotificationService',
        { 
          type,
          channel,
          recipientCount: recipients.length,
        },
      );

      // Criar batch
      const batch: NotificationBatch = {
        id: this.generateBatchId(),
        name: `${type}_${channel}_${Date.now()}`,
        type,
        channel,
        templateId: options.templateId,
        templateData: options.templateData,
        priority: options.priority || 'normal',
        scheduledFor: options.scheduledFor,
        recipients,
        status: 'pending',
        totalRecipients: recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar batch
      await this.saveBatch(batch);

      // Processar em background
      this.processBatch(batch, tenantId, options).catch(error => {
        this.logger.error('Erro ao processar batch', error.stack, 'NotificationService');
      });

      return batch;
    } catch (error) {
      this.logger.error('Erro ao enviar notificações em lote', error.stack, 'NotificationService');
      throw error;
    }
  }

  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      return await this.cacheManager.get<Notification>(`notification:${notificationId}`);
    } catch (error) {
      this.logger.error('Erro ao buscar notificação', error.stack, 'NotificationService');
      return null;
    }
  }

  async getUserNotifications(
    tenantId: string,
    userId: string,
    options: {
      channel?: NotificationChannel;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      // TODO: Implementar busca real no banco de dados
      // Por enquanto, retornar dados mock
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          tenantId,
          userId,
          type: 'order_confirmation',
          channel: 'email',
          subject: 'Pedido confirmado!',
          message: 'Seu pedido foi confirmado e está sendo processado.',
          recipient: { email: 'user@example.com', name: 'Usuário' },
          status: 'delivered',
          priority: 'normal',
          attempts: 1,
          maxAttempts: 3,
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'notif-2',
          tenantId,
          userId,
          type: 'cart_abandoned',
          channel: 'email',
          subject: 'Você esqueceu algo no seu carrinho',
          message: 'Complete sua compra e ganhe 10% de desconto!',
          recipient: { email: 'user@example.com', name: 'Usuário' },
          status: 'sent',
          priority: 'low',
          attempts: 1,
          maxAttempts: 3,
          sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ];

      const filtered = mockNotifications.filter(n => {
        if (options.channel && n.channel !== options.channel) return false;
        if (options.status && n.status !== options.status) return false;
        return true;
      });

      const total = filtered.length;
      const unreadCount = filtered.filter(n => !n.readAt).length;
      const notifications = filtered.slice(
        options.offset || 0,
        (options.offset || 0) + (options.limit || 20),
      );

      return { notifications, total, unreadCount };
    } catch (error) {
      this.logger.error('Erro ao buscar notificações do usuário', error.stack, 'NotificationService');
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = await this.getNotification(notificationId);
      if (notification) {
        notification.readAt = new Date();
        notification.updatedAt = new Date();
        await this.saveNotification(notification);
      }
    } catch (error) {
      this.logger.error('Erro ao marcar notificação como lida', error.stack, 'NotificationService');
      throw error;
    }
  }

  async updateUserPreferences(
    tenantId: string,
    userId: string,
    preferences: NotificationPreferencesUpdate,
  ): Promise<void> {
    try {
      // TODO: Salvar preferências no banco de dados
      await this.cacheManager.set(
        `preferences:${tenantId}:${userId}`,
        preferences,
        this.NOTIFICATION_TTL,
      );

      this.logger.debug(
        'Preferências de notificação atualizadas',
        'NotificationService',
        { userId, preferences },
      );
    } catch (error) {
      this.logger.error('Erro ao atualizar preferências', error.stack, 'NotificationService');
      throw error;
    }
  }

  async getNotificationStats(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<NotificationStats> {
    try {
      // TODO: Implementar estatísticas reais
      const mockStats: NotificationStats = {
        period,
        totalSent: 1250,
        totalDelivered: 1180,
        totalFailed: 70,
        deliveryRate: 94.4,
        byChannel: [
          { channel: 'email', sent: 800, delivered: 760, failed: 40, rate: 95.0 },
          { channel: 'sms', sent: 300, delivered: 285, failed: 15, rate: 95.0 },
          { channel: 'whatsapp', sent: 150, delivered: 135, failed: 15, rate: 90.0 },
        ],
        byType: [
          { type: 'order_confirmation', sent: 400, delivered: 390, failed: 10, rate: 97.5 },
          { type: 'cart_abandoned', sent: 300, delivered: 270, failed: 30, rate: 90.0 },
          { type: 'promotion', sent: 350, delivered: 320, failed: 30, rate: 91.4 },
        ],
        timeline: [
          { date: '2024-01-01', sent: 45, delivered: 42, failed: 3 },
          { date: '2024-01-02', sent: 52, delivered: 49, failed: 3 },
          { date: '2024-01-03', sent: 38, delivered: 36, failed: 2 },
        ],
      };

      return mockStats;
    } catch (error) {
      this.logger.error('Erro ao buscar estatísticas', error.stack, 'NotificationService');
      throw error;
    }
  }

  // Métodos específicos para tipos de notificação
  async sendOrderConfirmation(
    tenantId: string,
    userId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      items: any[];
      total: number;
      currency: string;
    },
  ): Promise<Notification> {
    return this.sendNotification({
      tenantId,
      userId,
      type: 'order_confirmation',
      channel: 'email',
      recipient: {
        email: orderData.customerEmail,
        name: orderData.customerName,
      },
      templateId: 'order_confirmation',
      templateData: orderData,
      priority: 'high',
    });
  }

  async sendOrderStatusUpdate(
    tenantId: string,
    userId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      status: string;
      trackingCode?: string;
      estimatedDelivery?: Date;
    },
  ): Promise<Notification> {
    return this.sendNotification({
      tenantId,
      userId,
      type: 'order_status_update',
      channel: 'email',
      recipient: {
        email: orderData.customerEmail,
        name: orderData.customerName,
      },
      templateId: 'order_status_update',
      templateData: orderData,
      priority: 'normal',
    });
  }

  async sendCartAbandonedReminder(
    tenantId: string,
    userId: string,
    cartData: {
      customerName: string;
      customerEmail: string;
      items: any[];
      total: number;
      currency: string;
      cartUrl: string;
    },
  ): Promise<Notification> {
    return this.sendNotification({
      tenantId,
      userId,
      type: 'cart_abandoned',
      channel: 'email',
      recipient: {
        email: cartData.customerEmail,
        name: cartData.customerName,
      },
      templateId: 'cart_abandoned',
      templateData: cartData,
      priority: 'low',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas depois
    });
  }

  async sendWelcomeEmail(
    tenantId: string,
    userId: string,
    userData: {
      name: string;
      email: string;
      verificationUrl?: string;
    },
  ): Promise<Notification> {
    return this.sendNotification({
      tenantId,
      userId,
      type: 'welcome',
      channel: 'email',
      recipient: {
        email: userData.email,
        name: userData.name,
      },
      templateId: 'welcome',
      templateData: userData,
      priority: 'normal',
    });
  }

  // Métodos privados
  private async createNotification(request: SendNotificationRequest): Promise<Notification> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      tenantId: request.tenantId,
      userId: request.userId || '',
      type: request.type,
      channel: request.channel,
      subject: request.subject || '',
      message: request.message || '',
      templateId: request.templateId,
      templateData: request.templateData,
      recipient: request.recipient,
      status: 'pending',
      priority: request.priority || 'normal',
      scheduledFor: request.scheduledFor,
      attempts: 0,
      maxAttempts: 3,
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: request.expiresAt,
    };

    await this.saveNotification(notification);
    return notification;
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      notification.status = 'sending';
      notification.attempts += 1;
      notification.lastAttemptAt = new Date();
      await this.saveNotification(notification);

      let success = false;

      switch (notification.channel) {
        case 'email':
          success = await this.sendEmail(notification);
          break;
        case 'sms':
          success = await this.sendSMS(notification);
          break;
        case 'whatsapp':
          success = await this.sendWhatsApp(notification);
          break;
        default:
          throw new Error(`Canal não suportado: ${notification.channel}`);
      }

      if (success) {
        notification.status = 'sent';
        notification.sentAt = new Date();
      } else {
        notification.status = 'failed';
        notification.errorMessage = 'Falha no envio';
      }

      await this.saveNotification(notification);
    } catch (error) {
      notification.status = 'failed';
      notification.errorMessage = error.message;
      await this.saveNotification(notification);
      throw error;
    }
  }

  private async sendEmail(notification: Notification): Promise<boolean> {
    try {
      let subject = notification.subject;
      let htmlContent = notification.message;
      let textContent = notification.message;

      // Usar template se especificado
      if (notification.templateId) {
        const template = await this.templateService.getTemplate(
          notification.templateId,
          notification.recipient.language || 'pt-BR',
        );

        if (template) {
          subject = await this.templateService.renderTemplate(
            template.subject,
            notification.templateData || {},
          );
          htmlContent = await this.templateService.renderTemplate(
            template.htmlContent,
            notification.templateData || {},
          );
          textContent = await this.templateService.renderTemplate(
            template.textContent,
            notification.templateData || {},
          );
        }
      }

      const result = await this.emailService.sendEmail({
        to: notification.recipient.email!,
        subject,
        htmlContent,
        textContent,
        priority: notification.priority,
      });

      return result.success;
    } catch (error) {
      this.logger.error('Erro ao enviar email', error.stack, 'NotificationService');
      return false;
    }
  }

  private async sendSMS(notification: Notification): Promise<boolean> {
    try {
      const result = await this.smsService.sendSMS({
        to: notification.recipient.phone!,
        body: notification.message,
      });
      return result.success;
    } catch (error) {
      this.logger.error('Erro ao enviar SMS', error.stack, 'NotificationService');
      return false;
    }
  }

  private async sendWhatsApp(notification: Notification): Promise<boolean> {
    try {
      const result = await this.whatsappService.sendTextMessage(
        notification.recipient.phone!,
        notification.message,
      );
      return result.success;
    } catch (error) {
      this.logger.error('Erro ao enviar WhatsApp', error.stack, 'NotificationService');
      return false;
    }
  }

  private async processBatch(
    batch: NotificationBatch,
    tenantId: string,
    options: any,
  ): Promise<void> {
    try {
      batch.status = 'processing';
      await this.saveBatch(batch);

      for (const recipient of batch.recipients) {
        try {
          await this.sendNotification({
            tenantId,
            type: batch.type,
            channel: batch.channel,
            recipient,
            templateId: batch.templateId,
            templateData: batch.templateData,
            subject: options.subject,
            message: options.message,
            priority: batch.priority,
            scheduledFor: batch.scheduledFor,
          });

          batch.sentCount++;
        } catch (error) {
          batch.failedCount++;
          this.logger.error('Erro ao enviar notificação do batch', error.stack, 'NotificationService');
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date();
      batch.updatedAt = new Date();
      await this.saveBatch(batch);
    } catch (error) {
      batch.status = 'failed';
      batch.updatedAt = new Date();
      await this.saveBatch(batch);
      throw error;
    }
  }

  private async checkUserPreferences(
    tenantId: string,
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const preferences = await this.cacheManager.get(
        `preferences:${tenantId}:${userId}`,
      );

      if (!preferences) {
        return true; // Permitir por padrão se não há preferências
      }

      // TODO: Implementar lógica de verificação de preferências
      return true;
    } catch (error) {
      this.logger.error('Erro ao verificar preferências', error.stack, 'NotificationService');
      return true; // Permitir por padrão em caso de erro
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveNotification(notification: Notification): Promise<void> {
    await this.cacheManager.set(
      `notification:${notification.id}`,
      notification,
      this.NOTIFICATION_TTL,
    );
    // TODO: Salvar também no banco de dados
  }

  private async saveBatch(batch: NotificationBatch): Promise<void> {
    await this.cacheManager.set(
      `batch:${batch.id}`,
      batch,
      this.NOTIFICATION_TTL,
    );
    // TODO: Salvar também no banco de dados
  }
}