import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TemplateVersionService, TemplateVersionInfo } from '../services/template-version.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { TemplateEntity } from '../entities/template.entity';

@ApiTags('Template Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('templates/:templateId/versions')
export class TemplateVersionController {
  constructor(private readonly templateVersionService: TemplateVersionService) {}

  @Get()
  @ApiOperation({ summary: 'Obter template' })
  @ApiParam({ name: 'templateId', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Template encontrado' })
  async getTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
  ): Promise<TemplateEntity> {
    return this.templateVersionService.getTemplate(templateId, req.user.tenantId);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicar template' })
  @ApiParam({ name: 'templateId', description: 'ID do template' })
  @ApiResponse({ status: 201, description: 'Template duplicado' })
  async duplicateTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() body: { name?: string },
  ): Promise<TemplateEntity> {
    return this.templateVersionService.duplicateTemplate(
      templateId,
      req.user.tenantId,
      body.name,
    );
  }

  @Post('elements')
  @ApiOperation({ summary: 'Atualizar elementos do template' })
  @ApiParam({ name: 'templateId', description: 'ID do template' })
  @ApiResponse({ status: 200, description: 'Elementos atualizados' })
  async updateElements(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() body: { elements: any[] },
  ): Promise<TemplateEntity> {
    return this.templateVersionService.updateElements(
      templateId,
      req.user.tenantId,
      body.elements,
    );
  }
}
