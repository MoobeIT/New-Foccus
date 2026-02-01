import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { IntegrationTestSetup, IntegrationTestUtils } from '../setup-integration';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testTenant: any;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp({
      imports: [AuthModule, UsersModule],
    });
    prisma = IntegrationTestSetup.getPrisma();
  });

  beforeEach(async () => {
    testTenant = await IntegrationTestUtils.createTestTenant(prisma);
  });

  afterAll(async () => {
    await IntegrationTestSetup.teardownApp();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/register')
        .set('X-Tenant-ID', testTenant.id)
        .send(registerData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(registerData.email);
      expect(response.body.user.firstName).toBe(registerData.firstName);
      expect(response.body.user.lastName).toBe(registerData.lastName);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { email: registerData.email },
      });
      expect(createdUser).toBeTruthy();
      expect(createdUser.tenantId).toBe(testTenant.id);
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/register')
        .set('X-Tenant-ID', testTenant.id)
        .send(invalidData);

      IntegrationTestUtils.expectValidationError(response, 'email');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/register')
        .set('X-Tenant-ID', testTenant.id)
        .send(weakPasswordData);

      IntegrationTestUtils.expectValidationError(response, 'password');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Create first user
      await IntegrationTestSetup.request()
        .post('/auth/register')
        .set('X-Tenant-ID', testTenant.id)
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await IntegrationTestSetup.request()
        .post('/auth/register')
        .set('X-Tenant-ID', testTenant.id)
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123', // This matches the hashed password in createTestUser
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send(loginData);

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send(loginData);

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send({});

      IntegrationTestUtils.expectValidationError(response);
    });
  });

  describe('POST /auth/refresh', () => {
    let testUser: any;
    let refreshToken: string;

    beforeEach(async () => {
      testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      
      // Login to get refresh token
      const loginResponse = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: testUser.email,
          password: 'password123',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/refresh')
        .set('X-Tenant-ID', testTenant.id)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/refresh')
        .set('X-Tenant-ID', testTenant.id)
        .send({ refreshToken: 'invalid-token' });

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/refresh')
        .set('X-Tenant-ID', testTenant.id)
        .send({});

      IntegrationTestUtils.expectValidationError(response);
    });
  });

  describe('POST /auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      accessToken = await IntegrationTestUtils.authenticateUser(app, testUser.email);
    });

    it('should logout successfully with valid token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/logout')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('logged out');
    });

    it('should return 401 for missing token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/logout')
        .set('X-Tenant-ID', testTenant.id);

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should return 401 for invalid token', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/auth/logout')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', 'Bearer invalid-token');

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('POST /auth/change-password', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      accessToken = await IntegrationTestUtils.authenticateUser(app, testUser.email);
    });

    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/change-password')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body.message).toContain('changed');

      // Verify can login with new password
      const loginResponse = await IntegrationTestSetup.request()
        .post('/auth/login')
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: testUser.email,
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeTruthy();
    });

    it('should return 400 for incorrect current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/change-password')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('incorrect');
    });

    it('should return 401 for unauthenticated request', async () => {
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      };

      const response = await IntegrationTestSetup.request()
        .post('/auth/change-password')
        .set('X-Tenant-ID', testTenant.id)
        .send(changePasswordData);

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('GET /auth/profile', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      accessToken = await IntegrationTestUtils.authenticateUser(app, testUser.email);
    });

    it('should return user profile for authenticated user', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/auth/profile')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body.password).toBeUndefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/auth/profile')
        .set('X-Tenant-ID', testTenant.id);

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should return 401 for invalid token', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/auth/profile')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', 'Bearer invalid-token');

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });
});