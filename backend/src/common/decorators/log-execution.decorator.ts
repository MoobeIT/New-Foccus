import { StructuredLoggerService } from '../services/structured-logger.service';

export interface LogExecutionOptions {
  level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  context?: string;
  logArgs?: boolean;
  logResult?: boolean;
  logDuration?: boolean;
  sanitizeArgs?: (args: any[]) => any[];
  sanitizeResult?: (result: any) => any;
  skipIf?: (args: any[]) => boolean;
}

/**
 * Decorator para logging automático de execução de métodos
 */
export function LogExecution(options: LogExecutionOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyName;
    
    const {
      level = 'debug',
      context = className,
      logArgs = false,
      logResult = false,
      logDuration = true,
      sanitizeArgs,
      sanitizeResult,
      skipIf,
    } = options;

    descriptor.value = async function (...args: any[]) {
      // Verificar se deve pular o logging
      if (skipIf && skipIf(args)) {
        return method.apply(this, args);
      }

      // Obter logger (assumindo que está disponível na instância)
      const logger: StructuredLoggerService = (this as any).logger || 
        (this as any).structuredLogger ||
        new StructuredLoggerService((this as any).configService);

      const startTime = Date.now();
      const operationName = `${className}.${methodName}`;
      
      // Preparar argumentos para log
      let loggedArgs = args;
      if (sanitizeArgs) {
        loggedArgs = sanitizeArgs(args);
      } else if (logArgs) {
        loggedArgs = sanitizeDefaultArgs(args);
      }

      // Log de início
      const startMetadata: any = {
        operation: operationName,
        method: methodName,
        class: className,
      };
      
      if (logArgs) {
        startMetadata.arguments = loggedArgs;
      }

      logger[level](`Executing ${operationName}`, context, startMetadata);

      try {
        // Executar método original
        const result = await method.apply(this, args);
        
        // Calcular duração
        const duration = Date.now() - startTime;
        
        // Preparar resultado para log
        let loggedResult = result;
        if (sanitizeResult) {
          loggedResult = sanitizeResult(result);
        } else if (logResult) {
          loggedResult = sanitizeDefaultResult(result);
        }

        // Log de sucesso
        const successMetadata: any = {
          operation: operationName,
          success: true,
        };
        
        if (logDuration) {
          successMetadata.duration = duration;
        }
        
        if (logResult) {
          successMetadata.result = loggedResult;
        }

        logger[level](`Completed ${operationName}`, context, successMetadata);
        
        // Log de performance se duração for significativa
        if (logDuration && duration > 1000) { // > 1 segundo
          logger.logPerformance({
            operation: operationName,
            duration,
            success: true,
          }, context);
        }

        return result;
      } catch (error) {
        // Calcular duração
        const duration = Date.now() - startTime;
        
        // Log de erro
        const errorMetadata: any = {
          operation: operationName,
          success: false,
          error: {
            name: error.name,
            message: error.message,
          },
        };
        
        if (logDuration) {
          errorMetadata.duration = duration;
        }
        
        if (logArgs) {
          errorMetadata.arguments = loggedArgs;
        }

        logger.error(`Failed ${operationName}`, error, context, errorMetadata);
        
        // Log de performance para operações que falharam
        if (logDuration) {
          logger.logPerformance({
            operation: operationName,
            duration,
            success: false,
            errorType: error.name,
          }, context);
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator específico para logging de operações de banco de dados
 */
export function LogDatabaseOperation(tableName?: string) {
  return LogExecution({
    level: 'debug',
    context: 'Database',
    logDuration: true,
    logArgs: false, // Não logar argumentos por padrão (podem conter dados sensíveis)
    logResult: false, // Não logar resultado por padrão (pode ser muito grande)
    sanitizeArgs: (args) => {
      // Sanitizar queries e dados sensíveis
      return args.map(arg => {
        if (typeof arg === 'string' && arg.toLowerCase().includes('password')) {
          return '[QUERY WITH SENSITIVE DATA]';
        }
        if (typeof arg === 'object' && arg !== null) {
          return sanitizeObject(arg);
        }
        return arg;
      });
    },
  });
}

/**
 * Decorator específico para logging de operações de cache
 */
export function LogCacheOperation() {
  return LogExecution({
    level: 'verbose',
    context: 'Cache',
    logDuration: true,
    logArgs: true,
    logResult: false,
    sanitizeArgs: (args) => {
      // Manter apenas chaves de cache, não valores
      return args.map((arg, index) => {
        if (index === 0) return arg; // Primeira arg geralmente é a chave
        if (typeof arg === 'object') return '[OBJECT]';
        if (typeof arg === 'string' && arg.length > 100) return '[LARGE_STRING]';
        return arg;
      });
    },
  });
}

/**
 * Decorator específico para logging de operações de API externa
 */
export function LogExternalApiCall(apiName?: string) {
  return LogExecution({
    level: 'info',
    context: apiName || 'ExternalAPI',
    logDuration: true,
    logArgs: true,
    logResult: false,
    sanitizeArgs: (args) => {
      return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return sanitizeObject(arg);
        }
        return arg;
      });
    },
  });
}

/**
 * Decorator específico para logging de operações críticas de negócio
 */
export function LogBusinessOperation(operationType?: string) {
  return LogExecution({
    level: 'info',
    context: operationType || 'Business',
    logDuration: true,
    logArgs: true,
    logResult: true,
    sanitizeArgs: (args) => sanitizeBusinessArgs(args),
    sanitizeResult: (result) => sanitizeBusinessResult(result),
  });
}

// Funções utilitárias de sanitização
function sanitizeDefaultArgs(args: any[]): any[] {
  return args.map(arg => sanitizeValue(arg));
}

function sanitizeDefaultResult(result: any): any {
  return sanitizeValue(result);
}

function sanitizeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    if (value.length > 1000) {
      return `[STRING_TOO_LONG:${value.length}]`;
    }
    return value;
  }
  
  if (typeof value === 'object') {
    return sanitizeObject(value);
  }
  
  return value;
}

function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    if (obj.length > 10) {
      return `[ARRAY:${obj.length}_items]`;
    }
    return obj.map(item => sanitizeValue(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'creditCard', 'ssn', 'cpf', 'cnpj', 'email', 'phone',
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (key === 'id' || key.endsWith('Id')) {
        sanitized[key] = value; // IDs são geralmente seguros
      } else {
        sanitized[key] = sanitizeValue(value);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

function sanitizeBusinessArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      const sanitized = { ...arg };
      
      // Manter campos importantes para auditoria de negócio
      const businessFields = ['id', 'userId', 'tenantId', 'orderId', 'projectId', 'amount', 'status', 'type'];
      const result: any = {};
      
      businessFields.forEach(field => {
        if (sanitized[field] !== undefined) {
          result[field] = sanitized[field];
        }
      });
      
      return result;
    }
    
    return arg;
  });
}

function sanitizeBusinessResult(result: any): any {
  if (typeof result === 'object' && result !== null) {
    const businessFields = ['id', 'status', 'success', 'message', 'code'];
    const sanitized: any = {};
    
    businessFields.forEach(field => {
      if (result[field] !== undefined) {
        sanitized[field] = result[field];
      }
    });
    
    return sanitized;
  }
  
  return result;
}