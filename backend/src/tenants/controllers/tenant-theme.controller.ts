import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Post,
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
import { TenantThemeService, ThemeConfig, TenantSettings } from '../services/tenant-theme.service';
import { TenantGuard } from '../guards/tenant.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenantContext } from '../decorators/tenant-context.decorator';

@ApiTags('tenant-theme')
@Controller('tenants/:tenantId/theme')
@UseGuards(TenantGuard)
@ApiBearerAuth()
export class TenantThemeController {
  constructor(private readonly tenantThemeService: TenantThemeService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configurações de tema do tenant' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações de tema' })
  async getThemeConfig(
    @Param('tenantId') tenantId: string,
  ): Promise<ThemeConfig> {
    return this.tenantThemeService.getThemeConfig(tenantId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Atualizar configurações de tema' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tema atualizado com sucesso' })
  async updateThemeConfig(
    @Param('tenantId') tenantId: string,
    @Body() config: Partial<ThemeConfig>,
  ): Promise<ThemeConfig> {
    return this.tenantThemeService.updateThemeConfig(tenantId, config);
  }

  @Post('config/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar tema para padrão' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Tema resetado com sucesso' })
  async resetTheme(
    @Param('tenantId') tenantId: string,
  ): Promise<ThemeConfig> {
    return this.tenantThemeService.resetThemeToDefault(tenantId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Obter configurações gerais do tenant' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações gerais' })
  async getSettings(
    @Param('tenantId') tenantId: string,
  ): Promise<TenantSettings> {
    return this.tenantThemeService.getSettings(tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Atualizar configurações gerais' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações atualizadas com sucesso' })
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() settings: Partial<TenantSettings>,
  ): Promise<TenantSettings> {
    return this.tenantThemeService.updateSettings(tenantId, settings);
  }

  @Post('settings/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar configurações para padrão' })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({ status: 200, description: 'Configurações resetadas com sucesso' })
  async resetSettings(
    @Param('tenantId') tenantId: string,
  ): Promise<TenantSettings> {
    return this.tenantThemeService.resetSettingsToDefault(tenantId);
  }
}