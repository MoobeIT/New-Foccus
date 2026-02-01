import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  CreateApprovalDto, 
  UpdateApprovalDto, 
  ApprovalResponseDto, 
  ApprovalStatsDto,
  ApprovalStatus,
  PublicApprovalResponseDto 
} from '../dto/approval.dto';
import { randomBytes } from 'crypto';

export interface ApprovalFilters {
  userId: string;
  tenantId: string;
  status?: ApprovalStatus;
  projectId?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreateApprovalDto): Promise<ApprovalResponseDto> {
    // Verificar se projeto existe
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId, tenantId },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Gerar token único para link de aprovação
    const token = this.generateToken();

    const approval = await this.prisma.approval.create({
      data: {
        userId,
        tenantId,
        projectId: dto.projectId,
        clientId: dto.clientId,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        token,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: ApprovalStatus.PENDING,
      },
    });

    return this.toResponseDto(approval, project.name);
  }

  async findAll(filters: ApprovalFilters): Promise<ApprovalResponseDto[]> {
    const { userId, tenantId, status, projectId } = filters;

    const where: any = { userId, tenantId };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const approvals = await this.prisma.approval.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    });

    // Buscar nomes dos projetos
    const projectIds = [...new Set(approvals.map(a => a.projectId))];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    const projectMap = new Map(projects.map(p => [p.id, p.name]));

    return approvals.map(a => this.toResponseDto(a, projectMap.get(a.projectId)));
  }

  async findOne(id: string, userId: string, tenantId: string): Promise<ApprovalResponseDto> {
    const approval = await this.prisma.approval.findFirst({
      where: { id, userId, tenantId },
    });

    if (!approval) {
      throw new NotFoundException('Aprovação não encontrada');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: approval.projectId },
      select: { name: true },
    });

    return this.toResponseDto(approval, project?.name);
  }

  async update(id: string, userId: string, tenantId: string, dto: UpdateApprovalDto): Promise<ApprovalResponseDto> {
    await this.findOne(id, userId, tenantId);

    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === ApprovalStatus.APPROVED || dto.status === ApprovalStatus.REJECTED || dto.status === ApprovalStatus.REVISION) {
        updateData.respondedAt = new Date();
      }
    }

    if (dto.feedback !== undefined) {
      updateData.feedback = dto.feedback;
    }

    if (dto.revisionNotes !== undefined) {
      updateData.revisionNotes = dto.revisionNotes;
    }

    const approval = await this.prisma.approval.update({
      where: { id },
      data: updateData,
    });

    const project = await this.prisma.project.findUnique({
      where: { id: approval.projectId },
      select: { name: true },
    });

    return this.toResponseDto(approval, project?.name);
  }

  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    await this.findOne(id, userId, tenantId);

    await this.prisma.approval.delete({
      where: { id },
    });
  }

  async resendLink(id: string, userId: string, tenantId: string): Promise<ApprovalResponseDto> {
    const approval = await this.findOne(id, userId, tenantId);

    // Gerar novo token e resetar status
    const newToken = this.generateToken();

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        token: newToken,
        status: ApprovalStatus.PENDING,
        sentAt: new Date(),
        viewedAt: null,
        respondedAt: null,
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: updated.projectId },
      select: { name: true },
    });

    return this.toResponseDto(updated, project?.name);
  }

  async getStats(userId: string, tenantId: string): Promise<ApprovalStatsDto> {
    const approvals = await this.prisma.approval.findMany({
      where: { userId, tenantId },
      select: { status: true },
    });

    const stats: ApprovalStatsDto = {
      total: approvals.length,
      pending: 0,
      viewed: 0,
      approved: 0,
      revision: 0,
      rejected: 0,
    };

    approvals.forEach(a => {
      switch (a.status) {
        case ApprovalStatus.PENDING:
          stats.pending++;
          break;
        case ApprovalStatus.VIEWED:
          stats.viewed++;
          break;
        case ApprovalStatus.APPROVED:
          stats.approved++;
          break;
        case ApprovalStatus.REVISION:
          stats.revision++;
          break;
        case ApprovalStatus.REJECTED:
          stats.rejected++;
          break;
      }
    });

    return stats;
  }

  // ==================== PUBLIC ENDPOINTS ====================

  async findByToken(token: string): Promise<PublicApprovalResponseDto> {
    const approval = await this.prisma.approval.findUnique({
      where: { token },
    });

    if (!approval) {
      throw new NotFoundException('Link de aprovação inválido');
    }

    // Verificar expiração
    const isExpired = approval.expiresAt && new Date(approval.expiresAt) < new Date();

    // Buscar dados do projeto e fotógrafo
    const project = await this.prisma.project.findUnique({
      where: { id: approval.projectId },
      select: { name: true, userId: true },
    });

    const photographer = await this.prisma.user.findUnique({
      where: { id: approval.userId },
      select: { name: true },
    });

    // Marcar como visualizado se ainda não foi
    if (approval.status === ApprovalStatus.PENDING && !isExpired) {
      await this.prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
    }

    return {
      id: approval.id,
      projectName: project?.name || 'Projeto',
      photographerName: photographer?.name || 'Fotógrafo',
      status: approval.status,
      isExpired: !!isExpired,
    };
  }

  async respondToApproval(token: string, status: ApprovalStatus, feedback?: string, revisionNotes?: string): Promise<PublicApprovalResponseDto> {
    const approval = await this.prisma.approval.findUnique({
      where: { token },
    });

    if (!approval) {
      throw new NotFoundException('Link de aprovação inválido');
    }

    // Verificar expiração
    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      throw new ForbiddenException('Este link de aprovação expirou');
    }

    // Validar status permitidos para resposta do cliente
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REVISION].includes(status)) {
      throw new BadRequestException('Status inválido');
    }

    await this.prisma.approval.update({
      where: { id: approval.id },
      data: {
        status,
        feedback,
        revisionNotes,
        respondedAt: new Date(),
      },
    });

    return this.findByToken(token);
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private toResponseDto(approval: any, projectName?: string): ApprovalResponseDto {
    return {
      id: approval.id,
      projectId: approval.projectId,
      projectName,
      clientId: approval.clientId,
      clientName: approval.clientName,
      clientEmail: approval.clientEmail,
      status: approval.status as ApprovalStatus,
      token: approval.token,
      expiresAt: approval.expiresAt,
      sentAt: approval.sentAt,
      viewedAt: approval.viewedAt,
      respondedAt: approval.respondedAt,
      feedback: approval.feedback,
      revisionNotes: approval.revisionNotes,
      createdAt: approval.createdAt,
    };
  }
}
