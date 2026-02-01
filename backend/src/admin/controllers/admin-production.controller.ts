import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminProductionService } from '../services/admin-production.service';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('admin/production')
@ApiBearerAuth()
@Controller('admin/production')
export class AdminProductionController {
  constructor(
    private readonly productionService: AdminProductionService,
    private readonly jwtService: JwtService,
  ) {}

  // ==================== PROJECTS ====================

  @Get('projects')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Get all projects in production' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async getProjects() {
    return this.productionService.getProductionProjects();
  }

  @Post('projects/:id/payment')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Confirm payment for a project' })
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { paymentMethod: string; notes?: string }
  ) {
    return this.productionService.confirmPayment(id, body.paymentMethod, body.notes);
  }

  @Post('projects/:id/start')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Start production for a project' })
  async startProjectProduction(@Param('id') id: string) {
    return this.productionService.startProjectProduction(id);
  }

  @Post('projects/:id/complete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Complete production for a project' })
  async completeProjectProduction(@Param('id') id: string) {
    return this.productionService.completeProjectProduction(id);
  }

  @Public()
  @Get('projects/:id/download')
  @ApiOperation({ summary: 'Download project files for production' })
  async downloadProjectFiles(
    @Param('id') id: string, 
    @Query('token') token: string,
  ) {
    // Validate token from query param
    if (!token) {
      return { success: false, message: 'Token não fornecido' };
    }
    
    try {
      // Verify JWT token - ignoreExpiration para desenvolvimento
      const payload = this.jwtService.verify(token, { ignoreExpiration: true });
      if (!payload || !payload.userId) {
        return { success: false, message: 'Token inválido' };
      }
    } catch (error) {
      console.error('JWT Error:', error.message);
      return { success: false, message: 'Token inválido ou expirado' };
    }
    
    return this.productionService.getProjectFiles(id);
  }

  @Post('projects/:id/ship')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Mark project as shipped and save shipping info' })
  async shipProject(
    @Param('id') id: string,
    @Body() body: { 
      shippingAddress: any; 
      shippingMethod: string; 
      trackingCode: string;
    }
  ) {
    return this.productionService.shipProject(id, body.shippingAddress, body.shippingMethod, body.trackingCode);
  }

  @Post('projects/:id/status')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Manually change production status' })
  async changeProductionStatus(
    @Param('id') id: string,
    @Body() body: { productionStatus: string }
  ) {
    return this.productionService.changeProductionStatus(id, body.productionStatus);
  }

  // ==================== JOBS (Legacy) ====================

  @Get('jobs')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Get production jobs' })
  @ApiResponse({ status: 200, description: 'Production jobs retrieved successfully' })
  async getJobs() {
    return this.productionService.getJobs();
  }

  @Patch('jobs/:id/start')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Start production job' })
  async startJob(@Param('id') id: string) {
    return this.productionService.startJob(id);
  }

  @Patch('jobs/:id/complete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Complete production job' })
  async completeJob(@Param('id') id: string) {
    return this.productionService.completeJob(id);
  }

  @Patch('jobs/:id/priority')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ResponseInterceptor)
  @ApiOperation({ summary: 'Change job priority' })
  async changePriority(@Param('id') id: string, @Body() body: { priority: string }) {
    return this.productionService.changePriority(id, body.priority);
  }
}
