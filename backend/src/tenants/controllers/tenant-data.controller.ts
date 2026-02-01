import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { TenantDataService, TenantDataStats, TenantQuotas } from '../services/tenant-data.service';
import { TenantGuard } from '../guards/tenant.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('tenant-data')
@Controller('tenants/:tenantId/data')
@UseGuards(TenantGuard)
@ApiBearerAuth()
export class TenantDataController {
  constructor(private readonly tenantDataService: TenantDataService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de uso do tenant' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Estatísticas do tenant' })
  async getStats(
    @Param('tenantId') tenantId: string,
  ): Promise<TenantDataStats> {
    return this.tenantDataService.getTenantStats(tenantId);
  }

  @Get('quotas')
  @ApiOperation({ summary: 'Obter cotas do tenant' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Cotas do tenant' })
  async getQuotas(
    @Param('tenantId') tenantId: string,
  ): Promise<TenantQuotas> {
    return this.tenantDataService.getTenantQuotas(tenantId);
  }

  @Get('quota-check')
  @ApiOperation({ summary: 'Verificar se tenant está dentro das cotas' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Status das cotas' })
  async checkQuotas(
    @Param('tenantId') tenantId: string,
  ): Promise<{
    withinLimits: boolean;
    violations: string[];
    stats: TenantDataStats;
    quotas: TenantQuotas;
  }> {
    return this.tenantDataService.checkTenantQuotas(tenantId);
  }

  @Post('migrate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Migrar dados para outro tenant (Super Admin apenas)' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant de origem' })
  @ApiResponse({ status: 200, description: 'Migração realizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async migrateData(
    @Param('tenantId') sourceTenantId: string,
    @Body('targetTenantId') targetTenantId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; message: string }> {
    await this.tenantDataService.migrateTenantData(
      sourceTenantId,
      targetTenantId,
      user.id,
    );

    return {
      success: true,
      message: 'Dados migrados com sucesso',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar todos os dados do tenant (Super Admin apenas)' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 204, description: 'Dados deletados com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async deleteData(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.tenantDataService.deleteTenantData(tenantId, user.id);
  }
}