import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import {
  SendEmailRequest,
  EmailDeliveryResult,
  EmailProviderConfig,
  EmailAttachment,
} from '../entities/notification.entity';

@Injectable()
export class EmailService {
  private config: EmailProviderConfig;

  constructor(private logger: LoggerService) {
    // Configurar provedor baseado nas variáveis de ambiente
    this.config = this.loadEmailConfig();
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      this.logger.debug(
        'Enviando email',
        'EmailService',
        { 
          to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
          subject: request.subject,
          provider: this.config.provider,
        },
      );

      // Validar request
      this.validateEmailRequest(request);

      // Enviar baseado no provedor configurado
      let result: EmailDeliveryResult;

      switch (this.config.provider) {
        case 'smtp':
          result = await this.sendViaSMTP(request);
          break;
        case 'ses':
          result = await this.sendViaSES(request);
          break;
        case 'sendgrid':
          result = await this.sendViaSendGrid(request);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(request);
          break;
        case 'postmark':
          result = await this.sendViaPostmark(request);
          break;
        default:
          throw new Error(`Provedor de email não suportado: ${this.config.provider}`);
      }

      if (result.success) {
        this.logger.debug(
          'Email enviado com sucesso',
          'EmailService',
          { messageId: result.messageId, provider: result.provider },
        );
      } else {
        this.logger.error(
          'Falha ao enviar email',
          result.error || 'Erro desconhecido',
          'EmailService',
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Erro ao enviar email', error.stack, 'EmailService');
      return {
        success: false,
        error: error.message,
        provider: this.config.provider,
        timestamp: new Date(),
      };
    }
  }

  async sendBulkEmails(requests: SendEmailRequest[]): Promise<EmailDeliveryResult[]> {
    try {
      this.logger.debug(
        'Enviando emails em lote',
        'EmailService',
        { count: requests.length, provider: this.config.provider },
      );

      const results: EmailDeliveryResult[] = [];

      // Processar em paralelo com limite
      const batchSize = 10;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(request => this.sendEmail(request))
        );
        results.push(...batchResults);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.debug(
        'Lote de emails processado',
        'EmailService',
        { total: results.length, success: successCount, failed: failureCount },
      );

      return results;
    } catch (error) {
      this.logger.error('Erro ao enviar emails em lote', error.stack, 'EmailService');
      throw error;
    }
  }

  async verifyEmailAddress(email: string): Promise<{
    valid: boolean;
    reason?: string;
    suggestions?: string[];
  }> {
    try {
      // Validação básica de formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          valid: false,
          reason: 'Formato de email inválido',
        };
      }

      // TODO: Implementar verificação mais avançada
      // - Verificar se domínio existe
      // - Verificar se mailbox existe
      // - Detectar emails temporários
      // - Sugerir correções para typos

