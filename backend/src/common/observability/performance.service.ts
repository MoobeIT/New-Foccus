import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { MetricsService } from './metrics.service';

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceReport {
  timestamp: number;
  overall_score: number; // 0-100
  categories: {
    availability: {
      score: number;
      metrics: {
        uptime_percent: number;
        error_rate: number;
        health_status: number;
      };
    };
    performance: {
      score: number;
      metrics: {
        avg_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
      };
    };
    reliability: {
      score: number;
      metrics: {
        success_rate: number;
        timeout_rate: number;
        retry_rate: number;
      };
    };
    scalability: {
      score: number;
      metrics: {
        throughput: number;
        concurrent_users: number;
        resource_utilization: number;
      };
    };
  };
  sla_compliance: {
    availability_sla: { target: number; actual: number; met: boolean };
    performance_sla: { target: number; actual: number; met: boolean };
    error_rate_sla: { target: number; actual: number; met: boolean };
  };
  recommendations: string[];
}

export interface SLATarget {
  name: string;
  metric: string;
  target: number;
  operator: 'less_than' | 'greater_than' | 'equals';
  unit: string;
  description: string;
}

@Injectable()
export class PerformanceService {
  private thresholds: PerformanceThreshold[] = [];
  private slaTargets: SLATarget[] = [];
  private performanceHistory: PerformanceReport[] = [];

  constructor(
    private configService: ConfigService,
    private logger: StructuredLoggerService,
    private metricsService: MetricsService,
  ) {
    this.initializeThresholds();
    this.initializeSLATargets();
    this.startPerformanceMonitoring();
  }

  // Gerar relatório de performance
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const timestamp = Date.now();
    
    // Coletar métricas
    const availability = await this.calculateAvailabilityScore();
    const performance = await this.calculatePerformanceScore();
    const reliability = await this.calculateReliabilityScore();
    const scalability = await this.calculateScalabilityScore();
    
    // Calcular score geral (média ponderada)
    const overallScore = Math.round(
      (availability.score * 0.3) +
      (performance.score * 0.3) +
      (reliability.score * 0.25) +
      (scalability.score * 0.15)
    );

    // Verificar SLA compliance
    const slaCompliance = await this.checkSLACompliance();
    
    // Gerar recomendações
    const recommendations = this.generateRecommendations({
      availability,
      performance,
      reliability,
      scalability,
    });

    const report: PerformanceReport = {
      timestamp,
      overall_score: overallScore,
      categories: {
        availability,
        performance,
        reliability,
        scalability,
      },
      sla_compliance: slaCompliance,
      recommendations,
    };

    // Salvar no histórico
    this.performanceHistory.push(report);
    if (this.performanceHistory.length > 288) { // 24 horas com reports de 5 min
      this.performanceHistory.shift();
    }

    this.logger.info('Performance report generated', 'PerformanceService', {
      overall_score: overallScore,
      availability_score: availability.score,
      performance_score: performance.score,
      reliability_score: reliability.score,
      scalability_score: scalability.score,
    });

