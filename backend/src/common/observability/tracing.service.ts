import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  sampled: boolean;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: SpanStatus;
  baggage?: Record<string, string>;
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export type SpanStatus = 'ok' | 'error' | 'timeout' | 'cancelled';

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  maxSpansPerTrace: number;
  exportInterval: number;
  serviceName: string;
  serviceVersion: string;
}

@Injectable()
export class TracingService {
  private config: TracingConfig;
  private activeSpans = new Map<string, SpanContext>();
  private completedSpans: SpanContext[] = [];
  private exportTimer?: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private logger: StructuredLoggerService,
  ) {
    this.config = {
      enabled: this.configService.get('tracing.enabled', true),
      samplingRate: this.configService.get('tracing.samplingRate', 0.1), // 10% por padrão
      maxSpansPerTrace: this.configService.get('tracing.maxSpansPerTrace', 1000),
      exportInterval: this.configService.get('tracing.exportInterval', 30000), // 30 segundos
      serviceName: this.configService.get('app.name', 'editor-produtos'),
      serviceVersion: this.configService.get('app.version', '1.0.0'),
    };

    if (this.config.enabled) {
      this.startExportTimer();
    }
  }

  // Criar um novo trace
  createTrace(operationName: string, parentContext?: TraceContext): TraceContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const sampled = parentContext?.sampled ?? this.shouldSample();

    return {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      baggage: parentContext?.baggage || {},
      sampled,
    };
  }

  // Iniciar um span
  startSpan(operationName: string, traceContext?: TraceContext): SpanContext {
    if (!this.config.enabled) {
      return this.createNoOpSpan(operationName);
    }

    const context = traceContext || this.createTrace(operationName);
    
    if (!context.sampled) {
      return this.createNoOpSpan(operationName);
    }

    const span: SpanContext = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'span.kind': 'internal',
      },
      logs: [],
      status: 'ok',
      baggage: context.baggage,
    };

    this.activeSpans.set(span.spanId, span);

    this.logger.debug(`Span started: ${operationName}`, 'TracingService', {
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId,
      operation: operationName,
    });

    return span;
  }

  // Finalizar um span
  finishSpan(span: SpanContext, status: SpanStatus = 'ok'): void {
    if (!this.config.enabled || !span.spanId) {
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    // Adicionar log de finalização
    this.addLogToSpan(span, {
      event: 'span.finish',
      status,
      duration_ms: span.duration,
    });

    // Mover para spans completos
    this.activeSpans.delete(span.spanId);
    this.completedSpans.push(span);

    // Limitar número de spans para evitar uso excessivo de memória
    if (this.completedSpans.length > this.config.maxSpansPerTrace) {
      this.completedSpans.shift();
    }

    this.logger.debug(`Span finished: ${span.operationName}`, 'TracingService', {
      trace_id: span.traceId,
      span_id: span.spanId,
      duration_ms: span.duration,
      status,
    });
  }

  // Adicionar tag a um span
  addTagToSpan(span: SpanContext, key: string, value: any): void {
    if (span.spanId) {
      span.tags[key] = value;
    }
  }

  // Adicionar múltiplas tags a um span
  addTagsToSpan(span: SpanContext, tags: Record<string, any>): void {
    if (span.spanId) {
      Object.assign(span.tags, tags);
    }
  }

  // Adicionar log a um span
  addLogToSpan(span: SpanContext, fields: Record<string, any>): void {
    if (span.spanId) {
      span.logs.push({
        timestamp: Date.now(),
        fields,
      });
    }
  }

  // Marcar span como erro
  setSpanError(span: SpanContext, error: Error): void {
    if (span.spanId) {
      span.status = 'error';
      span.tags['error'] = true;
      span.tags['error.name'] = error.name;
      span.tags['error.message'] = error.message;

      this.addLogToSpan(span, {
        event: 'error',
        'error.object': error.name,
        'error.kind': error.constructor.name,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  // Criar span filho
  createChildSpan(parentSpan: SpanContext, operationName: string): SpanContext {
    const childContext: TraceContext = {
      traceId: parentSpan.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parentSpan.spanId,
      baggage: parentSpan.baggage,
      sampled: true, // Herda do pai
    };

    return this.startSpan(operationName, childContext);
  }

  // Executar função com span automático
  async withSpan<T>(
    operationName: string,
    fn: (span: SpanContext) => Promise<T>,
    parentSpan?: SpanContext,
  ): Promise<T> {
    const span = parentSpan 
      ? this.createChildSpan(parentSpan, operationName)
      : this.startSpan(operationName);

    try {
      const result = await fn(span);
      this.finishSpan(span, 'ok');
      return result;
    } catch (error) {
      this.setSpanError(span, error as Error);
      this.finishSpan(span, 'error');
      throw error;
    }
  }

  // Instrumentar função automaticamente
  instrument<T extends (...args: any[]) => any>(
    operationName: string,
    fn: T,
    parentSpan?: SpanContext,
  ): T {
    return ((...args: any[]) => {
      const span = parentSpan 
        ? this.createChildSpan(parentSpan, operationName)
        : this.startSpan(operationName);

      try {
        const result = fn(...args);

        // Se for Promise, aguardar conclusão
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              this.finishSpan(span, 'ok');
              return value;
            })
            .catch((error: Error) => {
              this.setSpanError(span, error);
              this.finishSpan(span, 'error');
              throw error;
            });
        }

        // Se não for Promise, finalizar imediatamente
        this.finishSpan(span, 'ok');
        return result;
      } catch (error) {
        this.setSpanError(span, error as Error);
        this.finishSpan(span, 'error');
        throw error;
      }
    }) as T;
  }

  // Obter estatísticas de tracing
  getTracingStats(): {
    activeSpans: number;
    completedSpans: number;
    samplingRate: number;
    enabled: boolean;
  } {
    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      samplingRate: this.config.samplingRate,
      enabled: this.config.enabled,
    };
  }

  // Exportar spans completos
  exportSpans(): SpanContext[] {
    const spans = [...this.completedSpans];
    this.completedSpans.length = 0; // Limpar array
    return spans;
  }

  // Obter spans ativos
  getActiveSpans(): SpanContext[] {
    return Array.from(this.activeSpans.values());
  }

  // Configurar baggage (contexto propagado)
  setBaggage(span: SpanContext, key: string, value: string): void {
    if (span.spanId) {
      if (!span.baggage) {
        span.baggage = {};
      }
      span.baggage[key] = value;
    }
  }

  // Obter baggage
  getBaggage(span: SpanContext, key: string): string | undefined {
    return span.baggage?.[key];
  }

  // Métodos privados
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private generateTraceId(): string {
    // Gerar trace ID de 128 bits (32 caracteres hex)
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private generateSpanId(): string {
    // Gerar span ID de 64 bits (16 caracteres hex)
    return randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private createNoOpSpan(operationName: string): SpanContext {
    return {
      traceId: '',
      spanId: '',
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'ok',
    };
  }

  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      this.exportCompletedSpans();
    }, this.config.exportInterval);
  }

  private exportCompletedSpans(): void {
    if (this.completedSpans.length === 0) {
      return;
    }

    const spans = this.exportSpans();
    
    // TODO: Enviar para sistema de tracing real (Jaeger, Zipkin, etc.)
    // Por enquanto, apenas log estruturado
    
    for (const span of spans) {
      this.logger.info(`Trace span exported: ${span.operationName}`, 'TracingService', {
        type: 'trace_export',
        trace_id: span.traceId,
        span_id: span.spanId,
        parent_span_id: span.parentSpanId,
        operation_name: span.operationName,
        start_time: span.startTime,
        end_time: span.endTime,
        duration_ms: span.duration,
        status: span.status,
        tags: span.tags,
        logs: span.logs,
      });
    }

    this.logger.debug(`Exported ${spans.length} trace spans`, 'TracingService');
  }

  // Cleanup ao destruir o serviço
  onModuleDestroy(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }
    
    // Exportar spans restantes
    this.exportCompletedSpans();
  }
}