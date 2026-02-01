import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { CurrentTenant } from './auth/decorators/current-tenant.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check da aplicação' })
  @ApiResponse({ status: 200, description: 'Aplicação funcionando' })
  getHello(): object {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Status detalhado da aplicação' })
  @ApiResponse({ status: 200, description: 'Status dos serviços' })
  getHealth(): object {
    return this.appService.getDetailedHealth();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getProfile(@CurrentUser() user: any, @CurrentTenant() tenantId: string): object {
    return {
      user,
      tenantId,
      message: 'Endpoint protegido - usuário autenticado com sucesso',
    };
  }
}