import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantDataIsolationService, DataIsolationConfig } from '../services/tenant-data-isolation.service';
import { TenantAccessGuard, TenantRoles } from '../guards/tenant-access.guard';
import { TenantId } from '../decorators/current-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('tenant-isolation')
@ApiBearerAuth()
@Controller('tenants/isolation')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class TenantIsolationController {
  constructor(
    private tenantDataIsolationService: TenantDataIsolationService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configurações de isolamento de dados' })
  @TenantRoles('admin', 'owner')
  async getIsolationConfig(@TenantId() tenantId: string): Promise<DataIsolationConfig> {
    return this.tenantDataIsolationService.getIsolationConfig(tenantId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Atualizar configurações de isolamento de dados' })
  @TenantRoles('admin', 'owner')
  async updateIsolationConfig(
    @TenantId() tenantId: string,
    @Body() config: Partial<DataIsolationConfig>,
  ): Promise<DataIsolationConfig> {
    return this.tenantDataIsolationService.updateIsolationConfig(tenantId, config);
  }

  @Post('validate-access')
  @ApiOperation({ summary: 'Validar acesso a dados específicos' })
  @HttpCode(HttpStatus.OK)
  @TenantRoles('admin', 'owner')
  async validateDataAccess(
    @TenantId() tenantId: string,
    @Body() validation: {
      modelName: string;
      operation: 'read' | 'write' | 'delete';
      data: any;
    },
  ): Promise<{ isValid: boolean }> {
    const isValid = await this.tenantDataIsolationService.validateDataAccess(
      tenantId,
      validation.modelName,
      validation.operation,
      validation.data,
    );

    return { isValid };
  }

  @Post('export-data')
  @ApiOperation({ summary: 'Exportar todos os dados do tenant' })
  @HttpCode(HttpStatus.OK)
  @TenantRoles('admin', 'owner')
  async exportTenantData(@TenantId() tenantId: string): Promise<any> {
    return this.tenantDataIsolationService.exportTenantData(tenantId);
  }

  @Delete('cleanup-data')
  @ApiOperation({ summary: 'Limpar todos os dados do tenant (CUIDADO!)' })
  @HttpCode(HttpStatus.OK)
  @TenantRoles('owner')
  async cleanupTenantData(@TenantId() tenantId: string): Promise<{ message: string }> {
    await this.tenantDataIsolationService.cleanupTenantData(tenantId);
    return { message: 'Dados do tenant limpos com sucesso' };
  }
}
