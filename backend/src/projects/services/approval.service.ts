import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface ApprovalLink {
  id: string;
  projectId: string;
  tenantId: string;
  token: string;
  clientEmail: string;
  clientName: string;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  pageId: string;
  author: string;
  authorType: 'client' | 'photographer';
  text: string;
  reply?: string;
  repliedAt?: Date;
  createdAt: Date;
}

export interface ProjectApprovalData {
  project: {
    id: string;
    name: string;
    photographerName: string;
    photographerEmail: string;
    photographerPhone?: string;
    productName: string;
    format: string;
    paper: string;
    coverType: string;
    basePrice: number;
    extraPagesPrice: number;
    casePrice: number;
    totalPrice: number;
  };
  pages: {
    id: string;
    type: string;
    previewUrl?: string;
    comments: ApprovalComment[];
  }[];
  approval: ApprovalLink;
}

@Injectable()
export class ApprovalService {
  private approvals: Map<string, ApprovalLink> = new Map();
  private comments: Map<string, ApprovalComment[]> = new Map();

  constructor(private logger: LoggerService) {}

  async createApprovalLink(
    tenantId: string,
    projectId: string,
    clientEmail: string,
    clientName: string,
    expiresInDays: number = 7,
  ): Promise<ApprovalLink> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const approval: ApprovalLink = {
      id: `approval-${Date.now()}`,
      projectId,
      tenantId,
      token,
      clientEmail,
      clientName,
      expiresAt,
      status: 'pending',
      createdAt: new Date(),
    };

    this.approvals.set(approval.id, approval);
    this.approvals.set(token, approval); // Also index by token
    this.comments.set(approval.id, []);

    this.logger.debug('Approval link created', 'ApprovalService', {
      approvalId: approval.id,
      projectId,
    });

    return approval;
  }

  async getApprovalByToken(token: string): Promise<ProjectApprovalData | null> {
    const approval = this.approvals.get(token);
    
    if (!approval) {
      return null;
    }

    // Check if expired
    if (new Date() > approval.expiresAt && approval.status === 'pending') {
      approval.status = 'expired';
    }

    // Mock project data - in production, fetch from database
    const projectData: ProjectApprovalData = {
      project: {
        id: approval.projectId,
        name: 'Casamento Marina & Lucas',
        photographerName: 'Studio Foccus',
        photographerEmail: 'contato@foccus.com',
        photographerPhone: '11999999999',
        productName: 'Álbum Casamento Premium',
        format: '30x30 cm',
        paper: 'Papel Fosco 230g',
        coverType: 'Capa Dura Premium',
        basePrice: 299.90,
        extraPagesPrice: 60.00,
        casePrice: 189.90,
        totalPrice: 549.80,
      },
      pages: [
        { id: 'cover', type: 'cover', comments: [] },
        { id: 'p1', type: 'spread', comments: [] },
        { id: 'p2', type: 'spread', comments: [] },
        { id: 'p3', type: 'spread', comments: [] },
        { id: 'p4', type: 'spread', comments: [] },
      ],
      approval,
    };

    // Add comments to pages
    const approvalComments = this.comments.get(approval.id) || [];
    for (const comment of approvalComments) {
      const page = projectData.pages.find(p => p.id === comment.pageId);
      if (page) {
        page.comments.push(comment);
      }
    }

    return projectData;
  }

  async addComment(
    token: string,
    pageId: string,
    author: string,
    authorType: 'client' | 'photographer',
    text: string,
  ): Promise<ApprovalComment> {
    const approval = this.approvals.get(token);
    
    if (!approval) {
      throw new NotFoundException('Link de aprovação não encontrado');
    }

    const comment: ApprovalComment = {
      id: `comment-${Date.now()}`,
      approvalId: approval.id,
      pageId,
      author,
      authorType,
      text,
      createdAt: new Date(),
    };

    const comments = this.comments.get(approval.id) || [];
    comments.push(comment);
    this.comments.set(approval.id, comments);

    return comment;
  }

  async replyToComment(
    commentId: string,
    reply: string,
  ): Promise<ApprovalComment> {
    for (const comments of this.comments.values()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.reply = reply;
        comment.repliedAt = new Date();
        return comment;
      }
    }

    throw new NotFoundException('Comentário não encontrado');
  }

  async approveProject(token: string): Promise<ApprovalLink> {
    const approval = this.approvals.get(token);
    
    if (!approval) {
      throw new NotFoundException('Link de aprovação não encontrado');
    }

    if (approval.status !== 'pending') {
      throw new Error('Este projeto já foi processado');
    }

    approval.status = 'approved';
    approval.approvedAt = new Date();

    this.logger.debug('Project approved', 'ApprovalService', {
      approvalId: approval.id,
      projectId: approval.projectId,
    });

    // TODO: Trigger order creation, send notification to photographer

    return approval;
  }

  async rejectProject(token: string, reason: string): Promise<ApprovalLink> {
    const approval = this.approvals.get(token);
    
    if (!approval) {
      throw new NotFoundException('Link de aprovação não encontrado');
    }

    if (approval.status !== 'pending') {
      throw new Error('Este projeto já foi processado');
    }

    approval.status = 'rejected';
    approval.rejectedAt = new Date();
    approval.rejectionReason = reason;

    this.logger.debug('Project rejected', 'ApprovalService', {
      approvalId: approval.id,
      projectId: approval.projectId,
      reason,
    });

    // TODO: Send notification to photographer

    return approval;
  }

  async resendApprovalLink(approvalId: string): Promise<ApprovalLink> {
    const approval = this.approvals.get(approvalId);
    
    if (!approval) {
      throw new NotFoundException('Aprovação não encontrada');
    }

    // Extend expiration
    approval.expiresAt = new Date();
    approval.expiresAt.setDate(approval.expiresAt.getDate() + 7);

    if (approval.status === 'expired') {
      approval.status = 'pending';
    }

    // TODO: Send email with approval link

    return approval;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
