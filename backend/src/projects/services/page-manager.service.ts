import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PageData {
  id: string;
  pageNumber: number;
  pageType: 'regular' | 'guard_front' | 'guard_back' | 'title' | 'dedication';
  templateId?: string;
  elements: any[];
  backgroundColor: string;
}

export interface AddPageOptions {
  position: number;
  templateId?: string;
  pageType?: 'regular' | 'title' | 'dedication';
}

@Injectable()
export class PageManagerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add a page pair (2 pages) to maintain even page count
   * 
   * Property 5: Page Count Even Number Invariant
   * Validates: Requirements 2.4, 5.1, 5.2
   */
  async addPagePair(
    projectId: string,
    options: AddPageOptions,
  ): Promise<{ pages: PageData[]; newPageCount: number }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: { orderBy: { pageNumber: 'asc' } }, format: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const currentPageCount = project.pages.length;
    const maxPages = project.format?.maxPages || 200;

    // Check if we can add more pages
    if (currentPageCount + 2 > maxPages) {
      throw new BadRequestException(
        `Cannot add pages. Maximum is ${maxPages} pages.`,
      );
    }

    const { position, templateId, pageType = 'regular' } = options;

    // Validate position
    if (position < 0 || position > currentPageCount) {
      throw new BadRequestException('Invalid page position');
    }

    // Create two new pages
    const newPages: PageData[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < 2; i++) {
      const page = await this.prisma.page.create({
        data: {
          projectId,
          pageNumber: position + i + 1, // Will be renumbered
          pageType,
          templateId,
          elements: JSON.stringify([]),
          backgroundColor: '#ffffff',
        },
      });

      newPages.push({
        id: page.id,
        pageNumber: page.pageNumber,
        pageType: page.pageType as PageData['pageType'],
        templateId: page.templateId || undefined,
        elements: [],
        backgroundColor: page.backgroundColor,
      });
    }

    // Renumber all pages after insertion point
    await this.renumberPages(projectId);

    // Update project page count
    const newPageCount = currentPageCount + 2;
    await this.prisma.project.update({
      where: { id: projectId },
      data: { pageCount: newPageCount },
    });

    return { pages: newPages, newPageCount };
  }

  /**
   * Remove a page pair to maintain even page count
   * 
   * Property 5: Page Count Even Number Invariant
   * Validates: Requirements 2.4, 5.1, 5.2
   */
  async removePagePair(
    projectId: string,
    pageId: string,
  ): Promise<{ removedPages: string[]; newPageCount: number }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: { orderBy: { pageNumber: 'asc' } }, format: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const minPages = project.format?.minPages || 20;
    const currentPageCount = project.pages.length;

    // Check if we can remove pages
    if (currentPageCount - 2 < minPages) {
      throw new BadRequestException(
        `Cannot remove pages. Minimum is ${minPages} pages.`,
      );
    }

    // Find the page to remove
    const pageToRemove = project.pages.find((p) => p.id === pageId);
    if (!pageToRemove) {
      throw new BadRequestException('Page not found');
    }

    // Don't allow removing special pages
    if (['guard_front', 'guard_back'].includes(pageToRemove.pageType)) {
      throw new BadRequestException('Cannot remove guard pages');
    }

    // Find the adjacent page to remove (to maintain pair)
    const pageIndex = project.pages.findIndex((p) => p.id === pageId);
    const adjacentIndex = pageIndex % 2 === 0 ? pageIndex + 1 : pageIndex - 1;
    const adjacentPage = project.pages[adjacentIndex];

    const pagesToRemove = [pageId];
    if (adjacentPage && !['guard_front', 'guard_back'].includes(adjacentPage.pageType)) {
      pagesToRemove.push(adjacentPage.id);
    }

    // Remove pages
    await this.prisma.page.deleteMany({
      where: { id: { in: pagesToRemove } },
    });

    // Renumber remaining pages
    await this.renumberPages(projectId);

    // Update project page count
    const newPageCount = currentPageCount - pagesToRemove.length;
    await this.prisma.project.update({
      where: { id: projectId },
      data: { pageCount: newPageCount },
    });

    return { removedPages: pagesToRemove, newPageCount };
  }


  /**
   * Reorder pages by providing new order of page IDs
   * 
   * Property 10: Page Reorder Content Preservation
   * Validates: Requirements 5.3
   */
  async reorderPages(
    projectId: string,
    pageIds: string[],
  ): Promise<PageData[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Validate all page IDs belong to this project
    const existingIds = new Set(project.pages.map((p) => p.id));
    for (const id of pageIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Page ${id} not found in project`);
      }
    }

    // Update page numbers based on new order
    const updates = pageIds.map((id, index) =>
      this.prisma.page.update({
        where: { id },
        data: { pageNumber: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);

    // Return updated pages
    const updatedPages = await this.prisma.page.findMany({
      where: { projectId },
      orderBy: { pageNumber: 'asc' },
    });

    return updatedPages.map((p) => ({
      id: p.id,
      pageNumber: p.pageNumber,
      pageType: p.pageType as PageData['pageType'],
      templateId: p.templateId || undefined,
      elements: JSON.parse(p.elements as string || '[]'),
      backgroundColor: p.backgroundColor,
    }));
  }

  /**
   * Duplicate a page (creates a copy with new ID)
   * 
   * Property 11: Page Duplication Equivalence
   * Validates: Requirements 5.4
   */
  async duplicatePage(
    projectId: string,
    pageId: string,
  ): Promise<{ originalPage: PageData; duplicatedPage: PageData; newPageCount: number }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: { orderBy: { pageNumber: 'asc' } }, format: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const maxPages = project.format?.maxPages || 200;
    if (project.pages.length + 2 > maxPages) {
      throw new BadRequestException(
        `Cannot duplicate. Maximum is ${maxPages} pages.`,
      );
    }

    // Find the page to duplicate
    const originalPage = project.pages.find((p) => p.id === pageId);
    if (!originalPage) {
      throw new BadRequestException('Page not found');
    }

    // Create duplicate page (and an adjacent blank to maintain even count)
    const insertPosition = originalPage.pageNumber;

    const duplicatedPage = await this.prisma.page.create({
      data: {
        projectId,
        pageNumber: insertPosition + 1,
        pageType: originalPage.pageType,
        templateId: originalPage.templateId,
        elements: originalPage.elements,
        backgroundColor: originalPage.backgroundColor,
      },
    });

    // Create adjacent blank page
    await this.prisma.page.create({
      data: {
        projectId,
        pageNumber: insertPosition + 2,
        pageType: 'regular',
        elements: JSON.stringify([]),
        backgroundColor: '#ffffff',
      },
    });

    // Renumber pages
    await this.renumberPages(projectId);

    // Update project page count
    const newPageCount = project.pages.length + 2;
    await this.prisma.project.update({
      where: { id: projectId },
      data: { pageCount: newPageCount },
    });

    return {
      originalPage: {
        id: originalPage.id,
        pageNumber: originalPage.pageNumber,
        pageType: originalPage.pageType as PageData['pageType'],
        templateId: originalPage.templateId || undefined,
        elements: JSON.parse(originalPage.elements as string || '[]'),
        backgroundColor: originalPage.backgroundColor,
      },
      duplicatedPage: {
        id: duplicatedPage.id,
        pageNumber: duplicatedPage.pageNumber,
        pageType: duplicatedPage.pageType as PageData['pageType'],
        templateId: duplicatedPage.templateId || undefined,
        elements: JSON.parse(duplicatedPage.elements as string || '[]'),
        backgroundColor: duplicatedPage.backgroundColor,
      },
      newPageCount,
    };
  }

  /**
   * Renumber all pages in sequence
   */
  private async renumberPages(projectId: string): Promise<void> {
    const pages = await this.prisma.page.findMany({
      where: { projectId },
      orderBy: { pageNumber: 'asc' },
    });

    const updates = pages.map((page, index) =>
      this.prisma.page.update({
        where: { id: page.id },
        data: { pageNumber: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  /**
   * Initialize project with default pages including guards
   * 
   * Property: Guard page inclusion
   * Validates: Requirements 12.1
   */
  async initializeProjectPages(
    projectId: string,
    initialPageCount: number = 20,
    includeGuards: boolean = true,
  ): Promise<PageData[]> {
    const pages: PageData[] = [];

    // Create guard front if needed
    if (includeGuards) {
      const guardFront = await this.prisma.page.create({
        data: {
          projectId,
          pageNumber: 1,
          pageType: 'guard_front',
          elements: JSON.stringify([]),
          backgroundColor: '#ffffff',
        },
      });
      pages.push({
        id: guardFront.id,
        pageNumber: 1,
        pageType: 'guard_front',
        elements: [],
        backgroundColor: '#ffffff',
      });
    }

    // Create regular pages
    const startNumber = includeGuards ? 2 : 1;
    const regularPageCount = includeGuards ? initialPageCount - 2 : initialPageCount;

    for (let i = 0; i < regularPageCount; i++) {
      const page = await this.prisma.page.create({
        data: {
          projectId,
          pageNumber: startNumber + i,
          pageType: 'regular',
          elements: JSON.stringify([]),
          backgroundColor: '#ffffff',
        },
      });
      pages.push({
        id: page.id,
        pageNumber: startNumber + i,
        pageType: 'regular',
        elements: [],
        backgroundColor: '#ffffff',
      });
    }

    // Create guard back if needed
    if (includeGuards) {
      const guardBack = await this.prisma.page.create({
        data: {
          projectId,
          pageNumber: initialPageCount,
          pageType: 'guard_back',
          elements: JSON.stringify([]),
          backgroundColor: '#ffffff',
        },
      });
      pages.push({
        id: guardBack.id,
        pageNumber: initialPageCount,
        pageType: 'guard_back',
        elements: [],
        backgroundColor: '#ffffff',
      });
    }

    // Update project page count
    await this.prisma.project.update({
      where: { id: projectId },
      data: { pageCount: pages.length },
    });

    return pages;
  }

  /**
   * Get page count excluding special pages (for display)
   * 
   * Property 19: Special Page Count Exclusion
   * Validates: Requirements 12.4
   */
  getDisplayPageCount(pages: PageData[]): number {
    return pages.filter(
      (p) => !['guard_front', 'guard_back', 'title', 'dedication'].includes(p.pageType),
    ).length;
  }

  /**
   * Get total page count including special pages (for pricing)
   */
  getTotalPageCount(pages: PageData[]): number {
    return pages.length;
  }
}
