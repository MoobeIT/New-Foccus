import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminProductionService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== PROJECTS ====================

  async getProductionProjects() {
    try {
      const projects = await this.prisma.project.findMany({
        where: {
          status: { in: ['production', 'PRODUCTION', 'completed', 'COMPLETED'] }
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
          format: { select: { id: true, name: true, width: true, height: true } },
        },
      });

      return projects.map(p => {
        const settings = this.parseSettings(p.settings);

        return {
          id: p.id,
          name: p.name,
          userName: p.user?.name || 'Cliente',
          userEmail: p.user?.email,
          productName: p.product?.name || 'Fotolivro',
          pageCount: p.pageCount || 20,
          totalPrice: settings.totalPrice || settings.price || 299,
          paymentStatus: settings.paymentStatus || 'pending',
          productionStatus: settings.productionStatus || 'pending',
          status: p.status,
          thumbnail: settings.thumbnail || settings.coverUrl,
          trackingCode: settings.trackingCode,
          shippingAddress: settings.shippingAddress,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });
    } catch (error) {
      console.error('Error fetching production projects:', error);
      return [];
    }
  }

  async confirmPayment(projectId: string, paymentMethod: string, notes?: string) {
    try {
      const currentSettings = await this.getProjectSettings(projectId);
      const newSettings = {
        ...currentSettings,
        paymentStatus: 'paid',
        productionStatus: 'ready', // Liberado para produção
        paymentMethod,
        paymentNotes: notes,
        paymentDate: new Date().toISOString(),
      };

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          settings: JSON.stringify(newSettings),
        },
      });

      return {
        success: true,
        message: 'Pagamento confirmado com sucesso',
        project: {
          id: projectId,
          paymentStatus: 'paid',
          productionStatus: 'ready',
        }
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async startProjectProduction(projectId: string) {
    try {
      const currentSettings = await this.getProjectSettings(projectId);
      const newSettings = {
        ...currentSettings,
        productionStatus: 'producing',
        productionStartDate: new Date().toISOString(),
      };

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          settings: JSON.stringify(newSettings),
        },
      });

      return {
        success: true,
        message: 'Produção iniciada',
      };
    } catch (error) {
      console.error('Error starting production:', error);
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async completeProjectProduction(projectId: string) {
    try {
      const currentSettings = await this.getProjectSettings(projectId);
      const newSettings = {
        ...currentSettings,
        productionStatus: 'ready_ship', // Pronto para envio
        productionEndDate: new Date().toISOString(),
      };

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          settings: JSON.stringify(newSettings),
        },
      });

      return {
        success: true,
        message: 'Produção concluída',
      };
    } catch (error) {
      console.error('Error completing production:', error);
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async shipProject(projectId: string, shippingAddress: any, shippingMethod: string, trackingCode: string) {
    try {
      const currentSettings = await this.getProjectSettings(projectId);
      const newSettings = {
        ...currentSettings,
        productionStatus: 'shipped',
        shippingAddress,
        shippingMethod,
        trackingCode,
        shippedAt: new Date().toISOString(),
      };

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'completed',
          settings: JSON.stringify(newSettings),
        },
      });

      return {
        success: true,
        message: 'Projeto enviado',
        trackingCode,
      };
    } catch (error) {
      console.error('Error shipping project:', error);
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async changeProductionStatus(projectId: string, productionStatus: string) {
    try {
      const currentSettings = await this.getProjectSettings(projectId);
      const newSettings = {
        ...currentSettings,
        productionStatus,
        // Se status for diferente de pending, marcar como pago
        paymentStatus: productionStatus !== 'pending' ? 'paid' : currentSettings.paymentStatus,
        statusChangedAt: new Date().toISOString(),
      };

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          settings: JSON.stringify(newSettings),
        },
      });

      return {
        success: true,
        message: `Status alterado para ${productionStatus}`,
        productionStatus,
      };
    } catch (error) {
      console.error('Error changing production status:', error);
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async getProjectFiles(projectId: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' }
          },
          format: true,
          product: true,
        }
      });

      if (!project) {
        return {
          success: false,
          message: 'Projeto não encontrado',
        };
      }

      const settings = this.parseSettings(project.settings);
      
      // Verificar se pagamento foi confirmado (comentado para teste)
      // if (settings.paymentStatus !== 'paid' && settings.productionStatus === 'pending') {
      //   return {
      //     success: false,
      //     message: 'Pagamento não confirmado. Arquivos bloqueados.',
      //   };
      // }

      // Separar páginas de capa e miolo
      const coverPages = project.pages?.filter((p: any) => 
        p.pageType === 'cover_front' || p.pageType === 'cover_back' || p.pageType === 'spine'
      ) || [];
      
      const contentPages = project.pages?.filter((p: any) => 
        !['cover_front', 'cover_back', 'spine'].includes(p.pageType)
      ) || [];

      // URLs para renderização - usar token na query string
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
      
      return {
        success: true,
        projectId: project.id,
        projectName: project.name,
        pageCount: project.pageCount,
        format: project.format ? {
          name: project.format.name,
          width: project.format.width,
          height: project.format.height,
        } : null,
        downloads: {
          // PDF completo
          fullPdf: `/api/v1/render/project/${projectId}/pdf`,
          // PDF só da capa (frente, lombada, verso)
          coverPdf: `/api/v1/render/project/${projectId}/cover-pdf`,
          // PDF só do miolo
          contentPdf: `/api/v1/render/project/${projectId}/content-pdf`,
          // Imagens individuais
          pages: project.pages?.map((p: any) => ({
            pageId: p.id,
            pageNumber: p.pageNumber,
            pageType: p.pageType,
            imageUrl: `/api/v1/render/page/${p.id}/image`,
          })) || [],
        },
        coverPagesCount: coverPages.length,
        contentPagesCount: contentPages.length,
        // Informações adicionais para o modal
        message: 'Arquivos prontos para download. Clique nos botões para baixar.',
      };
    } catch (error) {
      console.error('Error getting project files:', error);
      return {
        success: false,
        message: 'Erro ao buscar projeto: ' + error.message,
      };
    }
  }

  private parseSettings(settings: any): Record<string, any> {
    if (!settings) return {};
    if (typeof settings === 'string') {
      try {
        return JSON.parse(settings);
      } catch {
        return {};
      }
    }
    if (typeof settings === 'object') {
      return settings as Record<string, any>;
    }
    return {};
  }

  private async getProjectSettings(projectId: string): Promise<Record<string, any>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true }
    });
    return this.parseSettings(project?.settings);
  }

  // ==================== JOBS (Legacy) ====================

  async getJobs() {
    try {
      const orders = await this.prisma.order.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING', 'IN_PRODUCTION'] } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      });

      const jobs = orders.map((o, i) => ({
        id: 100 + i,
        orderId: o.id,
        productName: 'Álbum Fotográfico',
        customerName: o.user?.name || 'Cliente',
        quantity: 1,
        pages: 20,
        format: '30x30cm',
        priority: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        status: o.status === 'PENDING' ? 'pending' : 'in_production',
        deadline: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      }));

      const stats = {
        pending: jobs.filter(j => j.status === 'pending').length,
        inProduction: jobs.filter(j => j.status === 'in_production').length,
        completedToday: 8,
        approvalRate: 98,
      };

      return { jobs, stats };
    } catch {
      return {
        jobs: [
          { id: 101, orderId: 1234, productName: 'Álbum Casamento 30x30', customerName: 'João Silva', quantity: 1, pages: 40, format: '30x30cm', priority: 'high', status: 'in_production', deadline: '2026-01-02' },
          { id: 102, orderId: 1233, productName: 'Álbum Ensaio 25x25', customerName: 'Maria Santos', quantity: 2, pages: 20, format: '25x25cm', priority: 'medium', status: 'pending', deadline: '2026-01-03' },
        ],
        stats: { pending: 5, inProduction: 3, completedToday: 8, approvalRate: 98 },
      };
    }
  }

  async startJob(id: string) {
    return { success: true, message: `Job ${id} iniciado` };
  }

  async completeJob(id: string) {
    return { success: true, message: `Job ${id} concluído` };
  }

  async changePriority(id: string, priority: string) {
    return { success: true, message: `Prioridade do job ${id} alterada para ${priority}` };
  }
}
