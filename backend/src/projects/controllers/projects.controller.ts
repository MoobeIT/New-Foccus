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
import { ProjectsService, ProjectFilters } from '../services/projects.service';
import { AutoSaveService } from '../services/auto-save.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AutoSaveDto } from '../dto/auto-save.dto';
import { ProjectEntity, ProjectStatus } from '../entities/project.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly autoSaveService: AutoSaveService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo projeto' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso', type: ProjectEntity })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Request() req,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.create(
      req.user.id,
      req.user.tenantId,
      createProjectDto,
    );

    // Iniciar sessão de auto-save
    this.autoSaveService.startSession(project.id, req.user.id, req.user.tenantId);

    return project;
  }

  @Get()
  @ApiOperation({ summary: 'Listar projetos do usuário' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'productId', required: false, description: 'Filtrar por produto' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome' })
  @ApiResponse({ status: 200, description: 'Lista de projetos', type: [ProjectEntity] })
  async findAll(
    @Request() req,
    @Query('status') status?: ProjectStatus,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
  ): Promise<ProjectEntity[]> {
    const filters: ProjectFilters = {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      status,
      productId,
      search,
    };

    return this.projectsService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas dos projetos' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos projetos' })
  async getStats(@Request() req) {
    return this.projectsService.getStats(req.user.id, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Projeto encontrado', type: ProjectEntity })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.findOne(id, req.user.id, req.user.tenantId);

    // Iniciar sessão de auto-save ao abrir projeto
    this.autoSaveService.startSession(id, req.user.id, req.user.tenantId);

    return project;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado', type: ProjectEntity })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, req.user.id, req.user.tenantId, updateProjectDto);
  }

  @Post(':id/auto-save')
  @ApiOperation({ summary: 'Auto-save do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Auto-save realizado', type: ProjectEntity })
  @ApiResponse({ status: 409, description: 'Conflito de versão' })
  async autoSave(
    @Request() req,
    @Param('id') id: string,
    @Body() autoSaveDto: AutoSaveDto,
  ): Promise<ProjectEntity> {
    // Agendar auto-save (com debounce)
    this.autoSaveService.scheduleAutoSave(id, req.user.id, req.user.tenantId, autoSaveDto);

    // Retornar projeto atual (o auto-save acontece em background)
    return this.projectsService.findOne(id, req.user.id, req.user.tenantId);
  }

  @Post(':id/force-save')
  @ApiOperation({ summary: 'Forçar salvamento imediato' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Salvamento forçado realizado', type: ProjectEntity })
  async forceSave(
    @Request() req,
    @Param('id') id: string,
    @Body() autoSaveDto: AutoSaveDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.autoSave(id, req.user.id, req.user.tenantId, autoSaveDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 201, description: 'Projeto duplicado', type: ProjectEntity })
  async duplicate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string },
  ): Promise<ProjectEntity> {
    return this.projectsService.duplicate(id, req.user.id, req.user.tenantId, body.name);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status do projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Status alterado', type: ProjectEntity })
  async changeStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: ProjectStatus },
  ): Promise<ProjectEntity> {
    return this.projectsService.changeStatus(id, req.user.id, req.user.tenantId, body.status);
  }

  @Get(':id/auto-save-status')
  @ApiOperation({ summary: 'Status do auto-save' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 200, description: 'Status do auto-save' })
  async getAutoSaveStatus(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.autoSaveService.getSessionInfo(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar projeto' })
  @ApiParam({ name: 'id', description: 'ID do projeto' })
  @ApiResponse({ status: 204, description: 'Projeto deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    // Parar auto-save antes de deletar
    const sessionKey = `${req.user.id}:${id}`;
    this.autoSaveService.stopSession(sessionKey);

    return this.projectsService.remove(id, req.user.id, req.user.tenantId);
  }
}
