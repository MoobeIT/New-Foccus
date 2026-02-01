import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApprovalsService, ApprovalFilters } from '../services/approvals.service';
import { 
  CreateApprovalDto, 
  UpdateApprovalDto, 
  ApprovalResponseDto, 
  ApprovalStatsDto,
  ApprovalStatus,
  PublicApprovalResponseDto 
} from '../dto/approval.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('studio/approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('studio/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova aprovação' })
  @ApiResponse({ status: 201, description: 'Aprovação criada com sucesso', type: ApprovalResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async create(
    @Request() req,
    @Body() createApprovalDto: CreateApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.create(req.user.id, req.user.tenantId, createApprovalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar aprovações do fotógrafo' })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filtrar por projeto' })
  @ApiResponse({ status: 200, description: 'Lista de aprovações', type: [ApprovalResponseDto] })
  async findAll(
    @Request() req,
    @Query('status') status?: ApprovalStatus,
    @Query('projectId') projectId?: string,
  ): Promise<ApprovalResponseDto[]> {
    const filters: ApprovalFilters = {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      status,
      projectId,
    };

    return this.approvalsService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das aprovações' })
  @ApiResponse({ status: 200, description: 'Estatísticas das aprovações', type: ApprovalStatsDto })
  async getStats(@Request() req): Promise<ApprovalStatsDto> {
    return this.approvalsService.getStats(req.user.id, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar aprovação por ID' })
  @ApiParam({ name: 'id', description: 'ID da aprovação' })
  @ApiResponse({ status: 200, description: 'Aprovação encontrada', type: ApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Aprovação não encontrada' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.findOne(id, req.user.id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar aprovação' })
  @ApiParam({ name: 'id', description: 'ID da aprovação' })
  @ApiResponse({ status: 200, description: 'Aprovação atualizada', type: ApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Aprovação não encontrada' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateApprovalDto: UpdateApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.update(id, req.user.id, req.user.tenantId, updateApprovalDto);
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Reenviar link de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da aprovação' })
  @ApiResponse({ status: 200, description: 'Link reenviado', type: ApprovalResponseDto })
  async resendLink(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.resendLink(id, req.user.id, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar aprovação' })
  @ApiParam({ name: 'id', description: 'ID da aprovação' })
  @ApiResponse({ status: 204, description: 'Aprovação deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Aprovação não encontrada' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.approvalsService.remove(id, req.user.id, req.user.tenantId);
  }
}

// Controller público para clientes acessarem aprovações
@ApiTags('approvals')
@Controller('approvals')
export class PublicApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Acessar aprovação por token (público)' })
  @ApiParam({ name: 'token', description: 'Token da aprovação' })
  @ApiResponse({ status: 200, description: 'Dados da aprovação', type: PublicApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Aprovação não encontrada' })
  async findByToken(@Param('token') token: string): Promise<PublicApprovalResponseDto> {
    return this.approvalsService.findByToken(token);
  }

  @Post(':token/respond')
  @ApiOperation({ summary: 'Responder aprovação (público)' })
  @ApiParam({ name: 'token', description: 'Token da aprovação' })
  @ApiResponse({ status: 200, description: 'Resposta registrada', type: PublicApprovalResponseDto })
  async respond(
    @Param('token') token: string,
    @Body() body: { status: ApprovalStatus; feedback?: string; revisionNotes?: string },
  ): Promise<PublicApprovalResponseDto> {
    return this.approvalsService.respondToApproval(token, body.status, body.feedback, body.revisionNotes);
  }
}
