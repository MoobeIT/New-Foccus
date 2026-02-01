import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Req, 
  UseInterceptors,
  HttpStatus,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { FormatsService } from '../services/formats.service';
import { CreateFormatDto, UpdateFormatDto } from '../dto/format.dto';

@ApiTags('Formats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(ResponseInterceptor, LoggingInterceptor)
@Controller('formats')
export class FormatsController {
  constructor(private readonly formatsService: FormatsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os formatos' })
  @ApiResponse({ status: 200, description: 'Lista de formatos retornada com sucesso' })
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.findAll(tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar formatos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de formatos ativos retornada com sucesso' })
  async findActive(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.findActive(tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas dos formatos' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos formatos retornadas com sucesso' })
  async getStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.getStats(tenantId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Listar formatos por produto' })
  @ApiResponse({ status: 200, description: 'Lista de formatos do produto retornada com sucesso' })
  async findByProduct(@Param('productId') productId: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.findByProduct(productId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar formato por ID' })
  @ApiResponse({ status: 200, description: 'Formato encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  async findById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.findById(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo formato' })
  @ApiResponse({ status: 201, description: 'Formato criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Formato já existe' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createFormatDto: CreateFormatDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.create(tenantId, createFormatDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar formato completamente' })
  @ApiResponse({ status: 200, description: 'Formato atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  @ApiResponse({ status: 409, description: 'Conflito de dados' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(@Param('id') id: string, @Body() updateFormatDto: UpdateFormatDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.update(id, tenantId, updateFormatDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar formato parcialmente' })
  @ApiResponse({ status: 200, description: 'Formato atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: true }))
  async patch(@Param('id') id: string, @Body() updateFormatDto: Partial<UpdateFormatDto>, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.update(id, tenantId, updateFormatDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir formato' })
  @ApiResponse({ status: 200, description: 'Formato excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  @ApiResponse({ status: 409, description: 'Formato está sendo usado e não pode ser excluído' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    await this.formatsService.delete(id, tenantId);
    return { message: 'Formato excluído com sucesso' };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar formato' })
  @ApiResponse({ status: 200, description: 'Formato ativado com sucesso' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  async activate(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.activate(id, tenantId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativar formato' })
  @ApiResponse({ status: 200, description: 'Formato desativado com sucesso' })
  @ApiResponse({ status: 404, description: 'Formato não encontrado' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.deactivate(id, tenantId);
  }
}
