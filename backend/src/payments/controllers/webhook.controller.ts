import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from '../services/payment.service';
import { WebhookService } from '../services/webhook.service';
import { PaymentMethod } from '../entities/payment.entity';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private paymentService: PaymentService,
    private webhookService: WebhookService,
  ) {}

  @Public()
  @Post('pix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook PIX' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 400, description: 'Webhook inválido' })
  async handlePixWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ): Promise<{ success: boolean }> {
    try {
      const signature = headers['x-signature'] || headers['signature'] || '';
      const payload = req.rawBody?.toString() || JSON.stringify(body);

      // Validar webhook
      const validation = await this.webhookService.validateWebhook(
        'pix',
        payload,
        signature,
        headers,
      );

      if (!validation.isValid) {
        throw new BadRequestException(`Webhook inválido: ${validation.reason}`);
      }

      // Processar webhook
      const webhook = await this.webhookService.processWebhook(
        'pix',
        body,
        signature,
        headers,
      );

      // Processar pagamento
      const processed = await this.paymentService.processWebhook('pix', body, signature);

      if (processed) {
        await this.webhookService.markWebhookAsProcessed(webhook.id);
      }

      return { success: processed };
    } catch (error) {
      // Log do erro mas retornar 200 para evitar reenvios desnecessários
      console.error('Erro no webhook PIX:', error);
      return { success: false };
    }
  }

  @Public()
  @Post('credit-card')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Cartão de Crédito' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handleCreditCardWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ): Promise<{ success: boolean }> {
    try {
      const signature = headers['x-signature'] || headers['signature'] || '';
      const payload = req.rawBody?.toString() || JSON.stringify(body);

      const validation = await this.webhookService.validateWebhook(
        'credit_card',
        payload,
        signature,
        headers,
      );

      if (!validation.isValid) {
        throw new BadRequestException(`Webhook inválido: ${validation.reason}`);
      }

      const webhook = await this.webhookService.processWebhook(
        'credit_card',
        body,
        signature,
        headers,
      );

      const processed = await this.paymentService.processWebhook('credit_card', body, signature);

      if (processed) {
        await this.webhookService.markWebhookAsProcessed(webhook.id);
      }

      return { success: processed };
    } catch (error) {
      console.error('Erro no webhook cartão:', error);
      return { success: false };
    }
  }

  @Public()
  @Post('boleto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Boleto' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handleBoletoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ): Promise<{ success: boolean }> {
    try {
      const signature = headers['x-signature'] || headers['signature'] || '';
      const payload = req.rawBody?.toString() || JSON.stringify(body);

      const validation = await this.webhookService.validateWebhook(
        'boleto',
        payload,
        signature,
        headers,
      );

      if (!validation.isValid) {
        throw new BadRequestException(`Webhook inválido: ${validation.reason}`);
      }

      const webhook = await this.webhookService.processWebhook(
        'boleto',
        body,
        signature,
        headers,
      );

      const processed = await this.paymentService.processWebhook('boleto', body, signature);

      if (processed) {
        await this.webhookService.markWebhookAsProcessed(webhook.id);
      }

      return { success: processed };
    } catch (error) {
      console.error('Erro no webhook boleto:', error);
      return { success: false };
    }
  }

  // Endpoint genérico para webhooks
  @Public()
  @Post(':method')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleGenericWebhook(
    @Param('method') method: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ): Promise<{ success: boolean }> {
    try {
      const paymentMethod = method as PaymentMethod;
      const signature = headers['x-signature'] || headers['signature'] || '';
      const payload = req.rawBody?.toString() || JSON.stringify(body);

      const validation = await this.webhookService.validateWebhook(
        paymentMethod,
        payload,
        signature,
        headers,
      );

      if (!validation.isValid) {
        throw new BadRequestException(`Webhook inválido: ${validation.reason}`);
      }

      const webhook = await this.webhookService.processWebhook(
        paymentMethod,
        body,
        signature,
        headers,
      );

      const processed = await this.paymentService.processWebhook(paymentMethod, body, signature);

      if (processed) {
        await this.webhookService.markWebhookAsProcessed(webhook.id);
      }

      return { success: processed };
    } catch (error) {
      console.error(`Erro no webhook ${method}:`, error);
      return { success: false };
    }
  }

  // Endpoints administrativos (protegidos)
  @Get('history/:paymentId')
  @ApiOperation({ summary: 'Histórico de webhooks do pagamento' })
  @ApiResponse({ status: 200, description: 'Histórico de webhooks' })
  async getWebhookHistory(
    @Param('paymentId') paymentId: string,
  ): Promise<any[]> {
    return this.webhookService.getWebhookHistory(paymentId);
  }

  @Post('reprocess-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessar webhooks falhados' })
  @ApiResponse({ status: 200, description: 'Webhooks reprocessados' })
  async reprocessFailedWebhooks(): Promise<{ reprocessedCount: number }> {
    const reprocessedCount = await this.webhookService.reprocessFailedWebhooks();
    return { reprocessedCount };
  }

  @Post('test/:method')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar webhook' })
  @ApiResponse({ status: 200, description: 'Teste de webhook' })
  async testWebhook(
    @Param('method') method: PaymentMethod,
    @Body() body: { url: string },
  ): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> {
    if (!body.url) {
      throw new BadRequestException('URL é obrigatória');
    }

    return this.webhookService.testWebhook(method, body.url);
  }

  @Post('configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configurar URLs de webhook' })
  @ApiResponse({ status: 200, description: 'URLs configuradas' })
  async configureWebhookUrls(
    @Body() body: {
      tenantId: string;
      urls: {
        pix?: string;
        creditCard?: string;
        boleto?: string;
      };
    },
  ): Promise<{ success: boolean }> {
    if (!body.tenantId) {
      throw new BadRequestException('Tenant ID é obrigatório');
    }

    if (!body.urls || Object.keys(body.urls).length === 0) {
      throw new BadRequestException('Pelo menos uma URL deve ser fornecida');
    }

    await this.webhookService.configureWebhookUrls(body.tenantId, body.urls);
    return { success: true };
  }

  // Endpoint para simular webhook (desenvolvimento)
  @Public()
  @Post('simulate/:method/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular webhook (desenvolvimento)' })
  @ApiResponse({ status: 200, description: 'Webhook simulado' })
  async simulateWebhook(
    @Param('method') method: PaymentMethod,
    @Param('paymentId') paymentId: string,
    @Body() body: { status: 'paid' | 'failed' | 'cancelled' },
  ): Promise<{ success: boolean }> {
    // Gerar payload de teste baseado no método
    let testPayload: any;

    switch (method) {
      case 'pix':
        testPayload = {
          txId: paymentId,
          endToEndId: `E${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          amount: 100.00,
          status: body.status,
          paidAt: body.status === 'paid' ? new Date() : undefined,
        };
        break;

      case 'credit_card':
        testPayload = {
          transactionId: paymentId,
          amount: 100.00,
          status: body.status === 'paid' ? 'approved' : 'declined',
          authorizationCode: body.status === 'paid' ? '123456' : undefined,
        };
        break;

      case 'boleto':
        testPayload = {
          boletoId: paymentId,
          amount: 100.00,
          status: body.status,
          paidAt: body.status === 'paid' ? new Date() : undefined,
        };
        break;

      default:
        throw new BadRequestException('Método não suportado');
    }

    // Processar webhook simulado
    const processed = await this.paymentService.processWebhook(method, testPayload);

    return { success: processed };
  }
}