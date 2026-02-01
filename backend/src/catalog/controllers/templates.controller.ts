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
import { TemplatesService, TemplateFilters } from '../services/templates.service';
import { TemplateValidationService, ValidationResult } from '../services/template-validation.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateEntity } from '../entities/template.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly templateValidationService: TemplateValidationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo template' })
  @ApiResponse({ status: 201, description: 'Template criado com sucesso', type: TemplateEntity })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Request() req,
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<TemplateEntity> {
    return this.templatesService.create(req.user.tenantId, createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar templates' })
  @ApiQuery({ name: 'productType', required: false, description: 'Filtrar por tipo de produto' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome ou descrição' })
  @ApiResponse({ status: 200, description: 'Lista de templates', type: [TemplateEntity] })
  async findAll(
    @Request() req,
    @Query('productType') productType?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<TemplateEntity[]> {
    const filters: TemplateFilters = {
      tenantId: req.user.tenantId,
      productType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    };

    return this.templatesService.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar apenas templates ativos' })
  @ApiResponse({ status: 200, description: 'Lista de templates ativos', type: [TemplateEntity] })
  async findActive(@Request() req): Promise<TemplateEntity[]> {
    return this.templatesService.findAll({ tenantId: req.user.tenantId, isActive: true });
  }

  @Get('product-type/:productType')
  @ApiOperation({ summary: 'Listar templates por tipo de produto' })
  @ApiParam({ name: 'productType', description: 'Tipo do produto' })
  @ApiResponse({ status: 200, description: 'Lista de templates do tipo especificado', type: [TemplateEntity] })
  async findByProductType(
    @Request() req,
    @Param('productType') productType: string,
  ): Promise<TemplateEntity[]> {
    return this.templatesService.findByProductType(req.user.tenantId, productType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar template por ID' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Template encontrado', type: TemplateEntity })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TemplateEntity> {
    return this.templatesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar template' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Template atualizado', type: TemplateEntity })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateEntity> {
    return this.templatesService.update(id, req.user.tenantId, updateTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar template' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @ApiResponse({ status: 204, description: 'Template deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.templatesService.remove(id, req.user.tenantId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar template' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Template ativado', type: TemplateEntity })
  async activate(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TemplateEntity> {
    return this.templatesService.activate(id, req.user.tenantId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativar template' })
  @ApiParam({ name: 'id', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Template desativado', type: TemplateEntity })
  async deactivate(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TemplateEntity> {
    return this.templatesService.deactivate(id, req.user.tenantId);
  }

  @Post('validate-layout')
  @ApiOperation({ summary: 'Validar layout JSON' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  async validateLayout(
    @Body() body: { elements: any[]; productType: string },
  ): Promise<ValidationResult> {
    return this.templateValidationService.validateLayout(
      { type: body.productType, elements: body.elements },
      body.productType,
    );
  }
}
