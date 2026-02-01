import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface WhatsAppMessage {
  to: string; // Número no formato internacional (+5511999999999)
  type: 'text' | 'template' | 'media' | 'interactive';
  
  // Para mensagens de texto
  text?: {
    body: string;
    preview_url?: boolean;
  };
  
  // Para templates aprovados
  template?: {
    name: string;
    language: {
      code: string; // pt_BR, en_US, etc.
    };
    components?: WhatsAppTemplateComponent[];
  };
  
  // Para mídia
  media?: {
    type: 'image' | 'document' | 'video' | 'audio';
    url?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  
  // Para mensagens interativas
  interactive?: {
    type: 'button' | 'list';
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: { url: string };
      video?: { url: string };
      document?: { url: string; filename: string };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: WhatsAppButton[];
      button?: string;
      sections?: WhatsAppSection[];
    };
  };
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters?: WhatsAppParameter[];
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    url: string;
  };
  document?: {
    url: string;
    filename: string;
  };
  video?: {
    url: string;
  };
}

export interface WhatsAppButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface WhatsAppSection {
  title: string;
  rows: WhatsAppRow[];
}

export interface WhatsAppRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
  contacts?: {
    input: string;
    wa_id: string;
  }[];
}

export interface WhatsAppWebhookEvent {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: {
            name: string;
          };
          wa_id: string;
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }[];
        statuses?: {
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: {
            code: number;
            title: string;
            message: string;
          }[];
        }[];
      };
      field: string;
    }[];
  }[];
}

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly webhookVerifyToken: string;

  constructor(private logger: LoggerService) {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult> {
    try {
      this.logger.debug(
        'Enviando mensagem WhatsApp',
        'WhatsAppService',
        { to: message.to, type: message.type },
      );

      // Validar configuração
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp não configurado corretamente');
      }

      // Validar número de telefone
      const phoneNumber = this.formatPhoneNumber(message.to);
      if (!phoneNumber) {
        throw new Error('Número de telefone inválido');
      }

      // Preparar payload
      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        ...this.buildMessagePayload(message),
      };

      // Enviar via API do WhatsApp Business
      const response = await this.callWhatsAppAPI('messages', payload);

      if (response.messages && response.messages.length > 0) {
        return {
          success: true,
          messageId: response.messages[0].id,
          provider: 'whatsapp_business',
          timestamp: new Date(),
          contacts: response.contacts,
        };
      } else {
        return {
          success: false,
          error: 'Resposta inválida da API',
          provider: 'whatsapp_business',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem WhatsApp', error.stack, 'WhatsAppService');
      return {
        success: false,
        error: error.message,
        provider: 'whatsapp_business',
        timestamp: new Date(),
      };
    }
  }

  async sendTextMessage(to: string, text: string): Promise<WhatsAppDeliveryResult> {
    return this.sendMessage({
      to,
      type: 'text',
      text: {
        body: text,
        preview_url: true,
      },
    });
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string = 'pt_BR',
    components?: WhatsAppTemplateComponent[],
  ): Promise<WhatsAppDeliveryResult> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language,
        },
        components,
      },
    });
  }

  async sendOrderConfirmation(
    to: string,
    orderData: {
      customerName: string;
      orderNumber: string;
      total: number;
      currency: string;
      items: { name: string; quantity: number }[];
    },
  ): Promise<WhatsAppDeliveryResult> {
    // Usar template aprovado ou mensagem de texto
    const message = `🎉 *Pedido Confirmado!*

Olá ${orderData.customerName}!

Seu pedido *${orderData.orderNumber}* foi confirmado com sucesso.

📦 *Itens:*
${orderData.items.map(item => `• ${item.name} (${item.quantity}x)`).join('\n')}

💰 *Total:* ${this.formatCurrency(orderData.total, orderData.currency)}

Você receberá atualizações sobre o status do seu pedido.

Obrigado por escolher nossa loja! 🙏`;

    return this.sendTextMessage(to, message);
  }

  async sendOrderStatusUpdate(
    to: string,
    orderData: {
      customerName: string;
      orderNumber: string;
      status: string;
      trackingCode?: string;
    },
  ): Promise<WhatsAppDeliveryResult> {
    let message = `📦 *Atualização do Pedido*

Olá ${orderData.customerName}!

Seu pedido *${orderData.orderNumber}* foi atualizado:

🔄 *Status:* ${this.getStatusEmoji(orderData.status)} ${orderData.status}`;

    if (orderData.trackingCode) {
      message += `\n\n📍 *Código de Rastreamento:* ${orderData.trackingCode}`;
    }

    message += '\n\nAcompanhe seu pedido pelo nosso site ou app.';

    return this.sendTextMessage(to, message);
  }

  async sendCartAbandonedReminder(
    to: string,
    cartData: {
      customerName: string;
      items: { name: string; quantity: number }[];
      total: number;
      currency: string;
      cartUrl: string;
    },
  ): Promise<WhatsAppDeliveryResult> {
    const message = `🛒 *Você esqueceu algo!*

Olá ${cartData.customerName}!

Você deixou alguns itens no seu carrinho:

${cartData.items.map(item => `• ${item.name} (${item.quantity}x)`).join('\n')}

💰 *Total:* ${this.formatCurrency(cartData.total, cartData.currency)}

Finalize sua compra agora e ganhe *10% de desconto*! 🎁

👆 Clique no link para continuar: ${cartData.cartUrl}

⏰ Esta oferta expira em 24 horas.`;

    return this.sendTextMessage(to, message);
  }

  async sendInteractiveMessage(
    to: string,
    header: string,
    body: string,
    buttons: { id: string; title: string }[],
    footer?: string,
  ): Promise<WhatsAppDeliveryResult> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: header,
        },
        body: {
          text: body,
        },
        footer: footer ? {
          text: footer,
        } : undefined,
        action: {
          buttons: buttons.map(button => ({
            type: 'reply',
            reply: {
              id: button.id,
              title: button.title,
            },
          })),
        },
      },
    });
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      this.logger.debug('Webhook do WhatsApp verificado', 'WhatsAppService');
      return challenge;
    }
    return null;
  }

  async processWebhook(event: WhatsAppWebhookEvent): Promise<void> {
    try {
      this.logger.debug('Processando webhook do WhatsApp', 'WhatsAppService', { event });

      for (const entry of event.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            // Processar mensagens recebidas
            if (change.value.messages) {
              for (const message of change.value.messages) {
                await this.handleIncomingMessage(message);
              }
            }

            // Processar status de entrega
            if (change.value.statuses) {
              for (const status of change.value.statuses) {
                await this.handleDeliveryStatus(status);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Erro ao processar webhook do WhatsApp', error.stack, 'WhatsAppService');
    }
  }

  async getMessageTemplates(): Promise<any[]> {
    try {
      const response = await this.callWhatsAppAPI(
        `${this.phoneNumberId}/message_templates`,
        null,
        'GET',
      );
      return response.data || [];
    } catch (error) {
      this.logger.error('Erro ao buscar templates', error.stack, 'WhatsAppService');
      return [];
    }
  }

  // Métodos privados
  private buildMessagePayload(message: WhatsAppMessage): any {
    const payload: any = {
      type: message.type,
    };

    switch (message.type) {
      case 'text':
        payload.text = message.text;
        break;
      case 'template':
        payload.template = message.template;
        break;
      case 'media':
        payload[message.media!.type] = message.media;
        break;
      case 'interactive':
        payload.interactive = message.interactive;
        break;
    }

    return payload;
  }

  private async callWhatsAppAPI(endpoint: string, data?: any, method: string = 'POST'): Promise<any> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    // Simular chamada da API (em produção, usar fetch real)
    await this.simulateDelay(500, 1500);
    
    // Simular resposta de sucesso
    if (Math.random() > 0.05) { // 95% de sucesso
      return {
        messages: data ? [{ id: `wamid.${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }] : undefined,
        contacts: data ? [{ input: data.to, wa_id: data.to }] : undefined,
        data: method === 'GET' ? [] : undefined,
      };
    } else {
      throw new Error('WhatsApp API error');
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remover caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Validar formato brasileiro
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned;
    }
    
    return null;
  }

  private formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  private getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      'pending': '⏳',
      'paid': '✅',
      'production': '🏭',
      'shipped': '🚚',
      'delivered': '📦',
      'cancelled': '❌',
    };
    return statusEmojis[status.toLowerCase()] || '📋';
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    this.logger.debug(
      'Mensagem recebida no WhatsApp',
      'WhatsAppService',
      { from: message.from, type: message.type },
    );

    // TODO: Implementar lógica de resposta automática
    // - Comandos de ajuda
    // - Status de pedidos
    // - Atendimento ao cliente
  }

  private async handleDeliveryStatus(status: any): Promise<void> {
    this.logger.debug(
      'Status de entrega atualizado',
      'WhatsAppService',
      { messageId: status.id, status: status.status },
    );

    // TODO: Atualizar status no banco de dados
    // TODO: Disparar eventos para outros serviços
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}