import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Interfaces para OpenTelemetry (simuladas por enquanto)
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: number;
    fields: Record<string, any>;
  }>;
  status: 'ok' | 'error' | 'timeout';
}

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private activeSpans = new Map<string, Span>();

  use(req: Request, res: Response, next: NextFunction) {
    // Extrair ou gerar trace context
    const traceContext = this.extractOrCreateTraceContext(req);
    
    // Criar span para o request
    const span = this.createSpan(
      `${req.method} ${req.route?.path || req.path}`,
      traceContext,
    );
    
    // Adicionar informações do request ao span
    this.addRequestInfoToSpan(span, req);
    
    // Adicionar trace context ao request para uso posterior
    (req as any).traceContext = traceContext;
    (req as any).span = span;
    
    // Adicionar headers de trace à resposta
    res.setHeader('X-Trace-Id', traceContext.traceId);
    res.setHeader('X-Span-Id', traceContext.spanId);
    
    // Interceptar o fim da resposta
    const originalEnd = res.end;
    res.end = (...args: any[]) => {
      this.finishSpan(span, res.statusCode);
      return originalEnd.apply(res, args);
    };
    
    next();
  }

  private extractOrCreateTraceContext(req: Request): TraceContext {
    // Tentar extrair trace context dos headers
    const traceId = req.headers['x-trace-id'] as string || this.generateTraceId();
    const parentSpanId = req.headers['x-parent-span-id'] as string;
    const spanId = this.generateSpanId();
    
    // Extrair baggage (contexto adicional)
    const baggageHeader = req.headers['x-baggage'] as string;
    let baggage: Record<string, string> = {};
    
    if (baggageHeader) {
      try {
        baggage = JSON.parse(baggageHeader);
      } catch (error) {
        // Ignorar baggage inválido
      }
    }
    
    return {
      traceId,
      spanId,
      parentSpanId,
      baggage,
    };
  }

  private createSpan(operationName: string, traceContext: TraceContext): Span {
    const span: Span = {
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      parentSpanId: traceContext.parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'ok',
    };
    
    this.activeSpans.set(span.spanId, span);
    return span;
  }

  private addRequestInfoToSpan(span: Span, req: Request): void {
    span.tags = {
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
      'http.user_agent': req.get('User-Agent'),
      'http.remote_addr': req.ip,
      'user.id': (req as any).user?.id,
      'tenant.id': (req as any).tenant?.id || req.headers['x-tenant-id'],
      'component': 'http-server',
      'span.kind': 'server',
    };
    
    // Adicionar query parameters (sanitizados)
    if (Object.keys(req.query).length > 0) {
      span.tags['http.query'] = this.sanitizeQuery(req.query);
    }
    
    // Log do início do span
    this.addLogToSpan(span, {
      event: 'request.start',
      method: req.method,
      url: req.url,
    });
  }

  private finishSpan(span: Span, statusCode: number): void {
    span.endTime = Date.now();
    span.tags['http.status_code'] = statusCode;
    
    // Determinar status do span baseado no código HTTP
    if (statusCode >= 500) {
      span.status = 'error';
      span.tags['error'] = true;
    } else if (statusCode >= 400) {
      span.tags['error'] = true;
    }
    
    // Calcular duração
    const duration = span.endTime - span.startTime;
    span.tags['duration_ms'] = duration;
    
    // Log do fim do span
    this.addLogToSpan(span, {
      event: 'request.finish',
      status_code: statusCode,
      duration_ms: duration,
    });
    
    // Enviar span para sistema de tracing (simulado)
    this.exportSpan(span);
    
    // Remover span ativo
    this.activeSpans.delete(span.spanId);
  }

  private addLogToSpan(span: Span, fields: Record<string, any>): void {
    span.logs.push({
      timestamp: Date.now(),
      fields,
    });
  }

  private exportSpan(span: Span): void {
    // TODO: Integrar com sistema real de tracing (Jaeger, Zipkin, etc.)
    // Por enquanto, apenas log estruturado
    
    const spanData = {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operationName: span.operationName,
      startTime: span.startTime,
      endTime: span.endTime,
      duration: span.endTime ? span.endTime - span.startTime : undefined,
      tags: span.tags,
      logs: span.logs,
      status: span.status,
    };
    
    // Log como JSON estruturado
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Span completed: ${span.operationName}`,
      type: 'trace',
      span: spanData,
    }));
  }

  private generateTraceId(): string {
    // Gerar trace ID de 128 bits (32 caracteres hex)
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private generateSpanId(): string {
    // Gerar span ID de 64 bits (16 caracteres hex)
    return randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private sanitizeQuery(query: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(query)) {
      const lowerKey = key.toLowerCase();
      
      // Sanitizar campos sensíveis
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') ||
          lowerKey.includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // Métodos utilitários para uso em outros lugares
  static getCurrentSpan(req: Request): Span | undefined {
    return (req as any).span;
  }

  static getCurrentTraceContext(req: Request): TraceContext | undefined {
    return (req as any).traceContext;
  }

  static addTagToCurrentSpan(req: Request, key: string, value: any): void {
    const span = TracingMiddleware.getCurrentSpan(req);
    if (span) {
      span.tags[key] = value;
    }
  }

  static addLogToCurrentSpan(req: Request, fields: Record<string, any>): void {
    const span = TracingMiddleware.getCurrentSpan(req);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        fields,
      });
    }
  }

  static setSpanError(req: Request, error: Error): void {
    const span = TracingMiddleware.getCurrentSpan(req);
    if (span) {
      span.status = 'error';
      span.tags['error'] = true;
      span.tags['error.name'] = error.name;
      span.tags['error.message'] = error.message;
      
      span.logs.push({
        timestamp: Date.now(),
        fields: {
          event: 'error',
          'error.object': error.name,
          'error.kind': error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
      });
    }
  }
}