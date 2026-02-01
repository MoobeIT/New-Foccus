import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  operation?: string;
  traceId?: string;
  spanId?: string;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  context?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  operation?: string;
  traceId?: string;
  spanId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  environment?: string;
  service?: string;
  version?: string;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity' | 'privacy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditEvent {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  tenantId?: string;
  changes?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
}

@Injectable({ scope: Scope.DEFAULT })
export class StructuredLoggerService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<LogContext>();
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private readonly environment: string;
  private readonly logLevel: string;

  constructor(private configService: ConfigService) {
    this.serviceName = this.configService.get('app.name', 'editor-produtos');
    this.serviceVersion = this.configService.get('app.version', '1.0.0');
    this.environment = this.configService.get('app.environment', 'development');
    this.logLevel = this.configService.get('logging.level', 'info');
  }

  // Configurar contexto para uma operação
  runWithContext<T>(context: LogContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  // Obter contexto atual
  getContext(): LogContext {
    return this.asyncLocalStorage.getStore() || {};
  }

  // Atualizar contexto atual
  updateContext(updates: Partial<LogContext>): void {
    const currentContext = this.getContext();
    const newContext = { ...currentContext, ...updates };
    this.asyncLocalStorage.enterWith(newContext);
  }

  // Gerar ID único para request
  generateRequestId(): string {
    return randomUUID();
  }

  // Logs estruturados básicos
  private createLogEntry(
    level: StructuredLogEntry['level'],
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): StructuredLogEntry {
    const currentContext = this.getContext();
    
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.serviceName,
      version: this.serviceVersion,
      environment: this.environment,
      ...currentContext,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private shouldLog(level: StructuredLogEntry['level']): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  private output(entry: StructuredLogEntry): void {
    const logOutput = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(logOutput);
        break;
      case 'warn':
        console.warn(logOutput);
        break;
      case 'debug':
        console.debug(logOutput);
        break;
      case 'verbose':
        console.log(logOutput);
        break;
      default:
        console.log(logOutput);
    }
  }

  // Métodos de logging públicos
  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;
    
    const entry = this.createLogEntry('error', message, context, metadata, error);
    this.output(entry);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, context, metadata);
    this.output(entry);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, context, metadata);
    this.output(entry);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, context, metadata);
    this.output(entry);
  }

  verbose(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog('verbose')) return;
    
    const entry = this.createLogEntry('verbose', message, context, metadata);
    this.output(entry);
  }

  // Logging de performance
  logPerformance(metrics: PerformanceMetrics, context?: string): void {
    const entry = this.createLogEntry('info', `Performance: ${metrics.operation}`, context, {
      type: 'performance',
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
      errorType: metrics.errorType,
      ...metrics.metadata,
    });
    
    entry.tags = ['performance'];
    entry.duration = metrics.duration;
    
    this.output(entry);
  }

  // Logging de segurança
  logSecurityEvent(event: SecurityEvent, context?: string): void {
    const entry = this.createLogEntry('warn', `Security: ${event.description}`, context, {
      type: 'security',
      securityEventType: event.type,
      severity: event.severity,
      ...event.metadata,
    });
    
    entry.tags = ['security', event.type, event.severity];
    
    // Sobrescrever dados do contexto com dados do evento de segurança
    if (event.userId) entry.userId = event.userId;
    if (event.ipAddress) entry.ipAddress = event.ipAddress;
    if (event.userAgent) entry.userAgent = event.userAgent;
    
    this.output(entry);
  }

  // Logging de auditoria
  logAuditEvent(event: AuditEvent, context?: string): void {
    const entry = this.createLogEntry('info', `Audit: ${event.action} on ${event.resource}`, context, {
      type: 'audit',
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      changes: event.changes,
      ...event.metadata,
    });
    
    entry.tags = ['audit', event.action];
    
    // Sobrescrever dados do contexto com dados do evento de auditoria
    if (event.userId) entry.userId = event.userId;
    if (event.tenantId) entry.tenantId = event.tenantId;
    
    this.output(entry);
  }

  // Logging de requests HTTP
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    const entry = this.createLogEntry(
      level,
      `${method} ${url} ${statusCode}`,
      context,
      {
        type: 'http_request',
        ...metadata,
      },
    );
    
    entry.method = method;
    entry.url = url;
    entry.statusCode = statusCode;
    entry.duration = duration;
    entry.tags = ['http', method.toLowerCase()];
    
    this.output(entry);
  }

  // Logging de operações de banco de dados
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry = this.createLogEntry(
      success ? 'debug' : 'error',
      `DB ${operation} on ${table}`,
      context,
      {
        type: 'database',
        operation,
        table,
        success,
        ...metadata,
      },
    );
    
    entry.duration = duration;
    entry.tags = ['database', operation.toLowerCase()];
    
    this.output(entry);
  }

  // Logging de cache
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration?: number,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry = this.createLogEntry('debug', `Cache ${operation}: ${key}`, context, {
      type: 'cache',
      operation,
      key,
      ...metadata,
    });
    
    if (duration !== undefined) {
      entry.duration = duration;
    }
    
    entry.tags = ['cache', operation];
    
    this.output(entry);
  }

  // Logging de jobs/filas
  logJobExecution(
    jobName: string,
    jobId: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
    error?: Error,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const level = status === 'failed' ? 'error' : 'info';
    
    const entry = this.createLogEntry(
      level,
      `Job ${jobName} ${status}`,
      context,
      {
        type: 'job',
        jobName,
        jobId,
        status,
        ...metadata,
      },
      error,
    );
    
    if (duration !== undefined) {
      entry.duration = duration;
    }
    
    entry.tags = ['job', status];
    
    this.output(entry);
  }

  // Logging de eventos de negócio
  logBusinessEvent(
    eventType: string,
    description: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry = this.createLogEntry('info', `Business: ${description}`, context, {
      type: 'business',
      eventType,
      ...metadata,
    });
    
    entry.tags = ['business', eventType];
    
    this.output(entry);
  }

  // Utilitário para medir tempo de execução
  async measureTime<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;
    
    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      this.logPerformance({
        operation,
        duration,
        success,
        errorType: error?.name,
      }, context);
    }
  }

  // Criar logger com contexto fixo
  createContextLogger(context: string, metadata?: Record<string, any>) {
    return {
      error: (message: string, error?: Error, additionalMetadata?: Record<string, any>) =>
        this.error(message, error, context, { ...metadata, ...additionalMetadata }),
      
      warn: (message: string, additionalMetadata?: Record<string, any>) =>
        this.warn(message, context, { ...metadata, ...additionalMetadata }),
      
      info: (message: string, additionalMetadata?: Record<string, any>) =>
        this.info(message, context, { ...metadata, ...additionalMetadata }),
      
      debug: (message: string, additionalMetadata?: Record<string, any>) =>
        this.debug(message, context, { ...metadata, ...additionalMetadata }),
      
      verbose: (message: string, additionalMetadata?: Record<string, any>) =>
        this.verbose(message, context, { ...metadata, ...additionalMetadata }),
    };
  }
}