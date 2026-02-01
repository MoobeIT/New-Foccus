import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { PapersService } from '../services/papers.service';
import { CreatePaperDto, UpdatePaperDto, PaperResponseDto } from '../dto/paper.dto';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';

@ApiTags('Papers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(ResponseInterceptor)
@Controller('papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os papéis' })
  @ApiResponse({ status: 200, description: 'Lista de papéis', type: [PaperResponseDto] })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de papel' })
  async findAll(
    @Req() req: any,
    @Query('active') active?: string,
    @Query('type') type?: string,
  ): Promise<{ papers: PaperResponseDto[] }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const filters = {
      active: active !== undefined ? active === 'true' : undefined,
      type,
    };
    
    const papers = await this.papersService.findAll(tenantId, filters);
    return { papers: papers.map(paper => new PaperResponseDto(paper)) };
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar papéis ativos' })
  @ApiResponse({ status: 200, description: 'Lista de papéis ativos', type: [PaperResponseDto] })
  async findActive(@Req() req: any): Promise<{ papers: PaperResponseDto[] }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const papers = await this.papersService.findActive(tenantId);
    return { papers: papers.map(paper => new PaperResponseDto(paper)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar papel por ID' })
  @ApiResponse({ status: 200, description: 'Papel encontrado', type: PaperResponseDto })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async findById(@Param('id') id: string, @Req() req: any): Promise<PaperResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const paper = await this.papersService.findById(id, tenantId);
    return new PaperResponseDto(paper);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo papel' })
  @ApiResponse({ status: 201, description: 'Papel criado', type: PaperResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createPaperDto: CreatePaperDto, @Req() req: any): Promise<PaperResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const paper = await this.papersService.create(tenantId, createPaperDto);
    return new PaperResponseDto(paper);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar papel' })
  @ApiResponse({ status: 200, description: 'Papel atualizado', type: PaperResponseDto })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updatePaperDto: UpdatePaperDto, 
    @Req() req: any
  ): Promise<PaperResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const paper = await this.papersService.update(id, tenantId, updatePaperDto);
    return new PaperResponseDto(paper);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar parcialmente papel' })
  @ApiResponse({ status: 200, description: 'Papel atualizado', type: PaperResponseDto })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async patch(
    @Param('id') id: string, 
    @Body() updatePaperDto: UpdatePaperDto, 
    @Req() req: any
  ): Promise<PaperResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const paper = await this.papersService.update(id, tenantId, updatePaperDto);
    return new PaperResponseDto(paper);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir papel' })
  @ApiResponse({ status: 200, description: 'Papel excluído' })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async delete(@Param('id') id: string, @Req() req: any): Promise<{ message: string }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    await this.papersService.delete(id, tenantId);
    return { message: 'Papel excluído com sucesso' };
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Alternar status ativo/inativo do papel' })
  @ApiResponse({ status: 200, description: 'Status alterado', type: PaperResponseDto })
  async toggleStatus(@Param('id') id: string, @Req() req: any): Promise<PaperResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const paper = await this.papersService.toggleStatus(id, tenantId);
    return new PaperResponseDto(paper);
  }
}
