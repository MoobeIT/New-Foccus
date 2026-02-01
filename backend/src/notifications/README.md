# Sistema de Notificações

Este módulo implementa um sistema completo de notificações multi-canal com templates avançados, suporte a múltiplos provedores de email e funcionalidades de automação para a plataforma de produtos personalizados.

## Funcionalidades

### 📧 Sistema de Email
- Múltiplos provedores (SMTP, AWS SES, SendGrid, Mailgun, Postmark)
- Templates HTML/texto com engine de renderização
- Envio em lote com controle de taxa
- Verificação de endereços de email
- Rastreamento de entrega e abertura

### 🔔 Notificações Multi-Canal
- **Email** com múltiplos provedores
- **SMS** via Twilio, AWS SNS, Zenvia, TotalVoice
- **WhatsApp Business API** com templates aprovados
- **Push** e **In-App** (preparado para implementação)
- Sistema de preferências por usuário
- Priorização e agendamento
- Retry automático para falhas
- Estatísticas detalhadas

### 📝 Sistema de Templates
- Templates HTML responsivos
- Engine de renderização com variáveis
- Condicionais e loops
- Formatação automática (datas, moedas)
- Versionamento e preview

### 🤖 Automação
- Notificações baseadas em eventos
- Carrinho abandonado
- Confirmações de pedido
- Atualizações de status
- Campanhas de marketing

## Arquitetura

### Módulos Principais
- **NotificationService** - Orquestração geral
- **EmailService** - Envio de emails
- **TemplateService** - Gerenciamento de templates
- **NotificationController** - API de notificações
- **EmailController** - API específica de email

### Tipos de Notificação
```typescript
type NotificationType = 
  | 'order_confirmation'
  | 'order_status_update'
  | 'payment_confirmation'
  | 'payment_failed'
  | 'project_shared'
  | 'cart_abandoned'
  | 'welcome'
  | 'password_reset'
  | 'promotion'
  | 'custom';
```

### Canais Suportados
```typescript
type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'in_app'
  | 'webhook';
```

## API Endpoints

### Notificações
```http
POST /notifications/send              # Enviar notificação individual
POST /notifications/send-bulk         # Enviar em lote
GET /notifications                     # Listar notificações do usuário
GET /notifications/:id                 # Detalhes da notificação
POST /notifications/:id/read           # Marcar como lida
GET /notifications/preferences/current # Obter preferências
PUT /notifications/preferences         # Atualizar preferências
GET /notifications/stats/overview      # Estatísticas
```

### Email
```http
POST /email/send                       # Enviar email individual
POST /email/send-bulk                  # Enviar emails em lote
POST /email/verify                     # Verificar endereço
GET /email/delivery-status/:messageId  # Status de entrega
GET /email/templates                   # Listar templates
GET /email/templates/:id               # Obter template
POST /email/templates                  # Criar template
POST /email/templates/:id/preview      # Preview do template
```

### WhatsApp & SMS
```http
POST /messaging/whatsapp/send          # Enviar WhatsApp
POST /messaging/whatsapp/send-text     # Enviar texto WhatsApp
POST /messaging/whatsapp/send-template # Enviar template WhatsApp
POST /messaging/whatsapp/send-interactive # Mensagem interativa
GET /messaging/whatsapp/templates      # Templates aprovados
POST /messaging/sms/send               # Enviar SMS
POST /messaging/sms/send-bulk          # Enviar SMS em lote
POST /messaging/sms/verify-phone       # Validar telefone
GET /messaging/sms/delivery-status/:id # Status SMS
```

### Conveniência
```http
POST /messaging/order-confirmation     # Confirmação por WhatsApp/SMS
POST /messaging/order-status-update    # Atualização por WhatsApp/SMS
POST /messaging/cart-abandoned         # Carrinho abandonado
POST /messaging/verification-code      # Código de verificação SMS
```

### Conveniência
```http
POST /notifications/order-confirmation # Confirmação de pedido
POST /notifications/order-status-update # Atualização de status
POST /notifications/cart-abandoned     # Carrinho abandonado
POST /notifications/welcome            # Boas-vindas
```

## Exemplos de Uso

### 1. Enviar Confirmação de Pedido

```typescript
const notification = await notificationService.sendOrderConfirmation(
  tenantId,
  userId,
  {
    orderId: 'order-123',
    orderNumber: 'PED-2024-001',
    customerName: 'João Silva',
    customerEmail: 'joao@exemplo.com',
    items: [
      {
        productName: 'Fotolivro A4',
        quantity: 1,
        unitPrice: 89.90
      }
    ],
    total: 89.90,
    currency: 'BRL'
  }
);
```

