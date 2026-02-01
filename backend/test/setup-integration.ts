import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';

// Configuração global para testes de integração
export class IntegrationTestSetup {
  private static app: INestApplication;
  private static prisma: PrismaClient;
  private static moduleRef: TestingModule;

  static async setupTestApp(moduleMetadata: any): Promise<INestApplication> {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ...moduleMetadata.imports || [],
      ],
      controllers: moduleMetadata.controllers || [],
      providers: moduleMetadata.providers || [],
    });

    this.moduleRef = await moduleBuilder.compile();
    this.app = this.moduleRef.createNestApplication();

    // Configurar middlewares e pipes globais
    // app.useGlobalPipes(new ValidationPipe());
    // app.useGlobalFilters(new HttpExceptionFilter());

    await this.app.init();
    return this.app;
  }

  static async setupDatabase(): Promise<PrismaClient> {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
        },
      },
    });

    await this.prisma.$connect();
    return this.prisma;
  }

  static async cleanDatabase(): Promise<void> {
    if (!this.prisma) return;

    // Limpar todas as tabelas em ordem reversa de dependência
    const tableNames = [
      'order_items',
      'orders',
      'project_assets',
      'projects',
      'assets',
      'product_variants',
      'products',
      'user_sessions',
      'users',
      'tenants',
    ];

    for (const tableName of tableNames) {
      try {
        await this.prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
      } catch (error) {
        // Ignorar erros de tabelas que não existem
        console.warn(`Warning: Could not clean table ${tableName}:`, error.message);
      }
    }
  }

  static async teardownDatabase(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  static async teardownApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.moduleRef) {
      await this.moduleRef.close();
    }
  }

  static getApp(): INestApplication {
    return this.app;
  }

  static getPrisma(): PrismaClient {
    return this.prisma;
  }

  static request() {
    return request(this.app.getHttpServer());
  }
}

// Configuração de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-integration';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_integration_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.AWS_S3_BUCKET = 'test-integration-bucket';
process.env.AWS_REGION = 'us-east-1';

// Setup global antes de todos os testes
beforeAll(async () => {
  await IntegrationTestSetup.setupDatabase();
});

// Limpeza antes de cada teste
beforeEach(async () => {
  await IntegrationTestSetup.cleanDatabase();
});

// Teardown global após todos os testes
afterAll(async () => {
  await IntegrationTestSetup.cleanDatabase();
  await IntegrationTestSetup.teardownDatabase();
  await IntegrationTestSetup.teardownApp();
});

// Timeout global para testes de integração
jest.setTimeout(60000);

// Utilitários para testes de integração
export class IntegrationTestUtils {
  static async createTestTenant(prisma: PrismaClient) {
    return prisma.tenant.create({
      data: {
        id: 'test-tenant-' + Date.now(),
        name: 'Test Tenant',
        domain: 'test.example.com',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async createTestUser(prisma: PrismaClient, tenantId: string) {
    return prisma.user.create({
      data: {
        id: 'test-user-' + Date.now(),
        email: `test-${Date.now()}@example.com`,
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', // password123
        firstName: 'Test',
        lastName: 'User',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async createTestProduct(prisma: PrismaClient, tenantId: string) {
    return prisma.product.create({
      data: {
        id: 'test-product-' + Date.now(),
        name: 'Test Product',
        description: 'Test product description',
        type: 'photobook',
        tenantId,
        settings: {
          minPages: 20,
          maxPages: 100,
          formats: ['A4', 'A5'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async createTestProject(prisma: PrismaClient, userId: string, tenantId: string) {
    return prisma.project.create({
      data: {
        id: 'test-project-' + Date.now(),
        name: 'Test Project',
        userId,
        tenantId,
        productType: 'photobook',
        status: 'draft',
        data: {
          pages: [],
          settings: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async createTestAsset(prisma: PrismaClient, userId: string, tenantId: string) {
    return prisma.asset.create({
      data: {
        id: 'test-asset-' + Date.now(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        url: 'https://test-bucket.s3.amazonaws.com/test-image.jpg',
        userId,
        tenantId,
        metadata: {
          width: 1920,
          height: 1080,
          format: 'jpeg',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async authenticateUser(app: INestApplication, email: string, password: string = 'password123') {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken;
  }

  static createAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  static expectValidationError(response: any, field?: string) {
    expect(response.status).toBe(400);
    expect(response.body.message).toBeDefined();
    if (field) {
      expect(response.body.message).toContain(field);
    }
  }

  static expectUnauthorized(response: any) {
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Unauthorized');
  }

  static expectNotFound(response: any) {
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  }

  static expectSuccess(response: any, expectedData?: any) {
    expect(response.status).toBeLessThan(400);
    if (expectedData) {
      expect(response.body).toMatchObject(expectedData);
    }
  }
}