import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { NotificationService } from './notification.service';
import { Order, TrackingEvent } from '../../orders/entities/order.entity';

export interface ShippingNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  trackingCode: string;
  carrier: string;
  carrierName: string;
  estimatedDelivery?: Date;
  trackingUrl: string;
}

@Injectable()
export class ShippingNotificationService {
  constructor(
    private notificationService: NotificationService,
    private logger: LoggerService,
  ) {}

  /**
   * Enviar notificação de pedido enviado
   */
  async sendShippedNotification(
    tenantId: string,
    userId: string,
    data: ShippingNotificationData,
  ): Promise<void> {
    try {
      this.logger.debug('Enviando notificação de envio', 'ShippingNotificationService', {
        orderId: data.orderId,
        trackingCode: data.trackingCode,
      });

      // Enviar email
      await this.notificationService.sendNotification({
        tenantId,
        userId,
        type: 'order_shipped',
        channel: 'email',
        recipient: {
          email: data.customerEmail,
          name: data.customerName,
        },
        subject: `🚚 Seu pedido #${data.orderNumber} foi enviado!`,
        message: this.buildShippedEmailMessage(data),
        templateId: 'order_shipped',
        templateData: data,
        priority: 'high',
      });

      // Enviar WhatsApp se tiver telefone
      if (data.customerPhone) {
        await this.notificationService.sendNotification({
          tenantId,
          userId,
          type: 'order_shipped',
          channel: 'whatsapp',
          recipient: {
            phone: data.customerPhone,
            name: data.customerName,
          },
          message: this.buildShippedWhatsAppMessage(data),
          priority: 'high',
        });
      }

      this.logger.debug('Notificação de envio enviada com sucesso', 'ShippingNotificationService');
    } catch (error) {
      this.logger.error('Erro ao enviar notificação de envio', error.stack, 'ShippingNotificationService');
      throw error;
    }
  }

  /**
   * Enviar notificação de atualização de rastreamento
   */
  async sendTrackingUpdateNotification(
    tenantId: string,
    userId: string,
    data: ShippingNotificationData,
    event: TrackingEvent,
  ): Promise<void> {
    try {
      this.logger.debug('Enviando notificação de rastreamento', 'ShippingNotificationService', {
        orderId: data.orderId,
        status: event.status,
      });

      const statusMessages = this.getStatusMessages(event.status);

      // Enviar email
      await this.notificationService.sendNotification({
        tenantId,
        userId,
        type: 'tracking_update',
        channel: 'email',
        recipient: {
          email: data.customerEmail,
          name: data.customerName,
        },
        subject: `${statusMessages.emoji} Atualização do pedido #${data.orderNumber}`,
        message: this.buildTrackingUpdateEmailMessage(data, event, statusMessages),
        templateId: 'tracking_update',
        templateData: { ...data, event, statusMessages },
        priority: 'normal',
      });

      // Enviar WhatsApp para eventos importantes
      if (data.customerPhone && this.isImportantEvent(event.status)) {
        await this.notificationService.sendNotification({
          tenantId,
          userId,
          type: 'tracking_update',
          channel: 'whatsapp',
          recipient: {
            phone: data.customerPhone,
            name: data.customerName,
          },
          message: this.buildTrackingUpdateWhatsAppMessage(data, event, statusMessages),
          priority: 'normal',
        });
      }
    } catch (error) {
      this.logger.error('Erro ao enviar notificação de rastreamento', error.stack, 'ShippingNotificationService');
      throw error;
    }
  }