### 2. Enviar Email com Template

```typescript
const result = await emailService.sendEmail({
  to: 'cliente@exemplo.com',
  subject: 'Bem-vindo!',
  templateId: 'welcome',
  templateData: {
    name: 'João Silva',
    verificationUrl: 'https://app.exemplo.com/verify?token=abc123'
  }
});
```

### 3. Criar Template Personalizado

```typescript
const template = await templateService.createTemplate({
  name: 'Promoção Especial',
  type: 'promotion',
  language: 'pt-BR',
  subject: 'Oferta especial para {{customerName}}!',
  htmlContent: `
    <h1>Olá {{customerName}}!</h1>
    <p>Temos uma oferta especial para você:</p>
    <div style="background: #f0f0f0; padding: 20px;">
      <h2>{{promotionTitle}}</h2>
      <p>{{promotionDescription}}</p>
      <p><strong>Desconto: {{discount}}%</strong></p>
    </div>
    <a href="{{promotionUrl}}">Aproveitar Oferta</a>
  `,
  textContent: `
    Olá {{customerName}}!
    
    Temos uma oferta especial para você:
    {{promotionTitle}}
    {{promotionDescription}}
    Desconto: {{discount}}%
    
    Aproveitar: {{promotionUrl}}
  `,
  fromEmail: 'promocoes@exemplo.com',
  fromName: 'Equipe de Promoções',
  variables: [
    { name: 'customerName', type: 'string', description: 'Nome do cliente', required: true },
    { name: 'promotionTitle', type: 'string', description: 'Título da promoção', required: true },
    { name: 'promotionDescription', type: 'string', description: 'Descrição', required: true },
    { name: 'discount', type: 'number', description: 'Percentual de desconto', required: true },
    { name: 'promotionUrl', type: 'string', description: 'URL da promoção', required: true }
  ],
  isActive: true
});
```

### 4. Enviar WhatsApp

```typescript
// Mensagem de texto simples
const result = await whatsappService.sendTextMessage(
  '+5511999999999',
  '🎉 Seu pedido foi confirmado! Acompanhe pelo nosso site.'
);

// Mensagem interativa com botões
const interactive = await whatsappService.sendInteractiveMessage(
  '+5511999999999',
  '📦 Status do Pedido',
  'Seu pedido está em produção. O que você gostaria de fazer?',
  [
    { id: 'track', title: '📍 Rastrear' },
    { id: 'support', title: '💬 Suporte' },
    { id: 'cancel', title: '❌ Cancelar' }
  ],
  'Responda com uma das opções acima'
);
```

### 5. Enviar SMS

```typescript
// SMS simples
const smsResult = await smsService.sendSMS({
  to: '+5511999999999',
  body: '🎉 Pedido PED-2024-001 confirmado! Total: R$ 89,90'
});

// Código de verificação
const codeResult = await smsService.sendVerificationCode(
  '+5511999999999',
  '123456',
  5 // expira em 5 minutos
);
```

### 6. Configurar Preferências do Usuário

```typescript
await notificationService.updateUserPreferences(tenantId, userId, {
  email: true,
  sms: false,
  whatsapp: true,
  marketing: false,
  orderUpdates: true,
  projectUpdates: true,
  promotions: false
});
```

## Templates Padrão

### 1. Confirmação de Pedido
- **ID**: `order_confirmation`
- **Variáveis**: customerName, orderNumber, items, total, currency
- **Uso**: Confirmação automática após pagamento

### 2. Carrinho Abandonado
- **ID**: `cart_abandoned`
- **Variáveis**: customerName, items, total, currency, cartUrl
- **Uso**: Lembrete após 2 horas de inatividade

### 3. Boas-vindas
- **ID**: `welcome`
- **Variáveis**: name, verificationUrl
- **Uso**: Primeiro acesso do usuário

### 4. Atualização de Status
- **ID**: `order_status_update`
- **Variáveis**: customerName, orderNumber, status, trackingCode
- **Uso**: Mudanças no status do pedido

## Engine de Templates

### Variáveis Simples
```html
<h1>Olá {{customerName}}!</h1>
<p>Seu pedido {{orderNumber}} foi confirmado.</p>
```

### Condicionais
```html
{{#if trackingCode}}
<p>Código de rastreamento: {{trackingCode}}</p>
{{/if}}
```

