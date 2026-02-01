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
import { ClientsService, ClientFilters } from '../services/clients.service';
import { CreateClientDto, UpdateClientDto, ClientResponseDto, ClientStatsDto } from '../dto/client.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';

@ApiTags('studio/clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('studio/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso', type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Cliente já existe' })
  async create(
    @Request() req,
    @Body() createClientDto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.create(req.user.id, req.user.tenantId, createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes do fotógrafo' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome, email ou telefone' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'recent', 'projects', 'spent'] })
  @ApiResponse({ status: 200, description: 'Lista de clientes', type: [ClientResponseDto] })
  async findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'name' | 'recent' | 'projects' | 'spent',
  ): Promise<ClientResponseDto[]> {
    const filters: ClientFilters = {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      search,
      sortBy,
    };

    return this.clientsService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas dos clientes' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos clientes', type: ClientStatsDto })
  async getStats(@Request() req): Promise<ClientStatsDto> {
    return this.clientsService.getStats(req.user.id, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ClientResponseDto> {
    return this.clientsService.findOne(id, req.user.id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado', type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, req.user.id, req.user.tenantId, updateClientDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 204, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async remove(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.clientsService.remove(id, req.user.id, req.user.tenantId);
  }
}
