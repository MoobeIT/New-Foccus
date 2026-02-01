import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ProjectSnapshot {
  id: string;
  name: string;
  status: string;
  productId: string | null;
  formatId: string | null;
  paperId: string | null;
  coverTypeId: string | null;
  pageCount: number;
  spineWidth: number;
  width: number;
  height: number;
  bleed: number;
  safeMargin: number;
  gutterMargin: number;
  settings: any;
  pages: any[];
}

export interface VersionInfo {
  id: string;
  versionNumber: number;
  createdAt: Date;
  isProduction: boolean;
  changesSummary: string | null;
}

@Injectable()
export class ProjectVersionService {
  private readonly MAX_VERSIONS = 20;
  private readonly RETENTION_DAYS = 30;
  private readonly MIN_VERSIONS_TO_KEEP = 5;

  constructor(private prisma: PrismaService) {}

  /**
   * Create a version snapshot of the project
   * 
   * Property 20: Version Snapshot Completeness
   * Validates: Requirements 13.1, 13.3
   */
  async createVersion(
    projectId: string,
    changesSummary?: string,
  ): Promise<VersionInfo> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Get current max version number
    const lastVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create snapshot of complete project state
    const snapshot: ProjectSnapshot = {
      id: project.id,
      name: project.name,
      status: project.status,
      productId: project.productId,
      formatId: project.formatId,
      paperId: project.paperId,
      coverTypeId: project.coverTypeId,
      pageCount: project.pageCount,
      spineWidth: project.spineWidth,
      width: project.width,
      height: project.height,
      bleed: project.bleed,
      safeMargin: project.safeMargin,
      gutterMargin: project.gutterMargin,
      settings: JSON.parse(project.settings as string || '{}'),
      pages: project.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        pageType: p.pageType,
        templateId: p.templateId,
        elements: JSON.parse(p.elements as string || '[]'),
        backgroundColor: p.backgroundColor,
      })),
    };

    // Create version record
    const version = await this.prisma.projectVersion.create({
      data: {
        projectId,
        versionNumber: newVersionNumber,
        data: JSON.stringify(snapshot),
        changesSummary,
        isProduction: false,
      },
    });

    // Update project current version
    await this.prisma.project.update({
      where: { id: projectId },
      data: { currentVersion: newVersionNumber },
    });

    // Cleanup old versions
    await this.cleanupOldVersions(projectId);

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
      isProduction: version.isProduction,
      changesSummary: version.changesSummary,
    };
  }


  /**
   * Get version history for a project
   * 
   * Validates: Requirements 13.2
   */
  async getVersionHistory(projectId: string): Promise<VersionInfo[]> {
    const versions = await this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      take: this.MAX_VERSIONS,
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        isProduction: true,
        changesSummary: true,
      },
    });

    return versions;
  }

  /**
   * Restore a project to a previous version
   * Creates a new version from the restored state
   * 
   * Property 20: Version Snapshot Completeness
   * Validates: Requirements 13.3
   */
  async restoreVersion(
    projectId: string,
    versionId: string,
  ): Promise<{ project: any; newVersion: VersionInfo }> {
    const version = await this.prisma.projectVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.projectId !== projectId) {
      throw new BadRequestException('Version not found');
    }

    const snapshot: ProjectSnapshot = JSON.parse(version.data);

    // Update project with snapshot data
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: snapshot.name,
        status: 'draft', // Reset to draft when restoring
        productId: snapshot.productId,
        formatId: snapshot.formatId,
        paperId: snapshot.paperId,
        coverTypeId: snapshot.coverTypeId,
        pageCount: snapshot.pageCount,
        spineWidth: snapshot.spineWidth,
        width: snapshot.width,
        height: snapshot.height,
        bleed: snapshot.bleed,
        safeMargin: snapshot.safeMargin,
        gutterMargin: snapshot.gutterMargin,
        settings: JSON.stringify(snapshot.settings),
        lockedAt: null,
        lockedVersionId: null,
      },
    });

    // Delete existing pages
    await this.prisma.page.deleteMany({
      where: { projectId },
    });

    // Recreate pages from snapshot
    for (const pageData of snapshot.pages) {
      await this.prisma.page.create({
        data: {
          projectId,
          pageNumber: pageData.pageNumber,
          pageType: pageData.pageType,
          templateId: pageData.templateId,
          elements: JSON.stringify(pageData.elements),
          backgroundColor: pageData.backgroundColor,
        },
      });
    }

    // Create new version for the restore action
    const newVersion = await this.createVersion(
      projectId,
      `Restored from version ${version.versionNumber}`,
    );

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });

    return { project, newVersion };
  }

  /**
   * Lock a project for production (creates immutable version)
   * 
   * Property 21: Production Lock Immutability
   * Validates: Requirements 13.5, 16.3
   */
  async lockForProduction(projectId: string): Promise<VersionInfo> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.status === 'locked') {
      throw new ConflictException('Project is already locked');
    }

    // Create production version
    const version = await this.createVersion(projectId, 'Production lock');

    // Mark version as production
    await this.prisma.projectVersion.update({
      where: { id: version.id },
      data: { isProduction: true },
    });

    // Lock the project
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'locked',
        lockedAt: new Date(),
        lockedVersionId: version.id,
      },
    });

    return { ...version, isProduction: true };
  }

  /**
   * Check if project is locked
   * 
   * Property 21: Production Lock Immutability
   * Validates: Requirements 13.5, 16.3
   */
  async isProjectLocked(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });

    return project?.status === 'locked';
  }

  /**
   * Get the production version of a project
   */
  async getProductionVersion(projectId: string): Promise<ProjectSnapshot | null> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { projectId, isProduction: true },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      return null;
    }

    return JSON.parse(version.data);
  }

  /**
   * Cleanup old versions based on retention policy
   * 
   * Validates: Requirements 13.4
   */
  private async cleanupOldVersions(projectId: string): Promise<void> {
    const versions = await this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (versions.length <= this.MIN_VERSIONS_TO_KEEP) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    // Keep at least MIN_VERSIONS_TO_KEEP versions
    // Delete versions older than RETENTION_DAYS, except production versions
    const versionsToDelete = versions
      .slice(this.MIN_VERSIONS_TO_KEEP)
      .filter((v) => !v.isProduction && v.createdAt < cutoffDate);

    if (versionsToDelete.length > 0) {
      await this.prisma.projectVersion.deleteMany({
        where: {
          id: { in: versionsToDelete.map((v) => v.id) },
        },
      });
    }
  }
}
