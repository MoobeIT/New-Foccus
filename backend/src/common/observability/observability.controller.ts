import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { TracingService } from './tracing.service';
import { AlertsService, AlertRule } from './alerts.service';
import { DashboardService } from './dashboard.service';
import { PerformanceService } from './performance.service';
import { StructuredLoggerService } from '../services/structured-logger.service';

@ApiTags('observability')
@Controller('observability')
export class ObservabilityController {
  constructor(
    private healthService: HealthService,
    private metricsService: MetricsService,
    private tracingService: TracingService,
    private alertsService: AlertsService,
    private dashboardService: DashboardService,
    private performanceService: PerformanceService,
    private logger: StructuredLoggerService,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health status' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async getHealth() {
    const health = await this.healthService.checkHealth();
    
    // Retornar status HTTP apropriado
    if (health.status === 'unhealthy') {
      throw new Error('Service unhealthy');
    }
    
    return health;
  }

  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    // Verificação básica - o serviço está rodando?
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe - service ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  async getReadiness() {
    const isReady = await this.healthService.isHealthy();
    
    if (!isReady) {
      throw new Error('Service not ready');
    }
    
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prometheus-style metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  async getMetrics() {
    const metrics = this.metricsService.exportMetrics();
    
    // Converter para formato Prometheus
    const prometheusMetrics = this.convertToPrometheusFormat(metrics);
    
    return {
      timestamp: new Date().toISOString(),
      metrics: prometheusMetrics,
      raw: metrics,
    };
  }

  @Get('metrics/json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Metrics in JSON format' })
  @ApiResponse({ status: 200, description: 'Metrics in JSON format' })
  async getMetricsJson() {
    const metrics = this.metricsService.exportMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      service: 'editor-produtos',
      metrics,
    };
  }

  @Get('traces/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tracing statistics' })
  @ApiResponse({ status: 200, description: 'Tracing statistics' })
  async getTracingStats() {
    const stats = this.tracingService.getTracingStats();
    
    return {
      timestamp: new Date().toISOString(),
      tracing: stats,
    };
  }

  @Get('traces/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Active traces' })
  @ApiResponse({ status: 200, description: 'List of active traces' })
  async getActiveTraces() {
    const activeSpans = this.tracingService.getActiveSpans();
    
    return {
      timestamp: new Date().toISOString(),
      active_spans: activeSpans.length,
      spans: activeSpans.map(span => ({
        trace_id: span.traceId,
        span_id: span.spanId,
        operation_name: span.operationName,
        start_time: span.startTime,
        duration_ms: Date.now() - span.startTime,
        tags: span.tags,
      })),
    };
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Service information' })
  @ApiResponse({ status: 200, description: 'Service information' })
  async getServiceInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      service: {
        name: 'editor-produtos',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      runtime: {
        uptime: process.uptime(),
        pid: process.pid,
        memory: {
          heap_used: memUsage.heapUsed,
          heap_total: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('logs/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test logging functionality' })
  @ApiResponse({ status: 200, description: 'Log test completed' })
  async testLogging() {
    const testId = `test_${Date.now()}`;
    
    // Testar diferentes níveis de log
    this.logger.info('Testing info log', 'ObservabilityController', { test_id: testId });
    this.logger.warn('Testing warn log', 'ObservabilityController', { test_id: testId });
    this.logger.debug('Testing debug log', 'ObservabilityController', { test_id: testId });
    this.logger.error('Testing error log', new Error('Test error'), 'ObservabilityController', { test_id: testId });
    
    // Testar logs especializados
    this.logger.logPerformance({
      operation: 'test_operation',
      duration: 123,
      success: true,
    }, 'ObservabilityController');
    
    this.logger.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'low',
      description: 'Test security event',
    }, 'ObservabilityController');
    
    this.logger.logAuditEvent({
      action: 'test_action',
      resource: 'test_resource',
      resourceId: testId,
    }, 'ObservabilityController');
    
    this.logger.logBusinessEvent('test_event', 'Test business event', 'ObservabilityController', {
      test_id: testId,
    });
    
    return {
      message: 'Log test completed',
      test_id: testId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dashboard completo de monitoramento' })
  @ApiResponse({ status: 200, description: 'Dados do dashboard' })
  async getDashboard() {
    const dashboardData = await this.dashboardService.getDashboardData();
    
    return {
      timestamp: new Date().toISOString(),
      data: dashboardData,
    };
  }

  @Get('dashboard/widgets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar widgets do dashboard' })
  @ApiResponse({ status: 200, description: 'Lista de widgets' })
  async getDashboardWidgets() {
    const widgets = this.dashboardService.getWidgets();
    
    return {
      timestamp: new Date().toISOString(),
      widgets,
    };
  }

  @Get('dashboard/chart/:metric')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter dados de gráfico para métrica' })
  @ApiParam({ name: 'metric', description: 'Nome da métrica' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['1h', '6h', '24h', '7d'] })
  async getChartData(
    @Param('metric') metric: string,
    @Query('timeRange') timeRange: '1h' | '6h' | '24h' | '7d' = '1h',
  ) {
    const chartData = this.dashboardService.getChartData(metric, timeRange);
    
    return {
      timestamp: new Date().toISOString(),
      chart: chartData,
    };
  }

  @Get('dashboard/top/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter top métricas por tipo' })
  @ApiParam({ name: 'type', enum: ['errors', 'latency', 'throughput'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopMetrics(
    @Param('type') type: 'errors' | 'latency' | 'throughput',
    @Query('limit') limit: number = 10,
  ) {
    const topMetrics = this.dashboardService.getTopMetrics(type, limit);
    
    return {
      timestamp: new Date().toISOString(),
      type,
      metrics: topMetrics,
    };
  }

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar alertas ativos' })
  @ApiResponse({ status: 200, description: 'Lista de alertas ativos' })
  async getActiveAlerts() {
    const alerts = this.alertsService.getActiveAlerts();
    
    return {
      timestamp: new Date().toISOString(),
      alerts,
    };
  }

  @Get('alerts/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estatísticas de alertas' })
  @ApiResponse({ status: 200, description: 'Estatísticas de alertas' })
  async getAlertStats() {
    const stats = this.alertsService.getAlertStats();
    
    return {
      timestamp: new Date().toISOString(),
      stats,
    };
  }

  @Get('alerts/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Histórico de alertas' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Histórico de alertas' })
  async getAlertHistory(@Query('limit') limit: number = 100) {
    const history = this.alertsService.getAlertHistory(limit);
    
    return {
      timestamp: new Date().toISOString(),
      history,
    };
  }

  @Get('alerts/rules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar regras de alerta' })
  @ApiResponse({ status: 200, description: 'Lista de regras de alerta' })
  async getAlertRules() {
    const rules = this.alertsService.getAlertRules();
    
    return {
      timestamp: new Date().toISOString(),
      rules,
    };
  }

  @Post('alerts/rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar regra de alerta' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        metric: { type: 'string' },
        condition: { type: 'string', enum: ['greater_than', 'less_than', 'equals', 'not_equals'] },
        threshold: { type: 'number' },
        duration: { type: 'number' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        enabled: { type: 'boolean' },
        actions: { type: 'array' },
      },
      required: ['name', 'description', 'metric', 'condition', 'threshold', 'duration', 'severity'],
    }
  })
  @ApiResponse({ status: 201, description: 'Regra de alerta criada' })
  async createAlertRule(@Body() ruleData: Omit<AlertRule, 'id'>) {
    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      enabled: true,
      actions: [],
      ...ruleData,
    };
    
    this.alertsService.registerAlertRule(rule);
    
    return {
      message: 'Alert rule created successfully',
      rule,
    };
  }

  @Put('alerts/rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar regra de alerta' })
  @ApiParam({ name: 'ruleId', description: 'ID da regra' })
  @ApiResponse({ status: 200, description: 'Regra atualizada' })
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: Partial<AlertRule>,
  ) {
    this.alertsService.updateAlertRule(ruleId, updates);
    
    return {
      message: 'Alert rule updated successfully',
      ruleId,
    };
  }

  @Delete('alerts/rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover regra de alerta' })
  @ApiParam({ name: 'ruleId', description: 'ID da regra' })
  @ApiResponse({ status: 200, description: 'Regra removida' })
  async deleteAlertRule(@Param('ruleId') ruleId: string) {
    this.alertsService.unregisterAlertRule(ruleId);
    
    return {
      message: 'Alert rule deleted successfully',
      ruleId,
    };
  }

  @Post('alerts/:alertId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver alerta manualmente' })
  @ApiParam({ name: 'alertId', description: 'ID do alerta' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Alerta resolvido' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { reason?: string },
  ) {
    this.alertsService.resolveAlert(alertId, body.reason);
    
    return {
      message: 'Alert resolved successfully',
      alertId,
      reason: body.reason,
    };
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Relatório de performance atual' })
  @ApiResponse({ status: 200, description: 'Relatório de performance' })
  async getPerformanceReport() {
    const report = await this.performanceService.generatePerformanceReport();
    
    return {
      timestamp: new Date().toISOString(),
      report,
    };
  }

  @Get('performance/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Histórico de performance' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Histórico de performance' })
  async getPerformanceHistory(@Query('hours') hours: number = 24) {
    const history = this.performanceService.getPerformanceHistory(hours);
    
    return {
      timestamp: new Date().toISOString(),
      hours,
      history,
    };
  }

  @Get('performance/trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tendências de performance' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tendências de performance' })
  async getPerformanceTrends(@Query('hours') hours: number = 24) {
    const trends = this.performanceService.getPerformanceTrends(hours);
    
    return {
      timestamp: new Date().toISOString(),
      hours,
      trends,
    };
  }

  @Get('performance/thresholds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Status dos thresholds de performance' })
  @ApiResponse({ status: 200, description: 'Status dos thresholds' })
  async getPerformanceThresholds() {
    const thresholds = this.performanceService.checkThresholds();
    
    return {
      timestamp: new Date().toISOString(),
      thresholds,
    };
  }

  // Converter métricas para formato Prometheus
  private convertToPrometheusFormat(metrics: any): string {
    const lines: string[] = [];
    
    // Contadores
    for (const [name, value] of Object.entries(metrics.counters)) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }
    
    // Gauges
    for (const [name, value] of Object.entries(metrics.gauges)) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }
    
    // Histogramas
    for (const [name, stats] of Object.entries(metrics.histograms)) {
      const histStats = stats as any;
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count ${histStats.count}`);
      lines.push(`${name}_sum ${histStats.avg * histStats.count}`);
      lines.push(`${name}_bucket{le="0.1"} ${histStats.count}`); // Simplificado
      lines.push(`${name}_bucket{le="+Inf"} ${histStats.count}`);
    }
    
    // Timers (como histogramas)
    for (const [name, stats] of Object.entries(metrics.timers)) {
      const timerStats = stats as any;
      lines.push(`# TYPE ${name}_duration_seconds histogram`);
      lines.push(`${name}_duration_seconds_count ${timerStats.count}`);
      lines.push(`${name}_duration_seconds_sum ${(timerStats.avg * timerStats.count) / 1000}`);
    }
    
    return lines.join('\n');
  }
}