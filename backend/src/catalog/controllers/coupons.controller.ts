import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { CouponsService } from '../services/coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from '../dto/coupon.dto';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os cupons' })
  @ApiResponse({ status: 200, description: 'Lista de cupons' })
  async findAll(@Request() req: any) {
    return this.couponsService.findAll(req.user.tenantId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar cupons ativos' })
  @ApiResponse({ status: 200, description: 'Lista de cupons ativos' })
  async findActive(@Request() req: any) {
    return this.couponsService.findActive(req.user.tenantId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estatísticas dos cupons' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  async getStats(@Request() req: any) {
    return this.couponsService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar cupom por ID' })
  @ApiResponse({ status: 200, description: 'Cupom encontrado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.couponsService.findById(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo cupom' })
  @ApiResponse({ status: 201, description: 'Cupom criado' })
  @ApiResponse({ status: 409, description: 'Código já existe' })
  async create(@Body() dto: CreateCouponDto, @Request() req: any) {
    return this.couponsService.create(req.user.tenantId, dto);
  }

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validar cupom (público)' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  async validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validatePublic(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar cupom' })
  @ApiResponse({ status: 200, description: 'Cupom atualizado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @Request() req: any,
  ) {
    return this.couponsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir cupom' })
  @ApiResponse({ status: 200, description: 'Cupom excluído' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.couponsService.delete(id, req.user.tenantId);
  }
}
