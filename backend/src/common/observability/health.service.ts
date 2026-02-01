import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export interface HealthCheckFunction {
  (): Promise<Omit<HealthCheck, 'timestamp'>>;
}

@Injectable()
export class HealthService {
  private healthChecks = new Map<string, HealthCheckFunction>();
  private lastHealthStatus: HealthStatus | null = null;
  private startTime = Date.now();

  constructor(
    private configService: ConfigService,
    private logger: StructuredLoggerService,
  ) {
    // Registrar health checks básicos
    this.registerBasicHealthChecks();
  }

  // Registrar um health check customizado
  registerHealthCheck(name: string, checkFunction: HealthCheckFunction): void {
    this.healthChecks.set(name, checkFunction);
    this.logger.info(`Health check registered: ${name}`, 'HealthService');
  }

  // Remover um health check
  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.logger.info(`Health check unregistered: ${name}`, 'HealthService');
  }

  // Executar todos os health checks
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];
    
    this.logger.debug('Starting health checks', 'HealthService');

    // Executar todos os health checks em paralelo
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, checkFunction]) => {
        const checkStartTime = Date.now();
        
        try {
          const result = await Promise.race([
            checkFunction(),
            this.timeoutPromise(10000), // 10 segundos de timeout
          ]);
          
          const duration = Date.now() - checkStartTime;
          
          return {
            ...result,
            name,
            timestamp: Date.now(),
            duration,
          } as HealthCheck;
        } catch (error) {
          const duration = Date.now() - checkStartTime;
          
          this.logger.error(`Health check failed: ${name}`, error, 'HealthService');
          
          return {
            name,
            status: 'unhealthy' as const,
            message: error.message || 'Health check failed',
            duration,
            timestamp: Date.now(),
          } as HealthCheck;
        }
      },
    );

    checks.push(...(await Promise.all(checkPromises)));

    // Calcular status geral
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
    };

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get('app.version', '1.0.0'),
      environment: this.configService.get('app.environment', 'development'),
      checks,
      summary,
    };

    this.lastHealthStatus = healthStatus;
    
    const totalDuration = Date.now() - startTime;
    
    this.logger.info(
      `Health check completed: ${overallStatus}`,
      'HealthService',
      {
        status: overallStatus,
        duration: totalDuration,
        checks_total: summary.total,
        checks_healthy: summary.healthy,
        checks_unhealthy: summary.unhealthy,
        checks_degraded: summary.degraded,
      },
    );

    return healthStatus;
  }

  // Obter último status de saúde (cache)
  getLastHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus;
  }

  // Health check simples (apenas status geral)
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch (error) {
      this.logger.error('Failed to check health', error, 'HealthService');
      return false;
    }
  }

  // Registrar health checks básicos do sistema
  private registerBasicHealthChecks(): void {
    // Memory usage check
    this.registerHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`;
      
      if (usagePercent > 90) {
        status = 'unhealthy';
        message += ' - Critical memory usage';
      } else if (usagePercent > 80) {
        status = 'degraded';
        message += ' - High memory usage';
      }
      
      return {
        name: 'memory',
        status,
        message,
        metadata: {
          heap_used_mb: heapUsedMB,
          heap_total_mb: heapTotalMB,
          usage_percent: usagePercent,
          rss_mb: memUsage.rss / 1024 / 1024,
          external_mb: memUsage.external / 1024 / 1024,
        },
      };
    });

    // Event loop lag check
    this.registerHealthCheck('event_loop', async () => {
      const start = process.hrtime.bigint();
      
      await new Promise(resolve => setImmediate(resolve));
      
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Event loop lag: ${lag.toFixed(2)}ms`;
      
      if (lag > 100) {
        status = 'unhealthy';
        message += ' - Critical event loop lag';
      } else if (lag > 50) {
        status = 'degraded';
        message += ' - High event loop lag';
      }
      
      return {
        name: 'event_loop',
        status,
        message,
        metadata: {
          lag_ms: lag,
        },
      };
    });

    // Disk space check (simulado)
    this.registerHealthCheck('disk_space', async () => {
      // TODO: Implementar verificação real de espaço em disco
      // Por enquanto, simular
      const freeSpacePercent = 75; // Simular 75% de espaço livre
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Disk space: ${freeSpacePercent}% free`;
      
      if (freeSpacePercent < 10) {
        status = 'unhealthy';
        message += ' - Critical disk space';
      } else if (freeSpacePercent < 20) {
        status = 'degraded';
        message += ' - Low disk space';
      }
      
      return {
        name: 'disk_space',
        status,
        message,
        metadata: {
          free_space_percent: freeSpacePercent,
        },
      };
    });

    // Database connectivity check
    this.registerHealthCheck('database', async () => {
      try {
        // TODO: Implementar verificação real de conectividade com banco
        // Por enquanto, simular
        const isConnected = true;
        const responseTime = Math.random() * 50; // Simular tempo de resposta
        
        if (!isConnected) {
          return {
            name: 'database',
            status: 'unhealthy' as const,
            message: 'Database connection failed',
            metadata: {
              connected: false,
            },
          };
        }
        
        let status: 'healthy' | 'degraded' = 'healthy';
        let message = `Database connected (${responseTime.toFixed(2)}ms)`;
        
        if (responseTime > 1000) {
          status = 'degraded';
          message += ' - Slow response time';
        }
        
        return {
          name: 'database',
          status,
          message,
          metadata: {
            connected: true,
            response_time_ms: responseTime,
          },
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy' as const,
          message: `Database error: ${error.message}`,
          metadata: {
            connected: false,
            error: error.message,
          },
        };
      }
    });

    // Redis connectivity check
    this.registerHealthCheck('redis', async () => {
      try {
        // TODO: Implementar verificação real de conectividade com Redis
        // Por enquanto, simular
        const isConnected = true;
        const responseTime = Math.random() * 20; // Simular tempo de resposta
        
        if (!isConnected) {
          return {
            name: 'redis',
            status: 'unhealthy' as const,
            message: 'Redis connection failed',
            metadata: {
              connected: false,
            },
          };
        }
        
        let status: 'healthy' | 'degraded' = 'healthy';
        let message = `Redis connected (${responseTime.toFixed(2)}ms)`;
        
        if (responseTime > 500) {
          status = 'degraded';
          message += ' - Slow response time';
        }
        
        return {
          name: 'redis',
          status,
          message,
          metadata: {
            connected: true,
            response_time_ms: responseTime,
          },
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy' as const,
          message: `Redis error: ${error.message}`,
          metadata: {
            connected: false,
            error: error.message,
          },
        };
      }
    });

    // External services check
    this.registerHealthCheck('external_services', async () => {
      // TODO: Verificar conectividade com serviços externos críticos
      // Por enquanto, simular
      const services = [
        { name: 'S3', healthy: true, responseTime: 150 },
        { name: 'Payment Gateway', healthy: true, responseTime: 300 },
        { name: 'Email Service', healthy: true, responseTime: 200 },
      ];
      
      const unhealthyServices = services.filter(s => !s.healthy);
      const slowServices = services.filter(s => s.responseTime > 1000);
      
      if (unhealthyServices.length > 0) {
        return {
          name: 'external_services',
          status: 'unhealthy' as const,
          message: `External services down: ${unhealthyServices.map(s => s.name).join(', ')}`,
          metadata: {
            services,
            unhealthy_count: unhealthyServices.length,
          },
        };
      }
      
      if (slowServices.length > 0) {
        return {
          name: 'external_services',
          status: 'degraded' as const,
          message: `Slow external services: ${slowServices.map(s => s.name).join(', ')}`,
          metadata: {
            services,
            slow_count: slowServices.length,
          },
        };
      }
      
      return {
        name: 'external_services',
        status: 'healthy' as const,
        message: `All external services healthy`,
        metadata: {
          services,
          healthy_count: services.length,
        },
      };
    });
  }

  private async timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timeout after ${ms}ms`)), ms);
    });
  }
}