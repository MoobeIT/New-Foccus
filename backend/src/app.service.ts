import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth(): object {
    return {
      status: 'ok',
      message: 'Editor de Fotolivros - API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
    };
  }

  getDetailedHealth(): object {
    const nodeEnv = this.configService.get('NODE_ENV');
    const port = this.configService.get('PORT');
    
    return {
      status: 'ok',
      service: 'editor-backend',
      version: '1.0.0',
      environment: nodeEnv,
      port: port,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      modules: {
        auth: { status: 'active', description: 'Autenticação JWT' },
        users: { status: 'active', description: 'Gerenciamento de usuários' },
        tenants: { status: 'active', description: 'Multi-tenancy' },
        catalog: { status: 'active', description: 'Catálogo de produtos' },
        projects: { status: 'active', description: 'Projetos de fotolivros' },
        assets: { status: 'active', description: 'Upload de imagens' },
        render: { status: 'active', description: 'Geração de PDFs' },
        pricing: { status: 'active', description: 'Precificação e cupons' },
        checkout: { status: 'active', description: 'Processo de checkout' },
        payments: { status: 'active', description: 'Pagamentos (Stripe, PIX)' },
        orders: { status: 'active', description: 'Gerenciamento de pedidos' },
        notifications: { status: 'active', description: 'Notificações' },
      },
      services: {
        database: this.checkDatabaseHealth(),
        cache: this.checkCacheHealth(),
        storage: this.checkStorageHealth(),
        stripe: this.checkStripeHealth(),
      },
      endpoints: {
        docs: '/api/docs',
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        checkout: '/api/v1/checkout',
        payments: '/api/v1/payments',
        stripe: '/api/v1/payments/stripe',
        orders: '/api/v1/orders',
        render: '/api/v1/render',
      },
    };
  }

  private checkDatabaseHealth(): object {
    return {
      status: 'ok',
      type: this.configService.get('USE_LOCAL_STORAGE') === 'true' ? 'local' : 'postgresql',
    };
  }

  private checkCacheHealth(): object {
    return {
      status: 'ok',
      type: this.configService.get('USE_MEMORY_CACHE') === 'true' ? 'memory' : 'redis',
    };
  }

  private checkStorageHealth(): object {
    return {
      status: 'ok',
      type: this.configService.get('USE_LOCAL_STORAGE') === 'true' ? 'local' : 's3',
    };
  }

  private checkStripeHealth(): object {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    return {
      status: stripeKey && !stripeKey.includes('placeholder') ? 'configured' : 'not_configured',
      mode: stripeKey?.startsWith('sk_live') ? 'live' : 'test',
    };
  }
}