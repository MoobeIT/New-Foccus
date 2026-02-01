import { Controller, Get, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenants/guards/tenant.guard';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { PapersService } from '../services/papers.service';
import { CoverTypesService } from '../services/cover-types.service';
import { FormatsService } from '../services/formats.service';
import { ProductsService } from '../services/products.service';

@ApiTags('Catalog Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(ResponseInterceptor)
@Controller('catalog/stats')
export class CatalogStatsController {
  constructor(
    private readonly papersService: PapersService,
    private readonly coverTypesService: CoverTypesService,
    private readonly formatsService: FormatsService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obter estatísticas gerais do catálogo' })
  @ApiResponse({ status: 200, description: 'Estatísticas do catálogo' })
  async getCatalogStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;

    const [papersStats, coverTypesStats, formatsStats, productsStats] = await Promise.all([
      this.papersService.getStats(tenantId),
      this.coverTypesService.getStats(tenantId),
      this.formatsService.getStats(tenantId),
      this.productsService.getStats(tenantId),
    ]);

    return {
      papers: papersStats,
      coverTypes: coverTypesStats,
      formats: formatsStats,
      products: productsStats,
      summary: {
        totalItems: papersStats.total + coverTypesStats.total + formatsStats.total + productsStats.total,
        activeItems: papersStats.active + coverTypesStats.active + formatsStats.active + productsStats.active,
      },
    };
  }

  @Get('papers')
  @ApiOperation({ summary: 'Obter estatísticas detalhadas dos papéis' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos papéis' })
  async getPapersStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.papersService.getStats(tenantId);
  }

  @Get('cover-types')
  @ApiOperation({ summary: 'Obter estatísticas detalhadas dos tipos de capa' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos tipos de capa' })
  async getCoverTypesStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.coverTypesService.getStats(tenantId);
  }

  @Get('formats')
  @ApiOperation({ summary: 'Obter estatísticas detalhadas dos formatos' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos formatos' })
  async getFormatsStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.formatsService.getStats(tenantId);
  }

  @Get('products')
  @ApiOperation({ summary: 'Obter estatísticas detalhadas dos produtos' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos produtos' })
  async getProductsStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    return this.productsService.getStats(tenantId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar saúde do catálogo' })
  @ApiResponse({ status: 200, description: 'Status de saúde do catálogo' })
  async getCatalogHealth(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;

    // Verificar problemas comuns
    const issues = [];

    // Produtos sem formatos
    const productsWithoutFormats = await this.productsService.findProductsWithoutFormats(tenantId);
    if (productsWithoutFormats.length > 0) {
      issues.push({
        type: 'warning',
        message: `${productsWithoutFormats.length} produto(s) sem formatos configurados`,
        items: productsWithoutFormats.map(p => p.name),
      });
    }

    // Produtos sem papéis
    const productsWithoutPapers = await this.productsService.findProductsWithoutPapers(tenantId);
    if (productsWithoutPapers.length > 0) {
      issues.push({
        type: 'warning',
        message: `${productsWithoutPapers.length} produto(s) sem papéis configurados`,
        items: productsWithoutPapers.map(p => p.name),
      });
    }

    // Produtos sem tipos de capa
    const productsWithoutCoverTypes = await this.productsService.findProductsWithoutCoverTypes(tenantId);
    if (productsWithoutCoverTypes.length > 0) {
      issues.push({
        type: 'warning',
        message: `${productsWithoutCoverTypes.length} produto(s) sem tipos de capa configurados`,
        items: productsWithoutCoverTypes.map(p => p.name),
      });
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues,
      lastCheck: new Date().toISOString(),
    };
  }
}