### Loops
```html
{{#each items}}
<div>
  <h3>{{productName}}</h3>
  <p>Quantidade: {{quantity}}</p>
  <p>Preço: {{formatCurrency unitPrice ../currency}}</p>
</div>
{{/each}}
```

### Formatação
```html
<p>Total: {{formatCurrency total currency}}</p>
<p>Data: {{formatDate orderDate}}</p>
```

## Provedores de Email

### SMTP
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha
```

### AWS SES
```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
```

### SendGrid
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=sua-api-key
```

### Mailgun
```env
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=sua-api-key
MAILGUN_DOMAIN=seu-dominio.com
```

### Postmark
```env
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=seu-server-token
```

## Configuração WhatsApp Business

### Meta (Facebook) WhatsApp Business API
```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=seu-access-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-verify-token
```

### Configuração do Webhook
1. Configure o webhook URL: `https://sua-api.com/messaging/whatsapp/webhook`
2. Defina o verify token no ambiente
3. Subscreva aos eventos: `messages`, `message_deliveries`

## Configuração SMS

### Twilio
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=seu-account-sid
TWILIO_AUTH_TOKEN=seu-auth-token
TWILIO_FROM_NUMBER=+5511999999999
```

### AWS SNS
```env
SMS_PROVIDER=aws_sns
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
```

### Zenvia
```env
SMS_PROVIDER=zenvia
ZENVIA_API_TOKEN=seu-api-token
ZENVIA_FROM=sua-empresa
```

### TotalVoice
```env
SMS_PROVIDER=totalvoice
TOTALVOICE_ACCESS_TOKEN=seu-access-token
```

## Automação e Eventos

### Carrinho Abandonado
```typescript
// Configurar lembrete automático
await notificationService.sendCartAbandonedReminder(
  tenantId,
  userId,
  {
    customerName: 'João Silva',
    customerEmail: 'joao@exemplo.com',
    items: cartItems,
    total: cartTotal,
    currency: 'BRL',
    cartUrl: 'https://app.exemplo.com/cart'
  }
);
```

### Webhook de Status de Pedido
```typescript
// Listener para mudanças de status
orderService.on('statusChanged', async (order) => {
  await notificationService.sendOrderStatusUpdate(
    order.tenantId,
    order.userId,
    {
      orderId: order.id,
      orderNumber: order.number,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      status: order.status,
      trackingCode: order.trackingCode
    }
  );
});
```

## Monitoramento e Analytics

### Métricas Importantes
- Taxa de entrega por provedor
- Taxa de abertura de emails
- Taxa de clique em links
- Bounce rate e complaints
- Performance por tipo de notificação

### Logs Estruturados
```typescript
// Exemplo de log
{
  timestamp: '2024-01-20T10:30:00Z',
  level: 'info',
  service: 'NotificationService',
  action: 'email_sent',
  data: {
    notificationId: 'notif_123',
    type: 'order_confirmation',
    recipient: 'user@example.com',
    provider: 'sendgrid',
    messageId: 'sg_456',
    deliveryTime: 1250
  }
}
```

## Segurança e Compliance

### LGPD/GDPR
- Consentimento explícito para marketing
- Opt-out fácil em todos os emails
- Retenção limitada de dados
- Logs de consentimento

### Segurança
- Validação de endereços de email
- Rate limiting por usuário
- Sanitização de templates
- Criptografia de dados sensíveis

## Testes

### Executar Testes
```bash
npm run test notifications
npm run test:e2e notifications
```

### Endpoints de Teste
```http
POST /notifications/test/send-sample   # Enviar notificações de exemplo
POST /email/test/send-sample          # Enviar emails de teste
POST /email/test/templates            # Testar renderização de templates
```

## Configuração

### Variáveis de Ambiente
```env
# Provedor de email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=sua-api-key

# URLs da aplicação
FRONTEND_URL=https://app.exemplo.com

# Cache e performance
NOTIFICATION_CACHE_TTL=300
TEMPLATE_CACHE_TTL=3600

# Limites
MAX_BULK_NOTIFICATIONS=1000
MAX_BULK_EMAILS=100
EMAIL_RATE_LIMIT=100

# Retry
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
```

## Roadmap

- [ ] Integração com WhatsApp Business API
- [ ] Sistema de SMS via Twilio
- [ ] Push notifications para mobile
- [ ] A/B testing para templates
- [ ] Segmentação avançada de usuários
- [ ] Automação baseada em ML
- [ ] Dashboard de analytics em tempo real
- [ ] Integração com ferramentas de marketing