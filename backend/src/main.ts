import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as compression from 'compression';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Necessário para webhooks do Stripe
  });
  const configService = app.get(ConfigService);

  // Servir arquivos estáticos da pasta uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir acesso a arquivos estáticos
  }));
  app.use(compression());

  // Increase body size limit for large uploads (50MB)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permitir campos extras (serão ignorados)
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Converter tipos automaticamente
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation - habilitado por padrão em desenvolvimento
  const enableSwagger = configService.get('ENABLE_SWAGGER') !== 'false' && 
    configService.get('NODE_ENV') !== 'production';
  
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Editor de Fotolivros - API')
      .setDescription(`
## API do Editor de Fotolivros Profissional

Sistema completo para criação e venda de fotolivros personalizados.

### Módulos Disponíveis:
- **Auth**: Autenticação JWT, registro, login
- **Users**: Gerenciamento de usuários e perfis
- **Tenants**: Multi-tenancy para gráficas/lojas
- **Catalog**: Produtos, templates, categorias
- **Projects**: Projetos de fotolivros dos usuários
- **Assets**: Upload e gerenciamento de imagens
- **Render**: Geração de PDFs para impressão
- **Payments**: Pagamentos via Stripe, PIX, Boleto
- **Orders**: Pedidos e rastreamento
- **Pricing**: Precificação dinâmica e cupons

### Autenticação:
Utilize o botão "Authorize" com seu token JWT.
      `)
      .setVersion('1.0.0')
      .setContact('Suporte', 'https://editor.com', 'suporte@editor.com')
      .setLicense('Proprietário', '')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Insira o token JWT',
          in: 'header',
        },
        'JWT-auth',
      )
      // Auth
      .addTag('auth', 'Autenticação e autorização')
      // Users & Tenants
      .addTag('users', 'Gerenciamento de usuários')
      .addTag('tenants', 'Gerenciamento de tenants (multi-tenancy)')
      // Catalog
      .addTag('catalog', 'Catálogo de produtos e templates')
      .addTag('products', 'Produtos disponíveis')
      .addTag('templates', 'Templates de fotolivros')
      .addTag('categories', 'Categorias de produtos')
      // Projects & Assets
      .addTag('projects', 'Projetos de fotolivros')
      .addTag('assets', 'Upload e gerenciamento de imagens')
      // Render
      .addTag('render', 'Geração de PDFs e previews')
      // Payments
      .addTag('payments', 'Processamento de pagamentos')
      .addTag('stripe', 'Pagamentos via Stripe')
      .addTag('pix', 'Pagamentos via PIX')
      // Orders
      .addTag('orders', 'Gerenciamento de pedidos')
      .addTag('order-tracking', 'Rastreamento de entregas')
      // Pricing
      .addTag('pricing', 'Precificação e cupons')
      .addTag('coupons', 'Cupons de desconto')
      // Admin
      .addTag('admin', 'Operações administrativas')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Editor de Fotolivros - API Docs',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .info .title { font-size: 2em }
      `,
    });
  }

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  if (enableSwagger) {
    console.log(`📚 Documentação Swagger em http://localhost:${port}/api/docs`);
  }
}

bootstrap();