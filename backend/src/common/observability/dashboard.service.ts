import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';
import { AlertsService } from './alerts.service';
import { TracingService } from './tracing.service';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'status' | 'list' | 'gauge';
  size: 'small' | 'medium' | 'large';
  config: Record<string, any>;
  data?: any;
}

export interface DashboardData {
  timestamp: number;
  overview: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    version: string;
    environment: string;
  };
  metrics: {
    http: {
      requests_per_minute: number;
      error_rate: number;
      avg_response_time: number;
      p95_response_time: number;
    };
    system: {
      memory_usage_percent: number;
      cpu_usage_percent: number;
      heap_used_mb: number;
      heap_total_mb: number;
    };
    business: {
      active_users: number;
      orders_per_hour: number;
      revenue_per_hour: number;
      conversion_rate: number;
    };
  };
  alerts: {
    active_count: number;
    critical_count: number;
    recent: Array<{
      id: string;
      severity: string;
      message: string;
      timestamp: number;
    }>;
  };
  services: {
    database: { status: string; response_time: number };
    redis: { status: string; response_time: number };
    external_apis: { status: string; response_time: number };
  };
  performance: {
    slowest_endpoints: Array<{
      path: string;
      avg_duration: number;
      request_count: number;
    }>;
    error_endpoints: Array<{
      path: string;
      error_count: number;
      error_rate: number;
    }>;
  };
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  series: Array<{
    name: string;
    data: TimeSeriesData[];
    color?: string;
  }>;
  xAxis?: {
    type: 'datetime' | 'category';
    categories?: string[];
  };
  yAxis?: {
    title: string;
    min?: number;
    max?: number;
  };
}

@Injectable()
export class DashboardService {
  private widgets = new Map<string, DashboardWidget>();
  private metricsHistory = new Map<string, TimeSeriesData[]>();
  private readonly maxHistoryPoints = 1440; // 24 horas com pontos de 1 minuto

  constructor(
    private configService: ConfigService,
    private logger: StructuredLoggerService,
    private metricsService: MetricsService,
    private healthService: HealthService,
    private alertsService: AlertsService,
    private tracingService: TracingService,
  ) {
    this.initializeDefaultWidgets();
    this.startMetricsCollection();
  }

