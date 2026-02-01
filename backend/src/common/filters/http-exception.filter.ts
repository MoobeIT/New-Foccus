import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  error: {
    statusCode: number;
    message: string | string[];
    error: string;
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        error = responseObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Gerar ID de correlação para rastreamento
    const correlationId = this.generateCorrelationId();

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        statusCode: status,
        message,
        error,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        correlationId,
      },
    };

    // Log do erro
    const userId = (request as any).user?.id || 'anonymous';
    const tenantId = (request as any).user?.tenantId || 'unknown';
    
    this.logger.error(
      `🚨 ${request.method} ${request.url} - ${status} - User: ${userId} - Tenant: ${tenantId} - Correlation: ${correlationId}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Log adicional para erros 500
    if (status >= 500) {
      this.logger.error(
        `💥 CRITICAL ERROR - Correlation: ${correlationId}`,
        {
          exception: exception instanceof Error ? {
            name: exception.name,
            message: exception.message,
            stack: exception.stack,
          } : exception,
          request: {
            method: request.method,
            url: request.url,
            headers: this.sanitizeHeaders(request.headers),
            body: this.sanitizeBody(request.body),
            query: request.query,
            params: request.params,
          },
          user: {
            id: userId,
            tenantId,
          },
        },
      );
    }

    response.status(status).json(errorResponse);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***HIDDEN***';
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***HIDDEN***';
      }
    }
    
    return sanitized;
  }
}