  /**
   * Enviar notificação de saiu para entrega
   */
  async sendOutForDeliveryNotification(
    tenantId: string,
    userId: string,
    data: ShippingNotificationData,
  ): Promise<void> {
    try {
      this.logger.debug('Enviando notificação de saiu para entrega', 'ShippingNotificationService');

      // Enviar email
      await this.notificationService.sendNotification({
        tenantId,
        userId,
        type: 'out_for_delivery',
        channel: 'email',
        recipient: {
          email: data.customerEmail,
          name: data.customerName,
        },
        subject: `🏃 Seu pedido #${data.orderNumber} está saindo para entrega!`,
        message: this.buildOutForDeliveryEmailMessage(data),
        templateId: 'out_for_delivery',
        templateData: data,
        priority: 'high',
      });

      // Enviar WhatsApp
      if (data.customerPhone) {
        await this.notificationService.sendNotification({
          tenantId,
          userId,
          type: 'out_for_delivery',
          channel: 'whatsapp',
          recipient: {
            phone: data.customerPhone,
            name: data.customerName,
          },
          message: this.buildOutForDeliveryWhatsAppMessage(data),
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.error('Erro ao enviar notificação de saiu para entrega', error.stack, 'ShippingNotificationService');
      throw error;
    }
  }

  /**
   * Enviar notificação de pedido entregue
   */
  async sendDeliveredNotification(
    tenantId: string,
    userId: string,
    data: ShippingNotificationData,
  ): Promise<void> {
    try {
      this.logger.debug('Enviando notificação de entrega', 'ShippingNotificationService');

      // Enviar email
      await this.notificationService.sendNotification({
        tenantId,
        userId,
        type: 'order_delivered',
        channel: 'email',
        recipient: {
          email: data.customerEmail,
          name: data.customerName,
        },
        subject: `🎉 Seu pedido #${data.orderNumber} foi entregue!`,
        message: this.buildDeliveredEmailMessage(data),
        templateId: 'order_delivered',
        templateData: data,
        priority: 'high',
      });

      // Enviar WhatsApp
      if (data.customerPhone) {
        await this.notificationService.sendNotification({
          tenantId,
          userId,
          type: 'order_delivered',
          channel: 'whatsapp',
          recipient: {
            phone: data.customerPhone,
            name: data.customerName,
          },
          message: this.buildDeliveredWhatsAppMessage(data),
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.error('Erro ao enviar notificação de entrega', error.stack, 'ShippingNotificationService');
      throw error;
    }
  }

  /**
   * Gerar URL de rastreamento
   */
  getTrackingUrl(carrier: string, trackingCode: string): string {
    const urls: Record<string, string> = {
      correios: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
      sedex: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
      pac: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
      jadlog: `https://www.jadlog.com.br/jadlog/tracking?cte=${trackingCode}`,
    };

    return urls[carrier.toLowerCase()] || `https://www.google.com/search?q=${trackingCode}+rastreamento`;
  }

  // Métodos privados para construir mensagens

  private getStatusMessages(status: string): { emoji: string; title: string; description: string } {
    const messages: Record<string, { emoji: string; title: string; description: string }> = {
      shipped: {
        emoji: '🚚',
        title: 'Pedido enviado',
        description: 'Seu pedido foi postado e está a caminho!',
      },
      in_transit: {
        emoji: '🚛',
        title: 'Em trânsito',
        description: 'Seu pedido está em trânsito para o destino.',
      },
      out_for_delivery: {
        emoji: '🏃',
        title: 'Saiu para entrega',
        description: 'Seu pedido está saindo para entrega hoje!',
      },
      delivered: {
        emoji: '✅',
        title: 'Entregue',
        description: 'Seu pedido foi entregue com sucesso!',
      },
      failed_delivery: {
        emoji: '⚠️',
        title: 'Tentativa de entrega',
        description: 'Houve uma tentativa de entrega sem sucesso.',
      },
    };

    return messages[status] || {
      emoji: '📦',
      title: 'Atualização',
      description: 'Há uma atualização no seu pedido.',
    };
  }

  private isImportantEvent(status: string): boolean {
    return ['out_for_delivery', 'delivered', 'failed_delivery'].includes(status);
  }

  private buildShippedEmailMessage(data: ShippingNotificationData): string {
    return `
      <h2>Olá, ${data.customerName}!</h2>
      <p>Ótimas notícias! Seu pedido <strong>#${data.orderNumber}</strong> foi enviado!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Código de Rastreio:</strong> ${data.trackingCode}</p>
        <p><strong>Transportadora:</strong> ${data.carrierName}</p>
        ${data.estimatedDelivery ? `<p><strong>Previsão de Entrega:</strong> ${new Date(data.estimatedDelivery).toLocaleDateString('pt-BR')}</p>` : ''}
      </div>
      
      <p>
        <a href="${data.trackingUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Rastrear Pedido
        </a>
      </p>
      
      <p>Você receberá atualizações sobre o status da entrega.</p>
    `;
  }

  private buildShippedWhatsAppMessage(data: ShippingNotificationData): string {
    return `🚚 *Seu pedido foi enviado!*

Olá, ${data.customerName}!

Seu pedido *#${data.orderNumber}* está a caminho!

📦 *Código de Rastreio:* ${data.trackingCode}
🚛 *Transportadora:* ${data.carrierName}
${data.estimatedDelivery ? `📅 *Previsão:* ${new Date(data.estimatedDelivery).toLocaleDateString('pt-BR')}` : ''}

🔗 Rastreie aqui: ${data.trackingUrl}`;
  }

  private buildTrackingUpdateEmailMessage(
    data: ShippingNotificationData,
    event: TrackingEvent,
    statusMessages: { emoji: string; title: string; description: string },
  ): string {
    return `
      <h2>${statusMessages.emoji} ${statusMessages.title}</h2>
      <p>Olá, ${data.customerName}!</p>
      <p>${statusMessages.description}</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Pedido:</strong> #${data.orderNumber}</p>
        <p><strong>Status:</strong> ${event.description}</p>
        ${event.location ? `<p><strong>Local:</strong> ${event.location}</p>` : ''}
        <p><strong>Data:</strong> ${new Date(event.timestamp).toLocaleString('pt-BR')}</p>
      </div>
      
      <p>
        <a href="${data.trackingUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Ver Rastreamento Completo
        </a>
      </p>
    `;
  }

  private buildTrackingUpdateWhatsAppMessage(
    data: ShippingNotificationData,
    event: TrackingEvent,
    statusMessages: { emoji: string; title: string; description: string },
  ): string {
    return `${statusMessages.emoji} *${statusMessages.title}*

Pedido *#${data.orderNumber}*

${event.description}
${event.location ? `📍 ${event.location}` : ''}
🕐 ${new Date(event.timestamp).toLocaleString('pt-BR')}

🔗 ${data.trackingUrl}`;
  }

  private buildOutForDeliveryEmailMessage(data: ShippingNotificationData): string {
    return `
      <h2>🏃 Seu pedido está saindo para entrega!</h2>
      <p>Olá, ${data.customerName}!</p>
      <p>Seu pedido <strong>#${data.orderNumber}</strong> está saindo para entrega hoje!</p>
      
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>📦 Fique atento! O entregador pode chegar a qualquer momento.</p>
        <p>Certifique-se de que alguém estará disponível para receber.</p>
      </div>
      
      <p>
        <a href="${data.trackingUrl}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Acompanhar Entrega
        </a>
      </p>
    `;
  }

  private buildOutForDeliveryWhatsAppMessage(data: ShippingNotificationData): string {
    return `🏃 *Seu pedido está saindo para entrega!*

Olá, ${data.customerName}!

Seu pedido *#${data.orderNumber}* está saindo para entrega HOJE!

📦 Fique atento! O entregador pode chegar a qualquer momento.

🔗 Acompanhe: ${data.trackingUrl}`;
  }

  private buildDeliveredEmailMessage(data: ShippingNotificationData): string {
    return `
      <h2>🎉 Pedido entregue!</h2>
      <p>Olá, ${data.customerName}!</p>
      <p>Seu pedido <strong>#${data.orderNumber}</strong> foi entregue com sucesso!</p>
      
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>Esperamos que você aproveite seu álbum!</p>
        <p>Se tiver qualquer dúvida ou problema, entre em contato conosco.</p>
      </div>
      
      <p>
        <a href="/orders" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Ver Meus Pedidos
        </a>
      </p>
      
      <p style="margin-top: 20px;">
        <strong>Gostou do seu álbum?</strong> Deixe uma avaliação e ajude outros fotógrafos!
      </p>
    `;
  }

  private buildDeliveredWhatsAppMessage(data: ShippingNotificationData): string {
    return `🎉 *Pedido entregue!*

Olá, ${data.customerName}!

Seu pedido *#${data.orderNumber}* foi entregue com sucesso!

Esperamos que você aproveite seu álbum! 📚

Se tiver qualquer dúvida, estamos à disposição.

Obrigado por escolher a Foccus Álbuns! ❤️`;
  }
}