      return {
        valid: true,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar email', error.stack, 'EmailService');
      return {
        valid: false,
        reason: 'Erro na verificação',
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'unknown';
    timestamp?: Date;
    details?: string;
  }> {
    try {
      // TODO: Implementar consulta de status baseada no provedor
      // Por enquanto, retornar status mock
      return {
        status: 'delivered',
        timestamp: new Date(),
        details: 'Email entregue com sucesso',
      };
    } catch (error) {
      this.logger.error('Erro ao consultar status de entrega', error.stack, 'EmailService');
      return {
        status: 'unknown',
        details: 'Erro ao consultar status',
      };
    }
  }

  // Implementações específicas por provedor
  private async sendViaSMTP(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      // TODO: Implementar envio via SMTP usando nodemailer
      // Por enquanto, simular envio
      await this.simulateDelay(500, 2000);

      const success = Math.random() > 0.05; // 95% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'smtp',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'SMTP connection failed',
          provider: 'smtp',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'smtp',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaSES(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      // TODO: Implementar envio via AWS SES
      await this.simulateDelay(300, 1000);

      const success = Math.random() > 0.02; // 98% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'ses',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'SES quota exceeded',
          provider: 'ses',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'ses',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaSendGrid(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      // TODO: Implementar envio via SendGrid
      await this.simulateDelay(200, 800);

      const success = Math.random() > 0.03; // 97% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'sendgrid',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'SendGrid API error',
          provider: 'sendgrid',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaMailgun(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      // TODO: Implementar envio via Mailgun
      await this.simulateDelay(250, 900);

      const success = Math.random() > 0.04; // 96% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `mg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'mailgun',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'Mailgun delivery failed',
          provider: 'mailgun',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'mailgun',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaPostmark(request: SendEmailRequest): Promise<EmailDeliveryResult> {
    try {
      // TODO: Implementar envio via Postmark
      await this.simulateDelay(150, 600);

      const success = Math.random() > 0.01; // 99% de sucesso
      
      if (success) {
        return {
          success: true,
          messageId: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'postmark',
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          error: 'Postmark server error',
          provider: 'postmark',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'postmark',
        timestamp: new Date(),
      };
    }
  }

  // Métodos auxiliares
  private loadEmailConfig(): EmailProviderConfig {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp') as EmailProviderConfig['provider'];

    const config: EmailProviderConfig = { provider };

    switch (provider) {
      case 'smtp':
        config.smtp = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        };
        break;

      case 'ses':
        config.ses = {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        };
        break;

      case 'sendgrid':
        config.sendgrid = {
          apiKey: process.env.SENDGRID_API_KEY || '',
        };
        break;

      case 'mailgun':
        config.mailgun = {
          apiKey: process.env.MAILGUN_API_KEY || '',
          domain: process.env.MAILGUN_DOMAIN || '',
        };
        break;

      case 'postmark':
        config.postmark = {
          serverToken: process.env.POSTMARK_SERVER_TOKEN || '',
        };
        break;
    }

    return config;
  }

  private validateEmailRequest(request: SendEmailRequest): void {
    if (!request.to || (Array.isArray(request.to) && request.to.length === 0)) {
      throw new Error('Destinatário é obrigatório');
    }

    if (!request.subject || request.subject.trim().length === 0) {
      throw new Error('Assunto é obrigatório');
    }

    if (!request.htmlContent && !request.textContent && !request.templateId) {
      throw new Error('Conteúdo do email é obrigatório');
    }

    // Validar emails
    const emails = Array.isArray(request.to) ? request.to : [request.to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new Error(`Email inválido: ${email}`);
      }
    }
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Métodos para templates e formatação
  async formatEmailContent(
    htmlContent: string,
    textContent: string,
    data: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    try {
      // TODO: Implementar formatação avançada
      // - Substituir variáveis
      // - Aplicar estilos
      // - Otimizar para diferentes clientes de email

      let html = htmlContent;
      let text = textContent;

      // Substituição simples de variáveis
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        html = html.replace(new RegExp(placeholder, 'g'), String(value));
        text = text.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return { html, text };
    } catch (error) {
      this.logger.error('Erro ao formatar conteúdo do email', error.stack, 'EmailService');
      return { html: htmlContent, text: textContent };
    }
  }

  async addUnsubscribeLink(
    htmlContent: string,
    textContent: string,
    userId: string,
    tenantId: string,
  ): Promise<{ html: string; text: string }> {
    try {
      const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?user=${userId}&tenant=${tenantId}`;
      
      const unsubscribeHtml = `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Se você não deseja mais receber estes emails, <a href="${unsubscribeUrl}">clique aqui para cancelar a inscrição</a>.</p>
        </div>
      `;

      const unsubscribeText = `\n\nSe você não deseja mais receber estes emails, acesse: ${unsubscribeUrl}`;

      return {
        html: htmlContent + unsubscribeHtml,
        text: textContent + unsubscribeText,
      };
    } catch (error) {
      this.logger.error('Erro ao adicionar link de descadastro', error.stack, 'EmailService');
      return { html: htmlContent, text: textContent };
    }
  }
}