  // Obter dados completos do dashboard
  async getDashboardData(): Promise<DashboardData> {
    const [health, alertStats, tracingStats] = await Promise.all([
      this.healthService.checkHealth(),
      this.alertsService.getAlertStats(),
      this.tracingService.getTracingStats(),
    ]);

    const metrics = this.metricsService.exportMetrics();
    const memUsage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      overview: {
        status: health.status,
        uptime: health.uptime,
        version: this.configService.get('app.version', '1.0.0'),
        environment: this.configService.get('app.environment', 'development'),
      },
      metrics: {
        http: {
          requests_per_minute: this.calculateRate('http_requests_total', 60),
          error_rate: this.calculateErrorRate(),
          avg_response_time: this.getAverageResponseTime(),
          p95_response_time: this.getP95ResponseTime(),
        },
        system: {
          memory_usage_percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
          cpu_usage_percent: this.getCpuUsage(),
          heap_used_mb: memUsage.heapUsed / 1024 / 1024,
          heap_total_mb: memUsage.heapTotal / 1024 / 1024,
        },
        business: {
          active_users: this.metricsService.getGaugeValue('active_users_total') || 0,
          orders_per_hour: this.calculateRate('orders_created_total', 3600),
          revenue_per_hour: this.calculateRevenueRate(),
          conversion_rate: this.calculateConversionRate(),
        },
      },
      alerts: {
        active_count: alertStats.active,
        critical_count: alertStats.bySeverity.critical,
        recent: this.alertsService.getActiveAlerts()
          .slice(0, 5)
          .map(alert => ({
            id: alert.id,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp,
          })),
      },
      services: {
        database: this.getServiceStatus('database', health),
        redis: this.getServiceStatus('redis', health),
        external_apis: this.getServiceStatus('external_services', health),
      },
      performance: {
        slowest_endpoints: this.getSlowestEndpoints(),
        error_endpoints: this.getErrorEndpoints(),
      },
    };
  }

  // Obter dados de gráfico para métrica específica
  getChartData(metricName: string, timeRange: '1h' | '6h' | '24h' | '7d' = '1h'): ChartData {
    const history = this.metricsHistory.get(metricName) || [];
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    const filteredData = history.filter(point => point.timestamp >= cutoff);

    return {
      title: this.formatMetricTitle(metricName),
      type: 'line',
      series: [{
        name: metricName,
        data: filteredData,
        color: this.getMetricColor(metricName),
      }],
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: this.getMetricUnit(metricName),
      },
    };
  }

  // Obter múltiplas métricas em um gráfico
  getMultiMetricChart(metricNames: string[], timeRange: '1h' | '6h' | '24h' | '7d' = '1h'): ChartData {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    const series = metricNames.map(metricName => {
      const history = this.metricsHistory.get(metricName) || [];
      const filteredData = history.filter(point => point.timestamp >= cutoff);

      return {
        name: this.formatMetricTitle(metricName),
        data: filteredData,
        color: this.getMetricColor(metricName),
      };
    });

    return {
      title: 'Multiple Metrics',
      type: 'line',
      series,
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: 'Value',
      },
    };
  }

  // Obter top N métricas
  getTopMetrics(type: 'errors' | 'latency' | 'throughput', limit: number = 10): Array<{
    name: string;
    value: number;
    change: number;
  }> {
    const metrics = this.metricsService.exportMetrics();
    const results: Array<{ name: string; value: number; change: number }> = [];

    switch (type) {
      case 'errors':
        for (const [name, value] of Object.entries(metrics.counters)) {
          if (name.includes('error') || name.includes('fail')) {
            results.push({
              name,
              value: value as number,
              change: this.calculateMetricChange(name),
            });
          }
        }
        break;

      case 'latency':
        for (const [name, stats] of Object.entries(metrics.histograms)) {
          if (name.includes('duration') || name.includes('latency')) {
            results.push({
              name,
              value: (stats as any).p95 || 0,
              change: this.calculateMetricChange(name),
            });
          }
        }
        break;

      case 'throughput':
        for (const [name, value] of Object.entries(metrics.counters)) {
          if (name.includes('total') && !name.includes('error')) {
            results.push({
              name,
              value: value as number,
              change: this.calculateMetricChange(name),
            });
          }
        }
        break;
    }

    return results
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  // Registrar widget customizado
  registerWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    this.logger.info(`Dashboard widget registered: ${widget.title}`, 'DashboardService');
  }

  // Obter todos os widgets
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  // Obter widget específico
  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  // Atualizar dados do widget
  async updateWidgetData(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      return;
    }

    try {
      switch (widget.type) {
        case 'metric':
          widget.data = await this.getMetricWidgetData(widget);
          break;
        case 'chart':
          widget.data = await this.getChartWidgetData(widget);
          break;
        case 'status':
          widget.data = await this.getStatusWidgetData(widget);
          break;
        case 'list':
          widget.data = await this.getListWidgetData(widget);
          break;
        case 'gauge':
          widget.data = await this.getGaugeWidgetData(widget);
          break;
      }
    } catch (error) {
      this.logger.error(`Error updating widget data: ${widgetId}`, error, 'DashboardService');
    }
  }

  // Métodos privados
  private calculateRate(metricName: string, windowSeconds: number): number {
    const history = this.metricsHistory.get(metricName) || [];
    if (history.length < 2) return 0;

    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const recentPoints = history.filter(p => p.timestamp >= windowStart);

    if (recentPoints.length < 2) return 0;

    const latest = recentPoints[recentPoints.length - 1];
    const earliest = recentPoints[0];
    const timeDiff = (latest.timestamp - earliest.timestamp) / 1000;
    const valueDiff = latest.value - earliest.value;

    return timeDiff > 0 ? (valueDiff / timeDiff) * windowSeconds : 0;
  }

  private calculateErrorRate(): number {
    const totalRequests = this.metricsService.getCounterValue('http_requests_total');
    const errorRequests = this.metricsService.getCounterValue('http_errors_total');
    
    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }

  private getAverageResponseTime(): number {
    const stats = this.metricsService.getHistogramStats('http_request_duration_ms');
    return stats?.avg || 0;
  }

  private getP95ResponseTime(): number {
    const stats = this.metricsService.getHistogramStats('http_request_duration_ms');
    return stats?.p95 || 0;
  }

  private getCpuUsage(): number {
    // Simulado - em produção, usar biblioteca específica
    return Math.random() * 100;
  }

  private calculateRevenueRate(): number {
    // Simulado - calcular baseado em métricas de pedidos e valores
    const ordersRate = this.calculateRate('orders_created_total', 3600);
    const avgOrderValue = 89.90; // Valor médio simulado
    return ordersRate * avgOrderValue;
  }

  private calculateConversionRate(): number {
    const visitors = this.metricsService.getCounterValue('page_views_total');
    const orders = this.metricsService.getCounterValue('orders_created_total');
    
    return visitors > 0 ? (orders / visitors) * 100 : 0;
  }

  private getServiceStatus(serviceName: string, health: any): { status: string; response_time: number } {
    const check = health.checks.find((c: any) => c.name === serviceName);
    return {
      status: check?.status || 'unknown',
      response_time: check?.duration || 0,
    };
  }

  private getSlowestEndpoints(): Array<{ path: string; avg_duration: number; request_count: number }> {
    // Simulado - em produção, analisar métricas por endpoint
    return [
      { path: '/api/render/pdf', avg_duration: 2500, request_count: 150 },
      { path: '/api/assets/upload', avg_duration: 1800, request_count: 300 },
      { path: '/api/projects/save', avg_duration: 1200, request_count: 500 },
    ];
  }

  private getErrorEndpoints(): Array<{ path: string; error_count: number; error_rate: number }> {
    // Simulado - em produção, analisar métricas de erro por endpoint
    return [
      { path: '/api/payments/process', error_count: 12, error_rate: 2.5 },
      { path: '/api/external/shipping', error_count: 8, error_rate: 1.8 },
      { path: '/api/render/preview', error_count: 5, error_rate: 0.9 },
    ];
  }

  private calculateMetricChange(metricName: string): number {
    const history = this.metricsHistory.get(metricName) || [];
    if (history.length < 2) return 0;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    if (previous.value === 0) return 0;
    
    return ((latest.value - previous.value) / previous.value) * 100;
  }

  private formatMetricTitle(metricName: string): string {
    return metricName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private getMetricColor(metricName: string): string {
    const colors = {
      error: '#ff4444',
      success: '#44ff44',
      warning: '#ffaa44',
      info: '#4444ff',
      default: '#888888',
    };

    if (metricName.includes('error') || metricName.includes('fail')) return colors.error;
    if (metricName.includes('success') || metricName.includes('complete')) return colors.success;
    if (metricName.includes('warn') || metricName.includes('slow')) return colors.warning;
    
    return colors.default;
  }

  private getMetricUnit(metricName: string): string {
    if (metricName.includes('duration') || metricName.includes('latency')) return 'ms';
    if (metricName.includes('percent') || metricName.includes('rate')) return '%';
    if (metricName.includes('bytes')) return 'bytes';
    if (metricName.includes('total') || metricName.includes('count')) return 'count';
    
    return 'value';
  }

  // Métodos para dados de widgets
  private async getMetricWidgetData(widget: DashboardWidget): Promise<any> {
    const metricName = widget.config.metric;
    const value = this.metricsService.getCounterValue(metricName) || 
                  this.metricsService.getGaugeValue(metricName);
    
    return {
      value,
      change: this.calculateMetricChange(metricName),
      unit: this.getMetricUnit(metricName),
    };
  }

  private async getChartWidgetData(widget: DashboardWidget): Promise<any> {
    const metricName = widget.config.metric;
    const timeRange = widget.config.timeRange || '1h';
    
    return this.getChartData(metricName, timeRange);
  }

  private async getStatusWidgetData(widget: DashboardWidget): Promise<any> {
    const health = await this.healthService.checkHealth();
    
    return {
      status: health.status,
      checks: health.checks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message,
      })),
    };
  }

  private async getListWidgetData(widget: DashboardWidget): Promise<any> {
    const type = widget.config.type;
    const limit = widget.config.limit || 5;
    
    switch (type) {
      case 'alerts':
        return this.alertsService.getActiveAlerts().slice(0, limit);
      case 'errors':
        return this.getTopMetrics('errors', limit);
      case 'slow_endpoints':
        return this.getSlowestEndpoints().slice(0, limit);
      default:
        return [];
    }
  }

  private async getGaugeWidgetData(widget: DashboardWidget): Promise<any> {
    const metricName = widget.config.metric;
    const value = this.metricsService.getGaugeValue(metricName);
    const max = widget.config.max || 100;
    
    return {
      value,
      max,
      percentage: (value / max) * 100,
      thresholds: widget.config.thresholds || {
        warning: 70,
        critical: 90,
      },
    };
  }

  // Inicializar widgets padrão
  private initializeDefaultWidgets(): void {
    // Widget de status geral
    this.registerWidget({
      id: 'system_status',
      title: 'System Status',
      type: 'status',
      size: 'medium',
      config: {},
    });

    // Widget de requests HTTP
    this.registerWidget({
      id: 'http_requests',
      title: 'HTTP Requests/min',
      type: 'metric',
      size: 'small',
      config: {
        metric: 'http_requests_total',
      },
    });

    // Widget de uso de memória
    this.registerWidget({
      id: 'memory_usage',
      title: 'Memory Usage',
      type: 'gauge',
      size: 'small',
      config: {
        metric: 'memory_heap_used_bytes',
        max: 1024 * 1024 * 1024, // 1GB
        thresholds: {
          warning: 70,
          critical: 90,
        },
      },
    });

    // Widget de alertas ativos
    this.registerWidget({
      id: 'active_alerts',
      title: 'Active Alerts',
      type: 'list',
      size: 'medium',
      config: {
        type: 'alerts',
        limit: 5,
      },
    });

    // Gráfico de latência
    this.registerWidget({
      id: 'response_time_chart',
      title: 'Response Time',
      type: 'chart',
      size: 'large',
      config: {
        metric: 'http_request_duration_ms',
        timeRange: '1h',
      },
    });
  }

  // Coletar métricas periodicamente
  private startMetricsCollection(): void {
    const interval = 60000; // 1 minuto
    
    setInterval(() => {
      this.collectMetricsSnapshot();
    }, interval);

    this.logger.info('Metrics collection started', 'DashboardService', {
      interval_ms: interval,
    });
  }

  private collectMetricsSnapshot(): void {
    const timestamp = Date.now();
    const metrics = this.metricsService.exportMetrics();

    // Coletar contadores
    for (const [name, value] of Object.entries(metrics.counters)) {
      this.addMetricPoint(name, timestamp, value as number);
    }

    // Coletar gauges
    for (const [name, value] of Object.entries(metrics.gauges)) {
      this.addMetricPoint(name, timestamp, value as number);
    }

    // Coletar estatísticas de histogramas
    for (const [name, stats] of Object.entries(metrics.histograms)) {
      const histStats = stats as any;
      this.addMetricPoint(`${name}_avg`, timestamp, histStats.avg || 0);
      this.addMetricPoint(`${name}_p95`, timestamp, histStats.p95 || 0);
      this.addMetricPoint(`${name}_p99`, timestamp, histStats.p99 || 0);
    }

    // Métricas de sistema
    const memUsage = process.memoryUsage();
    this.addMetricPoint('memory_heap_used_bytes', timestamp, memUsage.heapUsed);
    this.addMetricPoint('memory_heap_total_bytes', timestamp, memUsage.heapTotal);
    this.addMetricPoint('memory_usage_percent', timestamp, (memUsage.heapUsed / memUsage.heapTotal) * 100);
    this.addMetricPoint('uptime_seconds', timestamp, process.uptime());
  }

  private addMetricPoint(metricName: string, timestamp: number, value: number): void {
    if (!this.metricsHistory.has(metricName)) {
      this.metricsHistory.set(metricName, []);
    }

    const history = this.metricsHistory.get(metricName)!;
    history.push({ timestamp, value });

    // Limitar histórico
    if (history.length > this.maxHistoryPoints) {
      history.shift();
    }
  }
}