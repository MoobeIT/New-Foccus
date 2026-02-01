import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { CoverTypesService } from '../services/cover-types.service';
import { CreateCoverTypeDto, UpdateCoverTypeDto, CoverTypeResponseDto } from '../dto/cover-type.dto';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';

@ApiTags('Cover Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(ResponseInterceptor)
@Controller('cover-types')
export class CoverTypesController {
  constructor(private readonly coverTypesService: CoverTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os tipos de capa' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de capa', type: [CoverTypeResponseDto] })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de capa' })
  async findAll(
    @Req() req: any,
    @Query('active') active?: string,
    @Query('type') type?: string,
  ): Promise<{ coverTypes: CoverTypeResponseDto[] }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const filters = {
      active: active !== undefined ? active === 'true' : undefined,
      type,
    };
    
    const coverTypes = await this.coverTypesService.findAll(tenantId, filters);
    return { coverTypes: coverTypes.map(coverType => new CoverTypeResponseDto(coverType)) };
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar tipos de capa ativos' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de capa ativos', type: [CoverTypeResponseDto] })
  async findActive(@Req() req: any): Promise<{ coverTypes: CoverTypeResponseDto[] }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverTypes = await this.coverTypesService.findActive(tenantId);
    return { coverTypes: coverTypes.map(coverType => new CoverTypeResponseDto(coverType)) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tipo de capa por ID' })
  @ApiResponse({ status: 200, description: 'Tipo de capa encontrado', type: CoverTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Tipo de capa não encontrado' })
  async findById(@Param('id') id: string, @Req() req: any): Promise<CoverTypeResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverType = await this.coverTypesService.findById(id, tenantId);
    return new CoverTypeResponseDto(coverType);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo tipo de capa' })
  @ApiResponse({ status: 201, description: 'Tipo de capa criado', type: CoverTypeResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createCoverTypeDto: CreateCoverTypeDto, @Req() req: any): Promise<CoverTypeResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverType = await this.coverTypesService.create(tenantId, createCoverTypeDto);
    return new CoverTypeResponseDto(coverType);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tipo de capa' })
  @ApiResponse({ status: 200, description: 'Tipo de capa atualizado', type: CoverTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Tipo de capa não encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updateCoverTypeDto: UpdateCoverTypeDto, 
    @Req() req: any
  ): Promise<CoverTypeResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverType = await this.coverTypesService.update(id, tenantId, updateCoverTypeDto);
    return new CoverTypeResponseDto(coverType);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar parcialmente tipo de capa' })
  @ApiResponse({ status: 200, description: 'Tipo de capa atualizado', type: CoverTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Tipo de capa não encontrado' })
  async patch(
    @Param('id') id: string, 
    @Body() updateCoverTypeDto: UpdateCoverTypeDto, 
    @Req() req: any
  ): Promise<CoverTypeResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverType = await this.coverTypesService.update(id, tenantId, updateCoverTypeDto);
    return new CoverTypeResponseDto(coverType);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir tipo de capa' })
  @ApiResponse({ status: 200, description: 'Tipo de capa excluído' })
  @ApiResponse({ status: 404, description: 'Tipo de capa não encontrado' })
  async delete(@Param('id') id: string, @Req() req: any): Promise<{ message: string }> {
    const tenantId = req.user?.tenantId || req.tenantId;
    await this.coverTypesService.delete(id, tenantId);
    return { message: 'Tipo de capa excluído com sucesso' };
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Alternar status ativo/inativo do tipo de capa' })
  @ApiResponse({ status: 200, description: 'Status alterado', type: CoverTypeResponseDto })
  async toggleStatus(@Param('id') id: string, @Req() req: any): Promise<CoverTypeResponseDto> {
    const tenantId = req.user?.tenantId || req.tenantId;
    const coverType = await this.coverTypesService.toggleStatus(id, tenantId);
    return new CoverTypeResponseDto(coverType);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obter estatísticas do tipo de capa' })
  @ApiResponse({ status: 200, description: 'Estatísticas do tipo de capa' })
  async getStats(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.coverTypesService.getUsageStats(id, tenantId);
  }
}
