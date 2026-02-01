import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ApprovalService } from '../services/approval.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('approvals')
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Post('create')
  async createApprovalLink(
    @Request() req: any,
    @Body() body: {
      projectId: string;
      clientEmail: string;
      clientName: string;
      expiresInDays?: number;
    },
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.approvalService.createApprovalLink(
      tenantId,
      body.projectId,
      body.clientEmail,
      body.clientName,
      body.expiresInDays,
    );
  }

  @Public()
  @Get('view/:token')
  async getApprovalByToken(@Param('token') token: string) {
    return this.approvalService.getApprovalByToken(token);
  }

  @Public()
  @Post(':token/comment')
  async addComment(
    @Param('token') token: string,
    @Body() body: {
      pageId: string;
      author: string;
      text: string;
    },
  ) {
    return this.approvalService.addComment(
      token,
      body.pageId,
      body.author,
      'client',
      body.text,
    );
  }

  @Post('comment/:commentId/reply')
  async replyToComment(
    @Param('commentId') commentId: string,
    @Body() body: { reply: string },
  ) {
    return this.approvalService.replyToComment(commentId, body.reply);
  }

  @Public()
  @Post(':token/approve')
  async approveProject(@Param('token') token: string) {
    return this.approvalService.approveProject(token);
  }

  @Public()
  @Post(':token/reject')
  async rejectProject(
    @Param('token') token: string,
    @Body() body: { reason: string },
  ) {
    return this.approvalService.rejectProject(token, body.reason);
  }

  @Post(':approvalId/resend')
  async resendApprovalLink(@Param('approvalId') approvalId: string) {
    return this.approvalService.resendApprovalLink(approvalId);
  }
}
