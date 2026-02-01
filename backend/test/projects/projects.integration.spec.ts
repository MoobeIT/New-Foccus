import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProjectsModule } from '../../src/projects/projects.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { IntegrationTestSetup, IntegrationTestUtils } from '../setup-integration';

describe('Projects Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testTenant: any;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp({
      imports: [ProjectsModule, AuthModule, UsersModule],
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

  describe('POST /projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'My Photo Album',
        productType: 'photobook',
        templateId: 'template-123',
      };

      const response = await IntegrationTestSetup.request()
        .post('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.name).toBe(projectData.name);
      expect(response.body.productType).toBe(projectData.productType);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.tenantId).toBe(testTenant.id);
      expect(response.body.status).toBe('draft');

      // Verify project was created in database
      const createdProject = await prisma.project.findUnique({
        where: { id: response.body.id },
      });
      expect(createdProject).toBeTruthy();
      expect(createdProject.name).toBe(projectData.name);
    });

    it('should return 400 for invalid project data', async () => {
      const invalidData = {
        name: '', // Empty name
        productType: 'invalid-type',
      };

      const response = await IntegrationTestSetup.request()
        .post('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should return 401 for unauthenticated request', async () => {
      const projectData = {
        name: 'Test Project',
        productType: 'photobook',
      };

      const response = await IntegrationTestSetup.request()
        .post('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .send(projectData);

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('GET /projects', () => {
    let testProjects: any[];

    beforeEach(async () => {
      // Create multiple test projects
      testProjects = await Promise.all([
        IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id),
        IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id),
        IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id),
      ]);
    });

    it('should return paginated list of user projects', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.projects).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(1);

      // Verify all projects belong to the user
      response.body.projects.forEach((project: any) => {
        expect(project.userId).toBe(testUser.id);
        expect(project.tenantId).toBe(testTenant.id);
      });
    });

    it('should filter projects by status', async () => {
      // Update one project to completed status
      await prisma.project.update({
        where: { id: testProjects[0].id },
        data: { status: 'completed' },
      });

      const response = await IntegrationTestSetup.request()
        .get('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ status: 'draft' })
        .expect(200);

      expect(response.body.projects).toHaveLength(2);
      response.body.projects.forEach((project: any) => {
        expect(project.status).toBe('draft');
      });
    });

    it('should search projects by name', async () => {
      // Update one project with specific name
      const searchName = 'Special Project';
      await prisma.project.update({
        where: { id: testProjects[0].id },
        data: { name: searchName },
      });

      const response = await IntegrationTestSetup.request()
        .get('/projects')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ search: 'Special' })
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe(searchName);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/projects')
        .set('X-Tenant-ID', testTenant.id);

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('GET /projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should return project by id', async () => {
      const response = await IntegrationTestSetup.request()
        .get(`/projects/${testProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testProject.id);
      expect(response.body.name).toBe(testProject.name);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await IntegrationTestSetup.request()
        .get('/projects/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });

    it('should return 403 for project belonging to another user', async () => {
      // Create another user and their project
      const anotherUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      const anotherProject = await IntegrationTestUtils.createTestProject(prisma, anotherUser.id, testTenant.id);

      const response = await IntegrationTestSetup.request()
        .get(`/projects/${anotherProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should update project successfully', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description',
      };

      const response = await IntegrationTestSetup.request()
        .put(`/projects/${testProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);

      // Verify update in database
      const updatedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });
      expect(updatedProject.name).toBe(updateData.name);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        name: '', // Empty name
      };

      const response = await IntegrationTestSetup.request()
        .put(`/projects/${testProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should return 404 for non-existent project', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await IntegrationTestSetup.request()
        .put('/projects/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      IntegrationTestUtils.expectNotFound(response);
    });
  });

  describe('DELETE /projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should delete project successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .delete(`/projects/${testProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify deletion in database
      const deletedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await IntegrationTestSetup.request()
        .delete('/projects/non-existent-id')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });

    it('should return 403 for project belonging to another user', async () => {
      // Create another user and their project
      const anotherUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
      const anotherProject = await IntegrationTestUtils.createTestProject(prisma, anotherUser.id, testTenant.id);

      const response = await IntegrationTestSetup.request()
        .delete(`/projects/${anotherProject.id}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /projects/:id/duplicate', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should duplicate project successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .post(`/projects/${testProject.id}/duplicate`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.name).toContain('Copy of');
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.status).toBe('draft');
      expect(response.body.id).not.toBe(testProject.id);

      // Verify duplicate was created in database
      const duplicateProject = await prisma.project.findUnique({
        where: { id: response.body.id },
      });
      expect(duplicateProject).toBeTruthy();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/projects/non-existent-id/duplicate')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });
  });

  describe('POST /projects/:id/validate', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should validate project successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .post(`/projects/${testProject.id}/validate`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(Array.isArray(response.body.warnings)).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/projects/non-existent-id/validate')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`);

      IntegrationTestUtils.expectNotFound(response);
    });
  });

  describe('Auto-save functionality', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await IntegrationTestUtils.createTestProject(prisma, testUser.id, testTenant.id);
    });

    it('should auto-save project changes', async () => {
      const updateData = {
        data: {
          pages: [
            { id: 'page-1', elements: [] },
            { id: 'page-2', elements: [] },
          ],
        },
      };

      const response = await IntegrationTestSetup.request()
        .put(`/projects/${testProject.id}/auto-save`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toContain('auto-saved');

      // Verify auto-save data was stored
      const updatedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });
      expect(updatedProject.data).toEqual(updateData.data);
    });

    it('should handle concurrent auto-save requests', async () => {
      const updateData1 = { data: { version: 1 } };
      const updateData2 = { data: { version: 2 } };

      // Send concurrent requests
      const [response1, response2] = await Promise.all([
        IntegrationTestSetup.request()
          .put(`/projects/${testProject.id}/auto-save`)
          .set('X-Tenant-ID', testTenant.id)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData1),
        IntegrationTestSetup.request()
          .put(`/projects/${testProject.id}/auto-save`)
          .set('X-Tenant-ID', testTenant.id)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData2),
      ]);

      // Both should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});