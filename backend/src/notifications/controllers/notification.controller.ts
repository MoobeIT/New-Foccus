import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { CurrentUser, CurrentTenant } from '../../auth/decorators/current-user.decorator';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  SendNotificationRequest,
  NotificationStats,
  NotificationPreferencesUpdate,
  NotificationRecipient,
} from '../entities/notification.entity';

class SendNotificationDto {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string;
  message?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string; // ISO date string
}

class SendBulkNotificationDto {
  type: NotificationType;
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  templateId?: string;
  templateData?: Record<string, any>;
  subject?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string;
}

class UpdatePreferencesDto {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  push?: boolean;
  inApp?: boolean;
  marketing?: boolean;
  orderUpdates?: boolean;
  projectUpdates?: boolean;
  promotions?: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar notificação individual' })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({ status: 200, description: 'Notificação enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendNotification(
    @Body() body: SendNotificationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const userId = user?.id;

    if (!body.type || !body.channel || !body.recipient) {
      throw new BadRequestException('type, channel e recipient são obrigatórios');
    }

    if (!body.subject && !body.message && !body.templateId) {
      throw new BadRequestException('É necessário fornecer subject/message ou templateId');
    }

    const request: SendNotificationRequest = {
      tenantId,
      userId,
      type: body.type,
      channel: body.channel,
      recipient: body.recipient,
      subject: body.subject,
      message: body.message,
      templateId: body.templateId,
      templateData: body.templateData,
      priority: body.priority,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    };

    return this.notificationService.sendNotification(request);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar notificações em lote' })
  @ApiBody({ type: SendBulkNotificationDto })
  @ApiResponse({ status: 200, description: 'Lote de notificações criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async sendBulkNotifications(
    @Body() body: SendBulkNotificationDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    if (!body.type || !body.channel || !body.recipients || body.recipients.length === 0) {
      throw new BadRequestException('type, channel e recipients são obrigatórios');
    }

    if (body.recipients.length > 1000) {
      throw new BadRequestException('Máximo de 1000 destinatários por lote');
    }

    return this.notificationService.sendBulkNotifications(
      tenantId,
      body.type,
      body.channel,
      body.recipients,
      {
        templateId: body.templateId,
        templateData: body.templateData,
        subject: body.subject,
        message: body.message,
        priority: body.priority,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      },
    );
  }

  @Get(':notificationId')
  @ApiOperation({ summary: 'Obter detalhes da notificação' })
  @ApiParam({ name: 'notificationId', description: 'ID da notificação' })
  @ApiResponse({ status: 200, description: 'Detalhes da notificação' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async getNotification(
    @Param('notificationId') notificationId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const notification = await this.notificationService.getNotification(notificationId);
    
    if (!notification) {
      throw new BadRequestException('Notificação não encontrada');
    }

    // Verificar se o usuário tem acesso à notificação
    if (notification.tenantId !== tenantId) {
      throw new BadRequestException('Acesso negado');
    }

    return notification;
  }

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  @ApiQuery({ name: 'channel', required: false, enum: ['email', 'sms', 'whatsapp', 'push', 'in_app'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'sent', 'delivered', 'read', 'failed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de notificações' })
  async getUserNotifications(
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @CurrentTenant() tenantId?: string,
    @CurrentUser() user?: any,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const userId = user?.id;
    if (!userId) {
      throw new BadRequestException('Usuário deve estar logado');
    }

    return this.notificationService.getUserNotifications(tenantId, userId, {
      channel,
      status,
      limit: limit || 20,
      offset: offset || 0,
    });
  }

  @Post(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'notificationId', description: 'ID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(notificationId);
    return { success: true };
  }

  @Get('preferences/current')
  @ApiOperation({ summary: 'Obter preferências de notificação do usuário' })
  @ApiResponse({ status: 200, description: 'Preferências do usuário' })
  async getUserPreferences(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const userId = user?.id;
    if (!userId) {
      throw new BadRequestException('Usuário deve estar logado');
    }

    // TODO: Implementar busca de preferências reais
    return {
      email: true,
      sms: false,
      whatsapp: true,
      push: true,
      inApp: true,
      marketing: false,
      orderUpdates: true,
      projectUpdates: true,
      promotions: false,
    };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas' })
  async updatePreferences(
    @Body() body: UpdatePreferencesDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const userId = user?.id;
    if (!userId) {
      throw new BadRequestException('Usuário deve estar logado');
    }

    await this.notificationService.updateUserPreferences(tenantId, userId, body);
    return { success: true };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Obter estatísticas de notificações' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  @ApiResponse({ status: 200, description: 'Estatísticas de notificações' })
  async getNotificationStats(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationStats> {
    return this.notificationService.getNotificationStats(tenantId, period);
  }

  // Métodos de conveniência para tipos específicos de notificação
  @Post('order-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar confirmação de pedido' })
  @ApiResponse({ status: 200, description: 'Confirmação enviada' })
  async sendOrderConfirmation(
    @Body() body: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      items: any[];
      total: number;
      currency: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const userId = user?.id;
    return this.notificationService.sendOrderConfirmation(tenantId, userId, body);
  }

  @Post('order-status-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar atualização de status do pedido' })
  @ApiResponse({ status: 200, description: 'Atualização enviada' })
  async sendOrderStatusUpdate(
    @Body() body: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      status: string;
      trackingCode?: string;
      estimatedDelivery?: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const userId = user?.id;
    const orderData = {
      ...body,
      estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : undefined,
    };
    return this.notificationService.sendOrderStatusUpdate(tenantId, userId, orderData);
  }

  @Post('cart-abandoned')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar lembrete de carrinho abandonado' })
  @ApiResponse({ status: 200, description: 'Lembrete enviado' })
  async sendCartAbandonedReminder(
    @Body() body: {
      customerName: string;
      customerEmail: string;
      items: any[];
      total: number;
      currency: string;
      cartUrl: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const userId = user?.id;
    return this.notificationService.sendCartAbandonedReminder(tenantId, userId, body);
  }

  @Post('welcome')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar email de boas-vindas' })
  @ApiResponse({ status: 200, description: 'Boas-vindas enviado' })
  async sendWelcomeEmail(
    @Body() body: {
      name: string;
      email: string;
      verificationUrl?: string;
    },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    const userId = user?.id;
    return this.notificationService.sendWelcomeEmail(tenantId, userId, body);
  }

  // Endpoints de teste e demonstração
  @Post('test/send-sample')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar notificações de exemplo' })
  @ApiResponse({ status: 200, description: 'Notificações de exemplo enviadas' })
  async sendSampleNotifications(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<{
    notifications: Notification[];
    message: string;
  }> {
    const userId = user?.id || 'test-user';
    const userEmail = user?.email || 'test@exemplo.com';
    const userName = user?.firstName || 'Usuário Teste';

    const notifications: Notification[] = [];

    // Enviar diferentes tipos de notificação
    const sampleNotifications = [
      {
        type: 'order_confirmation' as NotificationType,
        data: {
          orderId: 'order-123',
          orderNumber: 'PED-2024-001',
          customerName: userName,
          customerEmail: userEmail,
          items: [
            { productName: 'Fotolivro A4', quantity: 1, unitPrice: 89.90 },
          ],
          total: 89.90,
          currency: 'BRL',
        },
      },
      {
        type: 'cart_abandoned' as NotificationType,
        data: {
          customerName: userName,
          customerEmail: userEmail,
          items: [
            { productName: 'Calendário 2024', quantity: 1, unitPrice: 45.00 },
          ],
          total: 45.00,
          currency: 'BRL',
          cartUrl: 'https://app.exemplo.com/cart',
        },
      },
      {
        type: 'welcome' as NotificationType,
        data: {
          name: userName,
          email: userEmail,
          verificationUrl: 'https://app.exemplo.com/verify?token=abc123',
        },
      },
    ];

    for (const sample of sampleNotifications) {
      try {
        let notification: Notification;

        switch (sample.type) {
          case 'order_confirmation':
            notification = await this.notificationService.sendOrderConfirmation(
              tenantId,
              userId,
              sample.data as any,
            );
            break;
          case 'cart_abandoned':
            notification = await this.notificationService.sendCartAbandonedReminder(
              tenantId,
              userId,
              sample.data as any,
            );
            break;
          case 'welcome':
            notification = await this.notificationService.sendWelcomeEmail(
              tenantId,
              userId,
              sample.data as any,
            );
            break;
          default:
            continue;
        }

        notifications.push(notification);
      } catch (error) {
        console.error(`Erro ao enviar notificação ${sample.type}:`, error);
      }
    }

    return {
      notifications,
      message: `${notifications.length} notificações de exemplo enviadas`,
    };
  }
}