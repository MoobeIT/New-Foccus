import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class SimpleLoggerService implements NestLoggerService {
  
  log(message: any, context?: string) {
    console.log(`[INFO] ${context ? `[${context}] ` : ''}${message}`);
  }

  info(message: any, context?: string, extra?: any) {
    console.log(`[INFO] ${context ? `[${context}] ` : ''}${message}`, extra || '');
  }

  error(message: any, trace?: string, context?: string, extra?: any) {
    console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`, extra || '');
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string, extra?: any) {
    console.warn(`[WARN] ${context ? `[${context}] ` : ''}${message}`, extra || '');
  }

  debug(message: any, context?: string) {
    console.debug(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`);
  }

  verbose(message: any, context?: string) {
    console.log(`[VERBOSE] ${context ? `[${context}] ` : ''}${message}`);
  }

  logSecurityEvent(event: string, data: any, context?: string) {
    console.warn(`[SECURITY] ${context ? `[${context}] ` : ''}${event}`, data);
  }
}