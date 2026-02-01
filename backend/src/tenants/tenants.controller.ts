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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantEntity } from './entities/tenant.entity';
import { TenantGuard } from './guards/tenant.guard';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo tenant' })
  @ApiResponse({ status: 201, description: 'Tenant criado com sucesso', type: TenantEntity })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Slug já existe' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os tenants' })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar por status ativo' })
  @ApiResponse({ status: 200, description: 'Lista de tenants', type: [TenantEntity] })
  async findAll(@Query('active') active?: string): Promise<TenantEntity[]> {
    const activeFilter = active !== undefined ? active === 'true' : undefined;
    return this.tenantsService.findAll(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tenant por ID' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tenant encontrado', type: TenantEntity })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async findOne(@Param('id') id: string): Promise<TenantEntity> {
    return this.tenantsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar tenant por slug' })
  @ApiParam({ name: 'slug', description: 'Slug do tenant' })
  @ApiResponse({ status: 200, description: 'Tenant encontrado', type: TenantEntity })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<TenantEntity> {
    return this.tenantsService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tenant' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tenant atualizado', type: TenantEntity })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantEntity> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar tenant' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 204, description: 'Tenant deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar tenant' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tenant ativado', type: TenantEntity })
  async activate(@Param('id') id: string): Promise<TenantEntity> {
    return this.tenantsService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativar tenant' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tenant desativado', type: TenantEntity })
  async deactivate(@Param('id') id: string): Promise<TenantEntity> {
    return this.tenantsService.deactivate(id);
  }

  @Get(':id/config')
  @ApiOperation({ summary: 'Obter configurações do tenant' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações do tenant' })
  async getConfig(@Param('id') id: string): Promise<{ themeConfig: any; settings: any }> {
    return this.tenantsService.getTenantConfig(id);
  }

  @Patch(':id/theme')
  @ApiOperation({ summary: 'Atualizar configurações de tema' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tema atualizado', type: TenantEntity })
  async updateTheme(
    @Param('id') id: string,
    @Body() themeConfig: Record<string, any>,
  ): Promise<TenantEntity> {
    return this.tenantsService.updateThemeConfig(id, themeConfig);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Atualizar configurações gerais' })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações atualizadas', type: TenantEntity })
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: Record<string, any>,
  ): Promise<TenantEntity> {
    return this.tenantsService.updateSettings(id, settings);
  }
}