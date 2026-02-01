import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { TemplateService } from '../services/template.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import {
  SendEmailRequest,
  EmailDeliveryResult,
  EmailTemplate,
} from '../entities/notification.entity';

class SendEmailDto {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string; // ISO date string
}

class SendBulkEmailDto {
  emails: SendEmailDto[];
}

class CreateTemplateDto {
  name: string;
  type: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  variables: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
  }[];
}

class PreviewTemplateDto {
  templateId: string;
  sampleData: Record<string, any>;
  language?: string;
}

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(
    private emailService: EmailService,
    private templateService: TemplateService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar email individual' })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ status: 200, description: 'Email enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendEmail(
    @Body() body: SendEmailDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<EmailDeliveryResult> {
    if (!body.to || !body.subject) {
      throw new BadRequestException('to e subject são obrigatórios');
    }

    if (!body.htmlContent && !body.textContent && !body.templateId) {
      throw new BadRequestException('É necessário fornecer conteúdo ou templateId');
    }

    const request: SendEmailRequest = {
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      htmlContent: body.htmlContent,
      textContent: body.textContent,
      templateId: body.templateId,
      templateData: body.templateData,
      replyTo: body.replyTo,
      priority: body.priority,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    };

    return this.emailService.sendEmail(request);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar emails em lote' })
  @ApiBody({ type: SendBulkEmailDto })
  @ApiResponse({ status: 200, description: 'Emails enviados em lote' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendBulkEmails(
    @Body() body: SendBulkEmailDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<EmailDeliveryResult[]> {
    if (!body.emails || body.emails.length === 0) {
      throw new BadRequestException('Lista de emails é obrigatória');
    }

    if (body.emails.length > 100) {
      throw new BadRequestException('Máximo de 100 emails por lote');
    }

    const requests: SendEmailRequest[] = body.emails.map(email => ({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      templateId: email.templateId,
      templateData: email.templateData,
      replyTo: email.replyTo,
      priority: email.priority,
      scheduledFor: email.scheduledFor ? new Date(email.scheduledFor) : undefined,
    }));

    return this.emailService.sendBulkEmails(requests);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar endereço de email' })
  @ApiResponse({ status: 200, description: 'Resultado da verificação' })
  async verifyEmail(
    @Body() body: { email: string },
  ): Promise<{
    valid: boolean;
    reason?: string;
    suggestions?: string[];
  }> {
    if (!body.email) {
      throw new BadRequestException('Email é obrigatório');
    }

    return this.emailService.verifyEmailAddress(body.email);
  }

  @Get('delivery-status/:messageId')
  @ApiOperation({ summary: 'Consultar status de entrega' })
  @ApiParam({ name: 'messageId', description: 'ID da mensagem' })
  @ApiResponse({ status: 200, description: 'Status de entrega' })
  async getDeliveryStatus(
    @Param('messageId') messageId: string,
  ): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'unknown';
    timestamp?: Date;
    details?: string;
  }> {
    if (!messageId) {
      throw new BadRequestException('messageId é obrigatório');
    }

    return this.emailService.getDeliveryStatus(messageId);
  }

  // Endpoints para templates
  @Get('templates')
  @ApiOperation({ summary: 'Listar templates de email' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  async getTemplates(
    @Query('type') type?: string,
    @Query('language') language: string = 'pt-BR',
  ): Promise<EmailTemplate[]> {
    if (type) {
      return this.templateService.getTemplatesByType(type as any, language);
    }

    // TODO: Implementar listagem de todos os templates
    return [];
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Obter template específico' })
  @ApiParam({ name: 'templateId', description: 'ID do template' })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({ status: 200, description: 'Detalhes do template' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async getTemplate(
    @Param('templateId') templateId: string,
    @Query('language') language: string = 'pt-BR',
  ): Promise<EmailTemplate> {
    const template = await this.templateService.getTemplate(templateId, language);
    
    if (!template) {
      throw new BadRequestException('Template não encontrado');
    }

    return template;
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo template' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createTemplate(
    @Body() body: CreateTemplateDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<EmailTemplate> {
    // Validar dados básicos
    if (!body.name || !body.subject || !body.htmlContent) {
      throw new BadRequestException('name, subject e htmlContent são obrigatórios');
    }

    // Validar template
    const validation = await this.templateService.validateTemplate(body as any);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Template inválido',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    return this.templateService.createTemplate({
      ...body,
      isActive: true,
      version: 1,
    } as any);
  }

  @Post('templates/:templateId/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Visualizar preview do template' })
  @ApiParam({ name: 'templateId', description: 'ID do template' })
  @ApiBody({ type: PreviewTemplateDto })
  @ApiResponse({ status: 200, description: 'Preview do template' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async previewTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { sampleData: Record<string, any>; language?: string },
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
  }> {
    if (!body.sampleData) {
      throw new BadRequestException('sampleData é obrigatório');
    }

    return this.templateService.previewTemplate(
      templateId,
      body.sampleData,
      body.language || 'pt-BR',
    );
  }

  @Post('templates/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar template' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  async validateTemplate(
    @Body() body: Partial<EmailTemplate>,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.templateService.validateTemplate(body);
  }

  // Endpoints de teste e demonstração
  @Post('test/send-sample')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar emails de teste' })
  @ApiResponse({ status: 200, description: 'Emails de teste enviados' })
  async sendTestEmails(
    @Body() body: { recipientEmail?: string },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    results: EmailDeliveryResult[];
    message: string;
  }> {
    const recipientEmail = body.recipientEmail || user?.email || 'test@exemplo.com';
    const results: EmailDeliveryResult[] = [];

    // Teste 1: Email simples
    const simpleEmailResult = await this.emailService.sendEmail({
      to: recipientEmail,
      subject: 'Teste de Email Simples',
      htmlContent: '<h1>Olá!</h1><p>Este é um email de teste simples.</p>',
      textContent: 'Olá! Este é um email de teste simples.',
    });
    results.push(simpleEmailResult);

    // Teste 2: Email com template
    const templateEmailResult = await this.emailService.sendEmail({
      to: recipientEmail,
      subject: 'Teste com Template',
      templateId: 'welcome',
      templateData: {
        name: 'Usuário Teste',
        verificationUrl: 'https://app.exemplo.com/verify?token=test123',
      },
    });
    results.push(templateEmailResult);

    // Teste 3: Email com prioridade alta
    const priorityEmailResult = await this.emailService.sendEmail({
      to: recipientEmail,
      subject: 'Teste de Prioridade Alta',
      htmlContent: '<h1>Email Urgente!</h1><p>Este email tem prioridade alta.</p>',
      textContent: 'Email Urgente! Este email tem prioridade alta.',
      priority: 'high',
    });
    results.push(priorityEmailResult);

    const successCount = results.filter(r => r.success).length;

    return {
      results,
      message: `${successCount}/${results.length} emails de teste enviados com sucesso`,
    };
  }

  @Post('test/templates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar renderização de templates' })
  @ApiResponse({ status: 200, description: 'Teste de templates executado' })
  async testTemplates(): Promise<{
    templates: any[];
    message: string;
  }> {
    const testData = {
      customerName: 'João Silva',
      orderNumber: 'PED-2024-001',
      total: 89.90,
      currency: 'BRL',
      items: [
        {
          productName: 'Fotolivro A4 Capa Dura',
          quantity: 1,
          unitPrice: 89.90,
        },
      ],
    };

    const templates = [];

    // Testar template de confirmação de pedido
    try {
      const orderConfirmation = await this.templateService.previewTemplate(
        'order_confirmation',
        testData,
      );
      templates.push({
        templateId: 'order_confirmation',
        success: true,
        preview: orderConfirmation,
      });
    } catch (error) {
      templates.push({
        templateId: 'order_confirmation',
        success: false,
        error: error.message,
      });
    }

    // Testar template de carrinho abandonado
    try {
      const cartAbandoned = await this.templateService.previewTemplate(
        'cart_abandoned',
        {
          ...testData,
          cartUrl: 'https://app.exemplo.com/cart',
        },
      );
      templates.push({
        templateId: 'cart_abandoned',
        success: true,
        preview: cartAbandoned,
      });
    } catch (error) {
      templates.push({
        templateId: 'cart_abandoned',
        success: false,
        error: error.message,
      });
    }

    // Testar template de boas-vindas
    try {
      const welcome = await this.templateService.previewTemplate(
        'welcome',
        {
          name: 'João Silva',
          verificationUrl: 'https://app.exemplo.com/verify?token=abc123',
        },
      );
      templates.push({
        templateId: 'welcome',
        success: true,
        preview: welcome,
      });
    } catch (error) {
      templates.push({
        templateId: 'welcome',
        success: false,
        error: error.message,
      });
    }

    const successCount = templates.filter(t => t.success).length;

    return {
      templates,
      message: `${successCount}/${templates.length} templates testados com sucesso`,
    };
  }
}