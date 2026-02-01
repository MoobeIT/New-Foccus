import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AssetsModule } from '../../src/assets/assets.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { IntegrationTestSetup, IntegrationTestUtils } from '../setup-integration';
import * as path from 'path';

describe('Assets Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testTenant: any;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp({
      imports: [AssetsModule, AuthModule, UsersModule],
    });
    prisma = IntegrationTestSetup.getPrisma();
  });

  beforeEach(async () => {
    testTenant = await IntegrationTestUtils.createTestTenant(prisma);
    testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
    accessToken = await IntegrationTestUtils.authenticateUser(app, testUser.email);
  });

  afterAll(async () => {
    await IntegrationTestSetup.teardownApp();
  });

  describe('POST /assets/upload', () => {
    it('should upload image successfully', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.filename).toBe('test-image.jpg');
      expect(response.body.mimeType).toBe('image/jpeg');
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.tenantId).toBe(testTenant.id);
      expect(response.body.url).toBeTruthy();

      // Verify asset was created in database
      const createdAsset = await prisma.asset.findUnique({
        where: { id: response.body.id },
      });
      expect(createdAsset).toBeTruthy();
      expect(createdAsset.filename).toBe('test-image.jpg');
    });

    it('should return 400 for invalid file type', async () => {
      const testFileBuffer = Buffer.from('fake-text-data');
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFileBuffer, {
          filename: 'test-file.txt',
          contentType: 'text/plain',
        });

      IntegrationTestUtils.expectValidationError(response, 'file type');
    });

    it('should return 400 for file too large', async () => {
      // Create a large buffer (simulate file too large)
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', largeBuffer, {
          filename: 'large-image.jpg',
          contentType: 'image/jpeg',
        });

      IntegrationTestUtils.expectValidationError(response, 'file size');
    });

    it('should return 401 for unauthenticated request', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', testImageBuffer, {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        });

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should handle duplicate files', async () => {
      const testImageBuffer = Buffer.from('identical-image-data');
      
      // Upload first file
      const response1 = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'duplicate-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      // Upload identical file
      const response2 = await IntegrationTestSetup.request()
        .post('/assets/upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'duplicate-image-2.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200); // Should return existing asset

      expect(response2.body.id).toBe(response1.body.id);
      expect(response2.body.message).toContain('duplicate');
    });
  });

  describe('GET /assets', () => {
    let testAssets: any[];

    beforeEach(async () => {
      // Create multiple test assets
      testAssets = await Promise.all([
        IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id),
        IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id),
        IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id),
      ]);
    });

    it('should return paginated list of user assets', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/assets')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.assets).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(1);

      // Verify all assets belong to the user
      response.body.assets.forEach((asset: any) => {
        expect(asset.userId).toBe(testUser.id);
        expect(asset.tenantId).toBe(testTenant.id);
      });
    });

    it('should filter assets by type', async () => {
      // Update one asset to be a different type
      await prisma.asset.update({
        where: { id: testAssets[0].id },
        data: { mimeType: 'image/png' },
      });

      const response = await IntegrationTestSetup.request()
        .get('/assets')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'image/jpeg' })
        .expect(200);

      expect(response.body.assets).toHaveLength(2);
      response.body.assets.forEach((asset: any) => {
        expect(asset.mimeType).toBe('image/jpeg');
      });
    });

    it('should search assets by filename', async () => {
      // Update one asset with specific filename
      const searchFilename = 'special-photo.jpg';
      await prisma.asset.update({
        where: { id: testAssets[0].id },
        data: { filename: searchFilename },
      });

      const response = await IntegrationTestSetup.request()
        .get('/assets')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: 'special' })
        .expect(200);

      expect(response.body.assets).toHaveLength(1);
      expect(response.body.assets[0].filename).toBe(searchFilename);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/assets')
        .set('X-Tenant-ID', testTenant.id);

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('GET /assets/:id', () => {
    let testAsset: any;

    beforeEach(async () => {
      testAsset = await IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id);
    });

    it('should return asset by id', async () => {
      const response = await IntegrationTestSetup.request()
        .get(`/assets/${testAsset.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testAsset.id);
      expect(response.body.filename).toBe(testAsset.filename);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/assets/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });

    it('should return 403 for asset belonging to another user', async () => {
      // Create another user and their asset
      const anotherUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      const anotherAsset = await IntegrationTestUtils.createTestAsset(prisma, anotherUser.id, testTenant.id);

      const response = await IntegrationTestSetup.request()
        .get(`/assets/${anotherAsset.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /assets/:id', () => {
    let testAsset: any;

    beforeEach(async () => {
      testAsset = await IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id);
    });

    it('should update asset metadata successfully', async () => {
      const updateData = {
        tags: ['nature', 'landscape'],
        description: 'Beautiful landscape photo',
        alt: 'Landscape with mountains',
      };

      const response = await IntegrationTestSetup.request()
        .put(`/assets/${testAsset.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.tags).toEqual(updateData.tags);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.alt).toBe(updateData.alt);

      // Verify update in database
      const updatedAsset = await prisma.asset.findUnique({
        where: { id: testAsset.id },
      });
      expect(updatedAsset.metadata.tags).toEqual(updateData.tags);
    });

    it('should return 404 for non-existent asset', async () => {
      const updateData = { tags: ['test'] };

      const response = await IntegrationTestSetup.request()
        .put('/assets/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      IntegrationTestUtils.expectNotFound(response);
    });
  });

  describe('DELETE /assets/:id', () => {
    let testAsset: any;

    beforeEach(async () => {
      testAsset = await IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id);
    });

    it('should delete asset successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .delete(`/assets/${testAsset.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify deletion in database
      const deletedAsset = await prisma.asset.findUnique({
        where: { id: testAsset.id },
      });
      expect(deletedAsset).toBeNull();
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await IntegrationTestSetup.request()
        .delete('/assets/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });

    it('should return 403 for asset belonging to another user', async () => {
      // Create another user and their asset
      const anotherUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      const anotherAsset = await IntegrationTestUtils.createTestAsset(prisma, anotherUser.id, testTenant.id);

      const response = await IntegrationTestSetup.request()
        .delete(`/assets/${anotherAsset.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /assets/:id/thumbnail', () => {
    let testAsset: any;

    beforeEach(async () => {
      testAsset = await IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id);
    });

    it('should generate thumbnail successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .post(`/assets/${testAsset.id}/thumbnail`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ size: 'medium' })
        .expect(200);

      expect(response.body.url).toBeTruthy();
      expect(response.body.width).toBeTruthy();
      expect(response.body.height).toBeTruthy();
    });

    it('should return 400 for invalid thumbnail size', async () => {
      const response = await IntegrationTestSetup.request()
        .post(`/assets/${testAsset.id}/thumbnail`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ size: 'invalid-size' });

      IntegrationTestUtils.expectValidationError(response, 'size');
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/assets/non-existent-id/thumbnail')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ size: 'medium' });

      IntegrationTestUtils.expectNotFound(response);
    });
  });

  describe('GET /assets/:id/download', () => {
    let testAsset: any;

    beforeEach(async () => {
      testAsset = await IntegrationTestUtils.createTestAsset(prisma, testUser.id, testTenant.id);
    });

    it('should generate download URL successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .get(`/assets/${testAsset.id}/download`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.downloadUrl).toBeTruthy();
      expect(response.body.expiresAt).toBeTruthy();
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/assets/non-existent-id/download')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });

    it('should return 403 for asset belonging to another user', async () => {
      // Create another user and their asset
      const anotherUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      const anotherAsset = await IntegrationTestUtils.createTestAsset(prisma, anotherUser.id, testTenant.id);

      const response = await IntegrationTestSetup.request()
        .get(`/assets/${anotherAsset.id}/download`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /assets/bulk-upload', () => {
    it('should handle multiple file uploads', async () => {
      const testImage1 = Buffer.from('fake-image-data-1');
      const testImage2 = Buffer.from('fake-image-data-2');
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/bulk-upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('files', testImage1, {
          filename: 'image1.jpg',
          contentType: 'image/jpeg',
        })
        .attach('files', testImage2, {
          filename: 'image2.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.assets).toHaveLength(2);
      expect(response.body.successful).toBe(2);
      expect(response.body.failed).toBe(0);

      // Verify assets were created in database
      const createdAssets = await prisma.asset.findMany({
        where: {
          userId: testUser.id,
          filename: { in: ['image1.jpg', 'image2.jpg'] },
        },
      });
      expect(createdAssets).toHaveLength(2);
    });

    it('should handle partial failures in bulk upload', async () => {
      const validImage = Buffer.from('fake-image-data');
      const invalidFile = Buffer.from('fake-text-data');
      
      const response = await IntegrationTestSetup.request()
        .post('/assets/bulk-upload')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('files', validImage, {
          filename: 'valid-image.jpg',
          contentType: 'image/jpeg',
        })
        .attach('files', invalidFile, {
          filename: 'invalid-file.txt',
          contentType: 'text/plain',
        })
        .expect(207); // Multi-status

      expect(response.body.successful).toBe(1);
      expect(response.body.failed).toBe(1);
      expect(response.body.assets).toHaveLength(1);
      expect(response.body.errors).toHaveLength(1);
    });
  });
});