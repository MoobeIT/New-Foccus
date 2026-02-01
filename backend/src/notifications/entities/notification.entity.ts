export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  
  // Conteúdo
  subject: string;
  message: string;
  templateId?: string;
  templateData?: Record<string, any>;
  
  // Destinatário
  recipient: NotificationRecipient;
  
  // Status
  status: NotificationStatus;
  priority: NotificationPriority;
  
  // Agendamento
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Tentativas
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  
  // Metadados
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export type NotificationType = 
  | 'order_confirmation'
  | 'order_status_update'
  | 'order_shipped'
  | 'tracking_update'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'payment_confirmation'
  | 'payment_failed'
  | 'project_shared'
  | 'project_comment'
  | 'cart_abandoned'
  | 'welcome'
  | 'password_reset'
  | 'account_verification'
  | 'promotion'
  | 'system_maintenance'
  | 'custom';

export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'in_app'
  | 'webhook';

export type NotificationStatus = 
  | 'pending'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name?: string;
  language?: string;
  timezone?: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  inApp: boolean;
  marketing: boolean;
  orderUpdates: boolean;
  projectUpdates: boolean;
  promotions: boolean;
}

// Templates de Email
export interface EmailTemplate {
  id: string;
  name: string;
  type: NotificationType;
  language: string;
  
  // Conteúdo
  subject: string;
  htmlContent: string;
  textContent: string;
  
  // Configurações
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  
  // Variáveis disponíveis
  variables: TemplateVariable[];
  
  // Metadados
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

// Requests e Responses
export interface SendNotificationRequest {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  
  // Conteúdo direto ou template
  subject?: string;
  message?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  
  // Configurações
  priority?: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SendEmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface NotificationBatch {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  
  // Configurações
  templateId?: string;
  templateData?: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: Date;
  
  // Recipients
  recipients: NotificationRecipient[];
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface NotificationStats {
  period: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  
  byChannel: {
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    rate: number;
  }[];
  
  byType: {
    type: NotificationType;
    sent: number;
    delivered: number;
    failed: number;
    rate: number;
  }[];
  
  timeline: {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
}

export interface NotificationPreferencesUpdate {
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

// Eventos para webhooks
export interface NotificationEvent {
  id: string;
  notificationId: string;
  type: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'complained';
  timestamp: Date;
  data?: Record<string, any>;
}

// Configurações do provedor de email
export interface EmailProviderConfig {
  provider: 'smtp' | 'ses' | 'sendgrid' | 'mailgun' | 'postmark';
  
  // SMTP
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  
  // AWS SES
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  
  // SendGrid
  sendgrid?: {
    apiKey: string;
  };
  
  // Mailgun
  mailgun?: {
    apiKey: string;
    domain: string;
  };
  
  // Postmark
  postmark?: {
    serverToken: string;
  };
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
}