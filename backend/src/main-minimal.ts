import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppMinimalModule } from './app-minimal.module';

async function bootstrap() {
  const app = await NestFactory.create(AppMinimalModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Editor de Fotolivros - API')
    .setDescription('API do Editor de Fotolivros Profissional')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('health', 'Health check')
    .addTag('auth', 'Autenticação')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Editor API Docs',
  });

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  console.log(`📚 Swagger em http://localhost:${port}/api/docs`);
}

bootstrap();
