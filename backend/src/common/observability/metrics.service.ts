import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../services/structured-logger.service';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface CounterMetric extends Metric {
  type: 'counter';
}

export interface GaugeMetric extends Metric {
  type: 'gauge';
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  buckets?: number[];
}

export interface TimerMetric extends Metric {
  type: 'timer';
  duration: number;
}

@Injectable()
export class MetricsService {
  private metrics = new Map<string, Metric>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private timers = new Map<string, { start: number; samples: number[] }>();

  constructor(private logger: StructuredLoggerService) {}

  // Contadores - valores que só aumentam
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + value;
    
    this.counters.set(key, newValue);
    
    const metric: CounterMetric = {
      name,
      value: newValue,
      timestamp: Date.now(),
      tags,
      type: 'counter',
    };
    
    this.recordMetric(metric);
  }

  // Gauges - valores que podem subir ou descer
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    this.gauges.set(key, value);
    
    const metric: GaugeMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge',
    };
    
    this.recordMetric(metric);
  }

  incrementGauge(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    const currentValue = this.gauges.get(key) || 0;
    this.setGauge(name, currentValue + value, tags);
  }

  decrementGauge(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    const currentValue = this.gauges.get(key) || 0;
    this.setGauge(name, currentValue - value, tags);
  }

  // Histogramas - distribuição de valores
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // Manter apenas os últimos 1000 valores para evitar uso excessivo de memória
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
    
    const metric: HistogramMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram',
    };
    
    this.recordMetric(metric);
  }

  // Timers - medição de duração
  startTimer(name: string, tags?: Record<string, string>): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    const key = this.createMetricKey(name, tags);
    
    this.timers.set(timerId, {
      start: Date.now(),
      samples: this.timers.get(key)?.samples || [],
    });
    
    return timerId;
  }

  stopTimer(timerId: string, name: string, tags?: Record<string, string>): number {
    const timer = this.timers.get(timerId);
    if (!timer) {
      this.logger.warn(`Timer ${timerId} not found`, 'MetricsService');
      return 0;
    }
    
    const duration = Date.now() - timer.start;
    const key = this.createMetricKey(name, tags);
    
    // Adicionar amostra ao histórico
    timer.samples.push(duration);
    if (timer.samples.length > 1000) {
      timer.samples.shift();
    }
    
    this.timers.set(key, { start: 0, samples: timer.samples });
    this.timers.delete(timerId);
    
    const metric: TimerMetric = {
      name,
      value: duration,
      timestamp: Date.now(),
      tags,
      type: 'timer',
      duration,
    };
    
    this.recordMetric(metric);
    return duration;
  }

  // Métricas específicas da aplicação
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    const tags = {
      method: method.toLowerCase(),
      path: this.normalizePath(path),
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    };
    
    this.incrementCounter('http_requests_total', 1, tags);
    this.recordHistogram('http_request_duration_ms', duration, tags);
    
    // Métricas de erro
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', 1, tags);
    }
  }

  recordDatabaseOperation(operation: string, table: string, duration: number, success: boolean): void {
    const tags = {
      operation: operation.toLowerCase(),
      table,
      success: success.toString(),
    };
    
    this.incrementCounter('database_operations_total', 1, tags);
    this.recordHistogram('database_operation_duration_ms', duration, tags);
    
    if (!success) {
      this.incrementCounter('database_errors_total', 1, tags);
    }
  }

  recordCacheOperation(operation: string, hit: boolean): void {
    const tags = {
      operation: operation.toLowerCase(),
      result: hit ? 'hit' : 'miss',
    };
    
    this.incrementCounter('cache_operations_total', 1, tags);
    
    if (operation === 'get') {
      this.incrementCounter('cache_requests_total', 1);
      if (hit) {
        this.incrementCounter('cache_hits_total', 1);
      } else {
        this.incrementCounter('cache_misses_total', 1);
      }
    }
  }

  recordJobExecution(jobName: string, duration: number, success: boolean): void {
    const tags = {
      job_name: jobName,
      success: success.toString(),
    };
    
    this.incrementCounter('job_executions_total', 1, tags);
    this.recordHistogram('job_execution_duration_ms', duration, tags);
    
    if (!success) {
      this.incrementCounter('job_failures_total', 1, tags);
    }
  }

  recordBusinessEvent(eventType: string, value: number = 1): void {
    const tags = {
      event_type: eventType,
    };
    
    this.incrementCounter('business_events_total', value, tags);
  }

  // Métricas de sistema
  recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    
    this.setGauge('memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('memory_external_bytes', memUsage.external);
    this.setGauge('memory_rss_bytes', memUsage.rss);
  }

  recordCpuUsage(): void {
    const cpuUsage = process.cpuUsage();
    
    this.setGauge('cpu_user_microseconds', cpuUsage.user);
    this.setGauge('cpu_system_microseconds', cpuUsage.system);
  }

  // Obter estatísticas
  getCounterValue(name: string, tags?: Record<string, string>): number {
    const key = this.createMetricKey(name, tags);
    return this.counters.get(key) || 0;
  }

  getGaugeValue(name: string, tags?: Record<string, string>): number {
    const key = this.createMetricKey(name, tags);
    return this.gauges.get(key) || 0;
  }

  getHistogramStats(name: string, tags?: Record<string, string>): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.createMetricKey(name, tags);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) {
      return null;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((sum, val) => sum + val, 0) / count,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  getTimerStats(name: string, tags?: Record<string, string>): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.createMetricKey(name, tags);
    const timer = this.timers.get(key);
    
    if (!timer || timer.samples.length === 0) {
      return null;
    }
    
    const sorted = [...timer.samples].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((sum, val) => sum + val, 0) / count,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  // Exportar todas as métricas
  exportMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, any>;
    timers: Record<string, any>;
  } {
    const histogramStats: Record<string, any> = {};
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        histogramStats[key] = {
          count: sorted.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,
          p95: this.percentile(sorted, 0.95),
          p99: this.percentile(sorted, 0.99),
        };
      }
    }
    
    const timerStats: Record<string, any> = {};
    for (const [key, timer] of this.timers.entries()) {
      if (timer.samples.length > 0) {
        const sorted = [...timer.samples].sort((a, b) => a - b);
        timerStats[key] = {
          count: sorted.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: sorted.reduce((sum, val) => sum + val, 0) / sorted.length,
          p95: this.percentile(sorted, 0.95),
          p99: this.percentile(sorted, 0.99),
        };
      }
    }
    
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
      timers: timerStats,
    };
  }

  // Métodos privados
  private createMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  private recordMetric(metric: Metric): void {
    // Log da métrica como evento estruturado
    this.logger.info(`Metric recorded: ${metric.name}`, 'MetricsService', {
      type: 'metric',
      metric_name: metric.name,
      metric_type: metric.type,
      metric_value: metric.value,
      metric_tags: metric.tags,
    });
  }

  private normalizePath(path: string): string {
    // Normalizar paths para agrupar métricas similares
    return path
      .replace(/\/\d+/g, '/:id') // Substituir IDs numéricos
      .replace(/\/[0-9a-f-]{36}/g, '/:uuid') // Substituir UUIDs
      .replace(/\/[0-9a-f]{24}/g, '/:objectid'); // Substituir ObjectIds
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = (sortedArray.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}