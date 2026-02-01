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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { WhatsAppService, WhatsAppMessage, WhatsAppDeliveryResult } from '../services/whatsapp.service';
import { SMSService, SMSMessage, SMSDeliveryResult } from '../services/sms.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';

class SendWhatsAppDto {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
  interactive?: {
    type: 'button' | 'list';
    header?: any;
    body: { text: string };
    footer?: { text: string };
    action: any;
  };
}

class SendSMSDto {
  to: string;
  body: string;
  from?: string;
  scheduledTime?: string; // ISO date string
  validityPeriod?: number;
}

class SendBulkSMSDto {
  messages: SendSMSDto[];
}

class SendOrderConfirmationDto {
  to: string;
  channel: 'whatsapp' | 'sms';
  customerName: string;
  orderNumber: string;
  total: number;
  currency: string;
  items?: { name: string; quantity: number }[];
}

class SendCartAbandonedDto {
  to: string;
  channel: 'whatsapp' | 'sms';
  customerName: string;
  items: { name: string; quantity: number }[];
  total: number;
  currency: string;
  cartUrl: string;
}

@ApiTags('messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    private whatsappService: WhatsAppService,
    private smsService: SMSService,
  ) {}

  // WhatsApp endpoints
  @Post('whatsapp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem WhatsApp' })
  @ApiBody({ type: SendWhatsAppDto })
  @ApiResponse({ status: 200, description: 'Mensagem enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendWhatsApp(
    @Body() body: SendWhatsAppDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult> {
    if (!body.to) {
      throw new BadRequestException('Número de destino é obrigatório');
    }

    if (!body.type) {
      throw new BadRequestException('Tipo de mensagem é obrigatório');
    }

    const message: WhatsAppMessage = {
      to: body.to,
      type: body.type,
      text: body.text,
      template: body.template ? {
        name: body.template.name,
        language: { code: body.template.language || 'pt_BR' },
        components: body.template.components,
      } : undefined,
      interactive: body.interactive,
    };

    return this.whatsappService.sendMessage(message);
  }

  @Post('whatsapp/send-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem de texto WhatsApp' })
  @ApiResponse({ status: 200, description: 'Mensagem enviada' })
  async sendWhatsAppText(
    @Body() body: { to: string; text: string },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult> {
    if (!body.to || !body.text) {
      throw new BadRequestException('to e text são obrigatórios');
    }

    return this.whatsappService.sendTextMessage(body.to, body.text);
  }

  @Post('whatsapp/send-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar template WhatsApp' })
  @ApiResponse({ status: 200, description: 'Template enviado' })
  async sendWhatsAppTemplate(
    @Body() body: {
      to: string;
      templateName: string;
      language?: string;
      components?: any[];
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult> {
    if (!body.to || !body.templateName) {
      throw new BadRequestException('to e templateName são obrigatórios');
    }

    return this.whatsappService.sendTemplateMessage(
      body.to,
      body.templateName,
      body.language || 'pt_BR',
      body.components,
    );
  }

  @Post('whatsapp/send-interactive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem interativa WhatsApp' })
  @ApiResponse({ status: 200, description: 'Mensagem interativa enviada' })
  async sendWhatsAppInteractive(
    @Body() body: {
      to: string;
      header: string;
      body: string;
      buttons: { id: string; title: string }[];
      footer?: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult> {
    if (!body.to || !body.header || !body.body || !body.buttons) {
      throw new BadRequestException('to, header, body e buttons são obrigatórios');
    }

    return this.whatsappService.sendInteractiveMessage(
      body.to,
      body.header,
      body.body,
      body.buttons,
      body.footer,
    );
  }

  @Get('whatsapp/templates')
  @ApiOperation({ summary: 'Listar templates WhatsApp aprovados' })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  async getWhatsAppTemplates(): Promise<any[]> {
    return this.whatsappService.getMessageTemplates();
  }

  // Webhook do WhatsApp (público)
  @Public()
  @Get('whatsapp/webhook')
  @ApiOperation({ summary: 'Verificação do webhook WhatsApp' })
  @ApiResponse({ status: 200, description: 'Webhook verificado' })
  async verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    const result = await this.whatsappService.verifyWebhook(mode, token, challenge);
    if (!result) {
      throw new BadRequestException('Verificação falhou');
    }
    return result;
  }

  @Public()
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook do WhatsApp' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handleWhatsAppWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: boolean }> {
    // TODO: Verificar assinatura do webhook
    await this.whatsappService.processWebhook(body);
    return { received: true };
  }

  // SMS endpoints
  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar SMS' })
  @ApiBody({ type: SendSMSDto })
  @ApiResponse({ status: 200, description: 'SMS enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendSMS(
    @Body() body: SendSMSDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<SMSDeliveryResult> {
    if (!body.to || !body.body) {
      throw new BadRequestException('to e body são obrigatórios');
    }

    const message: SMSMessage = {
      to: body.to,
      body: body.body,
      from: body.from,
      scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : undefined,
      validityPeriod: body.validityPeriod,
    };

    return this.smsService.sendSMS(message);
  }

  @Post('sms/send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar SMS em lote' })
  @ApiBody({ type: SendBulkSMSDto })
  @ApiResponse({ status: 200, description: 'SMS enviados em lote' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendBulkSMS(
    @Body() body: SendBulkSMSDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<SMSDeliveryResult[]> {
    if (!body.messages || body.messages.length === 0) {
      throw new BadRequestException('Lista de mensagens é obrigatória');
    }

    if (body.messages.length > 100) {
      throw new BadRequestException('Máximo de 100 SMS por lote');
    }

    const messages: SMSMessage[] = body.messages.map(msg => ({
      to: msg.to,
      body: msg.body,
      from: msg.from,
      scheduledTime: msg.scheduledTime ? new Date(msg.scheduledTime) : undefined,
      validityPeriod: msg.validityPeriod,
    }));

    return this.smsService.sendBulkSMS(messages);
  }

  @Post('sms/verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar número de telefone' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  async validatePhoneNumber(
    @Body() body: { phone: string },
  ): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
    country?: string;
  }> {
    if (!body.phone) {
      throw new BadRequestException('Número de telefone é obrigatório');
    }

    return this.smsService.validatePhoneNumber(body.phone);
  }

  @Get('sms/delivery-status/:messageId')
  @ApiOperation({ summary: 'Consultar status de entrega SMS' })
  @ApiParam({ name: 'messageId', description: 'ID da mensagem' })
  @ApiResponse({ status: 200, description: 'Status de entrega' })
  async getSMSDeliveryStatus(
    @Param('messageId') messageId: string,
  ): Promise<{
    status: string;
    timestamp?: Date;
    details?: string;
    cost?: { amount: number; currency: string };
  }> {
    if (!messageId) {
      throw new BadRequestException('messageId é obrigatório');
    }

    return this.smsService.getDeliveryStatus(messageId);
  }

  // Endpoints de conveniência para casos comuns
  @Post('order-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar confirmação de pedido via WhatsApp/SMS' })
  @ApiBody({ type: SendOrderConfirmationDto })
  @ApiResponse({ status: 200, description: 'Confirmação enviada' })
  async sendOrderConfirmation(
    @Body() body: SendOrderConfirmationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult | SMSDeliveryResult> {
    if (!body.to || !body.channel || !body.customerName || !body.orderNumber) {
      throw new BadRequestException('to, channel, customerName e orderNumber são obrigatórios');
    }

    const orderData = {
      customerName: body.customerName,
      orderNumber: body.orderNumber,
      total: body.total,
      currency: body.currency,
      items: body.items || [],
    };

    if (body.channel === 'whatsapp') {
      return this.whatsappService.sendOrderConfirmation(body.to, orderData);
    } else {
      return this.smsService.sendOrderConfirmation(body.to, orderData);
    }
  }

  @Post('order-status-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar atualização de status via WhatsApp/SMS' })
  @ApiResponse({ status: 200, description: 'Atualização enviada' })
  async sendOrderStatusUpdate(
    @Body() body: {
      to: string;
      channel: 'whatsapp' | 'sms';
      customerName: string;
      orderNumber: string;
      status: string;
      trackingCode?: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult | SMSDeliveryResult> {
    if (!body.to || !body.channel || !body.customerName || !body.orderNumber || !body.status) {
      throw new BadRequestException('to, channel, customerName, orderNumber e status são obrigatórios');
    }

    const orderData = {
      customerName: body.customerName,
      orderNumber: body.orderNumber,
      status: body.status,
      trackingCode: body.trackingCode,
    };

    if (body.channel === 'whatsapp') {
      return this.whatsappService.sendOrderStatusUpdate(body.to, orderData);
    } else {
      return this.smsService.sendOrderStatusUpdate(body.to, orderData);
    }
  }

  @Post('cart-abandoned')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar lembrete de carrinho abandonado' })
  @ApiBody({ type: SendCartAbandonedDto })
  @ApiResponse({ status: 200, description: 'Lembrete enviado' })
  async sendCartAbandonedReminder(
    @Body() body: SendCartAbandonedDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<WhatsAppDeliveryResult | SMSDeliveryResult> {
    if (!body.to || !body.channel || !body.customerName || !body.cartUrl) {
      throw new BadRequestException('to, channel, customerName e cartUrl são obrigatórios');
    }

    const cartData = {
      customerName: body.customerName,
      items: body.items,
      total: body.total,
      currency: body.currency,
      cartUrl: body.cartUrl,
    };

    if (body.channel === 'whatsapp') {
      return this.whatsappService.sendCartAbandonedReminder(body.to, cartData);
    } else {
      return this.smsService.sendCartAbandonedReminder(body.to, cartData);
    }
  }

  @Post('verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código de verificação via SMS' })
  @ApiResponse({ status: 200, description: 'Código enviado' })
  async sendVerificationCode(
    @Body() body: {
      to: string;
      code: string;
      expirationMinutes?: number;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<SMSDeliveryResult> {
    if (!body.to || !body.code) {
      throw new BadRequestException('to e code são obrigatórios');
    }

    return this.smsService.sendVerificationCode(
      body.to,
      body.code,
      body.expirationMinutes || 5,
    );
  }

  // Endpoints de teste e demonstração
  @Post('test/send-samples')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagens de exemplo' })
  @ApiResponse({ status: 200, description: 'Mensagens de exemplo enviadas' })
  async sendSampleMessages(
    @Body() body: { 
      whatsappNumber?: string; 
      smsNumber?: string; 
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    whatsapp: WhatsAppDeliveryResult[];
    sms: SMSDeliveryResult[];
    message: string;
  }> {
    const whatsappResults: WhatsAppDeliveryResult[] = [];
    const smsResults: SMSDeliveryResult[] = [];

    // Dados de exemplo
    const sampleData = {
      customerName: 'João Silva',
      orderNumber: 'PED-2024-001',
      total: 89.90,
      currency: 'BRL',
      items: [{ name: 'Fotolivro A4', quantity: 1 }],
      cartUrl: 'https://app.exemplo.com/cart',
    };

    // Testes WhatsApp
    if (body.whatsappNumber) {
      try {
        // Mensagem de texto
        const textResult = await this.whatsappService.sendTextMessage(
          body.whatsappNumber,
          '🎉 Esta é uma mensagem de teste do WhatsApp!'
        );
        whatsappResults.push(textResult);

        // Confirmação de pedido
        const orderResult = await this.whatsappService.sendOrderConfirmation(
          body.whatsappNumber,
          sampleData
        );
        whatsappResults.push(orderResult);

        // Carrinho abandonado
        const cartResult = await this.whatsappService.sendCartAbandonedReminder(
          body.whatsappNumber,
          sampleData
        );
        whatsappResults.push(cartResult);
      } catch (error) {
        console.error('Erro nos testes WhatsApp:', error);
      }
    }

    // Testes SMS
    if (body.smsNumber) {
      try {
        // SMS simples
        const textResult = await this.smsService.sendSMS({
          to: body.smsNumber,
          body: '📱 Esta é uma mensagem de teste via SMS!',
        });
        smsResults.push(textResult);

        // Confirmação de pedido
        const orderResult = await this.smsService.sendOrderConfirmation(
          body.smsNumber,
          sampleData
        );
        smsResults.push(orderResult);

        // Código de verificação
        const codeResult = await this.smsService.sendVerificationCode(
          body.smsNumber,
          '123456',
          5
        );
        smsResults.push(codeResult);
      } catch (error) {
        console.error('Erro nos testes SMS:', error);
      }
    }

    const whatsappSuccess = whatsappResults.filter(r => r.success).length;
    const smsSuccess = smsResults.filter(r => r.success).length;

    return {
      whatsapp: whatsappResults,
      sms: smsResults,
      message: `Testes executados: ${whatsappSuccess}/${whatsappResults.length} WhatsApp, ${smsSuccess}/${smsResults.length} SMS`,
    };
  }

  @Get('test/providers-status')
  @ApiOperation({ summary: 'Verificar status dos provedores' })
  @ApiResponse({ status: 200, description: 'Status dos provedores' })
  async getProvidersStatus(): Promise<{
    whatsapp: {
      configured: boolean;
      provider: string;
      status: 'active' | 'inactive' | 'error';
    };
    sms: {
      configured: boolean;
      provider: string;
      status: 'active' | 'inactive' | 'error';
    };
  }> {
    // Verificar configurações
    const whatsappConfigured = !!(
      process.env.WHATSAPP_ACCESS_TOKEN && 
      process.env.WHATSAPP_PHONE_NUMBER_ID
    );

    const smsProvider = process.env.SMS_PROVIDER || 'mock';
    const smsConfigured = smsProvider === 'mock' || !!(
      process.env.TWILIO_ACCOUNT_SID || 
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.ZENVIA_API_TOKEN ||
      process.env.TOTALVOICE_ACCESS_TOKEN
    );

    return {
      whatsapp: {
        configured: whatsappConfigured,
        provider: 'whatsapp_business',
        status: whatsappConfigured ? 'active' : 'inactive',
      },
      sms: {
        configured: smsConfigured,
        provider: smsProvider,
        status: smsConfigured ? 'active' : 'inactive',
      },
    };
  }
}