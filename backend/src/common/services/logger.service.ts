import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private configService: ConfigService) {}

  private formatMessage(level: string, message: any, context?: string, extra?: any): string {
    const timestamp = new Date().toISOString();
    const logFormat = this.configService.get('logging.format');
    
    if (logFormat === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        context,
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        ...(extra ? { extra } : {}),
      });
    }
    
    // Pretty format para desenvolvimento
    const contextStr = context ? `[${context}] ` : '';
    const extraStr = extra ? ` ${JSON.stringify(extra)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextStr}${message}${extraStr}`;
  }

  log(message: any, context?: string, extra?: any) {
    console.log(this.formatMessage('info', message, context, extra));
  }

  error(message: any, trace?: string, context?: string, extra?: any) {
    console.error(this.formatMessage('error', message, context, extra));
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string, extra?: any) {
    console.warn(this.formatMessage('warn', message, context, extra));
  }

  debug(message: any, context?: string, extra?: any) {
    const logLevel = this.configService.get('logging.level');
    if (logLevel === 'debug') {
      console.debug(this.formatMessage('debug', message, context, extra));
    }
  }

  verbose(message: any, context?: string, extra?: any) {
    const logLevel = this.configService.get('logging.level');
    if (logLevel === 'debug' || logLevel === 'verbose') {
      console.log(this.formatMessage('verbose', message, context, extra));
    }
  }

  // Métodos específicos para auditoria
  logUserAction(userId: string, action: string, details?: any, context?: string) {
    this.log({
      type: 'user_action',
      userId,
      action,
      details,
    }, context);
  }

  logSecurityEvent(event: string, details?: any, context?: string) {
    this.warn({
      type: 'security_event',
      event,
      details,
    }, context);
  }

  logPerformance(operation: string, duration: number, context?: string) {
    this.debug({
      type: 'performance',
      operation,
      duration,
    }, context);
  }

  // Método info que estava sendo usado nos services
  info(message: any, context?: string, extra?: any) {
    this.log(message, context, extra);
  }
}