    return report;
  }

  // Obter histórico de performance
  getPerformanceHistory(hours: number = 24): PerformanceReport[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(report => report.timestamp >= cutoff);
  }

  // Obter tendências de performance
  getPerformanceTrends(hours: number = 24): {
    overall_score: { current: number; trend: number };
    availability: { current: number; trend: number };
    performance: { current: number; trend: number };
    reliability: { current: number; trend: number };
    scalability: { current: number; trend: number };
  } {
    const history = this.getPerformanceHistory(hours);
    if (history.length < 2) {
      return {
        overall_score: { current: 0, trend: 0 },
        availability: { current: 0, trend: 0 },
        performance: { current: 0, trend: 0 },
        reliability: { current: 0, trend: 0 },
        scalability: { current: 0, trend: 0 },
      };
    }

    const latest = history[history.length - 1];
    const previous = history[Math.max(0, history.length - Math.min(12, history.length))]; // 1 hora atrás

    return {
      overall_score: {
        current: latest.overall_score,
        trend: latest.overall_score - previous.overall_score,
      },
      availability: {
        current: latest.categories.availability.score,
        trend: latest.categories.availability.score - previous.categories.availability.score,
      },
      performance: {
        current: latest.categories.performance.score,
        trend: latest.categories.performance.score - previous.categories.performance.score,
      },
      reliability: {
        current: latest.categories.reliability.score,
        trend: latest.categories.reliability.score - previous.categories.reliability.score,
      },
      scalability: {
        current: latest.categories.scalability.score,
        trend: latest.categories.scalability.score - previous.categories.scalability.score,
      },
    };
  }

  // Verificar se métricas estão dentro dos thresholds
  checkThresholds(): Array<{
    metric: string;
    current_value: number;
    threshold_warning: number;
    threshold_critical: number;
    status: 'ok' | 'warning' | 'critical';
    unit: string;
  }> {
    const results = [];

    for (const threshold of this.thresholds) {
      const currentValue = this.getCurrentMetricValue(threshold.metric);
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      
      if (currentValue >= threshold.critical) {
        status = 'critical';
      } else if (currentValue >= threshold.warning) {
        status = 'warning';
      }

      results.push({
        metric: threshold.metric,
        current_value: currentValue,
        threshold_warning: threshold.warning,
        threshold_critical: threshold.critical,
        status,
        unit: threshold.unit,
      });
    }

    return results;
  }

  // Métodos privados
  private async calculateAvailabilityScore(): Promise<{
    score: number;
    metrics: {
      uptime_percent: number;
      error_rate: number;
      health_status: number;
    };
  }> {
    const uptimePercent = this.calculateUptimePercent();
    const errorRate = this.calculateErrorRate();
    const healthStatus = await this.getHealthScore();

    // Score baseado em thresholds
    let score = 100;
    
    if (uptimePercent < 99.9) score -= 30;
    else if (uptimePercent < 99.95) score -= 15;
    
    if (errorRate > 5) score -= 25;
    else if (errorRate > 1) score -= 10;
    
    if (healthStatus < 1) score -= 20;

    return {
      score: Math.max(0, score),
      metrics: {
        uptime_percent: uptimePercent,
        error_rate: errorRate,
        health_status: healthStatus,
      },
    };
  }

  private async calculatePerformanceScore(): Promise<{
    score: number;
    metrics: {
      avg_response_time: number;
      p95_response_time: number;
      p99_response_time: number;
    };
  }> {
    const stats = this.metricsService.getHistogramStats('http_request_duration_ms');
    const avgResponseTime = stats?.avg || 0;
    const p95ResponseTime = stats?.p95 || 0;
    const p99ResponseTime = stats?.p99 || 0;

    // Score baseado em thresholds de latência
    let score = 100;
    
    if (avgResponseTime > 1000) score -= 30;
    else if (avgResponseTime > 500) score -= 15;
    
    if (p95ResponseTime > 2000) score -= 25;
    else if (p95ResponseTime > 1000) score -= 10;
    
    if (p99ResponseTime > 5000) score -= 20;
    else if (p99ResponseTime > 2000) score -= 10;

    return {
      score: Math.max(0, score),
      metrics: {
        avg_response_time: avgResponseTime,
        p95_response_time: p95ResponseTime,
        p99_response_time: p99ResponseTime,
      },
    };
  }

  private async calculateReliabilityScore(): Promise<{
    score: number;
    metrics: {
      success_rate: number;
      timeout_rate: number;
      retry_rate: number;
    };
  }> {
    const successRate = this.calculateSuccessRate();
    const timeoutRate = this.calculateTimeoutRate();
    const retryRate = this.calculateRetryRate();

    let score = 100;
    
    if (successRate < 95) score -= 40;
    else if (successRate < 99) score -= 20;
    
    if (timeoutRate > 5) score -= 25;
    else if (timeoutRate > 1) score -= 10;
    
    if (retryRate > 10) score -= 15;
    else if (retryRate > 5) score -= 5;

    return {
      score: Math.max(0, score),
      metrics: {
        success_rate: successRate,
        timeout_rate: timeoutRate,
        retry_rate: retryRate,
      },
    };
  }

  private async calculateScalabilityScore(): Promise<{
    score: number;
    metrics: {
      throughput: number;
      concurrent_users: number;
      resource_utilization: number;
    };
  }> {
    const throughput = this.calculateThroughput();
    const concurrentUsers = this.metricsService.getGaugeValue('active_users_total') || 0;
    const resourceUtilization = this.calculateResourceUtilization();

    let score = 100;
    
    // Score baseado na utilização de recursos
    if (resourceUtilization > 90) score -= 30;
    else if (resourceUtilization > 80) score -= 15;
    
    // Penalizar se throughput está muito baixo para o número de usuários
    const expectedThroughput = concurrentUsers * 0.1; // 0.1 req/s por usuário
    if (throughput < expectedThroughput * 0.5) score -= 20;

    return {
      score: Math.max(0, score),
      metrics: {
        throughput,
        concurrent_users: concurrentUsers,
        resource_utilization: resourceUtilization,
      },
    };
  }

  private async checkSLACompliance(): Promise<{
    availability_sla: { target: number; actual: number; met: boolean };
    performance_sla: { target: number; actual: number; met: boolean };
    error_rate_sla: { target: number; actual: number; met: boolean };
  }> {
    const uptimePercent = this.calculateUptimePercent();
    const p95ResponseTime = this.metricsService.getHistogramStats('http_request_duration_ms')?.p95 || 0;
    const errorRate = this.calculateErrorRate();

    return {
      availability_sla: {
        target: 99.9,
        actual: uptimePercent,
        met: uptimePercent >= 99.9,
      },
      performance_sla: {
        target: 1000, // 1 segundo p95
        actual: p95ResponseTime,
        met: p95ResponseTime <= 1000,
      },
      error_rate_sla: {
        target: 1, // 1% máximo
        actual: errorRate,
        met: errorRate <= 1,
      },
    };
  }

  private generateRecommendations(categories: any): string[] {
    const recommendations: string[] = [];

    if (categories.availability.score < 80) {
      recommendations.push('Investigate frequent service outages and implement better error handling');
    }

    if (categories.performance.score < 80) {
      recommendations.push('Optimize slow endpoints and consider implementing caching');
    }

    if (categories.reliability.score < 80) {
      recommendations.push('Improve error handling and implement circuit breakers');
    }

    if (categories.scalability.score < 80) {
      recommendations.push('Consider horizontal scaling and resource optimization');
    }

    const memoryUsage = this.calculateResourceUtilization();
    if (memoryUsage > 85) {
      recommendations.push('Memory usage is high - consider increasing memory or optimizing memory usage');
    }

    const errorRate = this.calculateErrorRate();
    if (errorRate > 2) {
      recommendations.push('Error rate is elevated - investigate and fix common error patterns');
    }

    return recommendations;
  }

  // Métodos utilitários
  private calculateUptimePercent(): number {
    // Simulado - em produção, calcular baseado em histórico de health checks
    return 99.95;
  }

  private calculateErrorRate(): number {
    const totalRequests = this.metricsService.getCounterValue('http_requests_total');
    const errorRequests = this.metricsService.getCounterValue('http_errors_total');
    
    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }

  private async getHealthScore(): Promise<number> {
    // 1 = healthy, 0.5 = degraded, 0 = unhealthy
    try {
      // TODO: Integrar com HealthService quando disponível
      // const health = await this.healthService.checkHealth();
      // return health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0;
      return 1; // Assumir saudável por enquanto
    } catch {
      return 0;
    }
  }

  private calculateSuccessRate(): number {
    return 100 - this.calculateErrorRate();
  }

  private calculateTimeoutRate(): number {
    // Simulado - em produção, rastrear timeouts específicos
    return Math.random() * 2;
  }

  private calculateRetryRate(): number {
    // Simulado - em produção, rastrear retries
    return Math.random() * 5;
  }

  private calculateThroughput(): number {
    // Requests por segundo
    const totalRequests = this.metricsService.getCounterValue('http_requests_total');
    const uptime = process.uptime();
    
    return uptime > 0 ? totalRequests / uptime : 0;
  }

  private calculateResourceUtilization(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private getCurrentMetricValue(metricName: string): number {
    // Tentar diferentes tipos de métricas
    let value = this.metricsService.getCounterValue(metricName);
    if (value === 0) {
      value = this.metricsService.getGaugeValue(metricName);
    }
    if (value === 0) {
      const stats = this.metricsService.getHistogramStats(metricName);
      value = stats?.avg || 0;
    }
    
    return value;
  }

  private initializeThresholds(): void {
    this.thresholds = [
      {
        metric: 'http_request_duration_ms',
        warning: 1000,
        critical: 2000,
        unit: 'ms',
      },
      {
        metric: 'memory_usage_percent',
        warning: 80,
        critical: 90,
        unit: '%',
      },
      {
        metric: 'error_rate',
        warning: 1,
        critical: 5,
        unit: '%',
      },
      {
        metric: 'database_operation_duration_ms',
        warning: 500,
        critical: 1000,
        unit: 'ms',
      },
    ];
  }

  private initializeSLATargets(): void {
    this.slaTargets = [
      {
        name: 'Availability SLA',
        metric: 'uptime_percent',
        target: 99.9,
        operator: 'greater_than',
        unit: '%',
        description: 'Service must be available 99.9% of the time',
      },
      {
        name: 'Performance SLA',
        metric: 'http_request_duration_ms_p95',
        target: 1000,
        operator: 'less_than',
        unit: 'ms',
        description: '95% of requests must complete within 1 second',
      },
      {
        name: 'Error Rate SLA',
        metric: 'error_rate',
        target: 1,
        operator: 'less_than',
        unit: '%',
        description: 'Error rate must be less than 1%',
      },
    ];
  }

  private startPerformanceMonitoring(): void {
    // Gerar relatório a cada 5 minutos
    setInterval(() => {
      this.generatePerformanceReport().catch(error => {
        this.logger.error('Error generating performance report', error, 'PerformanceService');
      });
    }, 5 * 60 * 1000);

    this.logger.info('Performance monitoring started', 'PerformanceService');
  }
}