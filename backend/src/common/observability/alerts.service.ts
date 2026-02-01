import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // em segundos
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  tags?: Record<string, string>;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'slack';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  condition: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byRule: Record<string, number>;
}

@Injectable()
export class AlertsService {
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private ruleStates = new Map<string, { triggeredAt?: number; lastValue?: number }>();
  private checkInterval?: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private logger: StructuredLoggerService,
    private metricsService: MetricsService,
    private healthService: HealthService,
  ) {
    this.initializeDefaultRules();
    this.startAlertChecking();
  }

  // Registrar regra de alerta
  registerAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.info(`Alert rule registered: ${rule.name}`, 'AlertsService', {
      rule_id: rule.id,
      metric: rule.metric,
      threshold: rule.threshold,
      severity: rule.severity,
    });
  }

  // Remover regra de alerta
  unregisterAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.ruleStates.delete(ruleId);
    
    // Resolver alertas ativos desta regra
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === ruleId) {
        this.resolveAlert(alertId, 'Rule removed');
      }
    }
    
    this.logger.info(`Alert rule unregistered: ${ruleId}`, 'AlertsService');
  }

  // Obter todas as regras
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  // Obter regra específica
  getAlertRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  // Atualizar regra
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    
    this.logger.info(`Alert rule updated: ${rule.name}`, 'AlertsService', {
      rule_id: ruleId,
      updates: Object.keys(updates),
    });
  }

  // Obter alertas ativos
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Obter histórico de alertas
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  // Obter estatísticas de alertas
  getAlertStats(): AlertStats {
    const activeAlerts = this.getActiveAlerts();
    const allAlerts = [...activeAlerts, ...this.alertHistory];
    
    const stats: AlertStats = {
      total: allAlerts.length,
      active: activeAlerts.length,
      resolved: this.alertHistory.filter(a => a.resolved).length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byRule: {},
    };

    for (const alert of allAlerts) {
      stats.bySeverity[alert.severity]++;
      
      if (!stats.byRule[alert.ruleId]) {
        stats.byRule[alert.ruleId] = 0;
      }
      stats.byRule[alert.ruleId]++;
    }

    return stats;
  }

  // Resolver alerta manualmente
  resolveAlert(alertId: string, reason?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    if (reason) {
      alert.metadata = { ...alert.metadata, resolveReason: reason };
    }

    this.activeAlerts.delete(alertId);
    this.alertHistory.push(alert);

    // Limitar histórico
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    this.logger.info(`Alert resolved: ${alert.ruleName}`, 'AlertsService', {
      alert_id: alertId,
      rule_id: alert.ruleId,
      reason,
      duration: alert.resolvedAt - alert.timestamp,
    });

    // Executar ações de resolução se configuradas
    this.executeAlertActions(alert, 'resolved');
  }

  // Verificar alertas (chamado periodicamente)
  private async checkAlerts(): Promise<void> {
    try {
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) {
          continue;
        }

        await this.checkRule(rule);
      }
    } catch (error) {
      this.logger.error('Error checking alerts', error, 'AlertsService');
    }
  }

  // Verificar regra específica
  private async checkRule(rule: AlertRule): Promise<void> {
    try {
      const value = await this.getMetricValue(rule.metric, rule.tags);
      if (value === null || value === undefined) {
        return;
      }

      const ruleState = this.ruleStates.get(rule.id) || {};
      const isTriggered = this.evaluateCondition(value, rule.condition, rule.threshold);
      
      if (isTriggered) {
        if (!ruleState.triggeredAt) {
          // Primeira vez que a condição é verdadeira
          ruleState.triggeredAt = Date.now();
          ruleState.lastValue = value;
          this.ruleStates.set(rule.id, ruleState);
        } else {
          // Verificar se passou o tempo de duração
          const duration = (Date.now() - ruleState.triggeredAt) / 1000;
          if (duration >= rule.duration) {
            // Criar alerta se não existir um ativo para esta regra
            const existingAlert = Array.from(this.activeAlerts.values())
              .find(a => a.ruleId === rule.id);
            
            if (!existingAlert) {
              this.createAlert(rule, value);
            }
          }
        }
      } else {
        // Condição não é mais verdadeira
        if (ruleState.triggeredAt) {
          // Resetar estado
          this.ruleStates.set(rule.id, {});
          
          // Resolver alerta ativo se existir
          const activeAlert = Array.from(this.activeAlerts.values())
            .find(a => a.ruleId === rule.id);
          
          if (activeAlert) {
            this.resolveAlert(activeAlert.id, 'Condition no longer met');
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking rule ${rule.name}`, error, 'AlertsService');
    }
  }

  // Obter valor da métrica
  private async getMetricValue(metric: string, tags?: Record<string, string>): Promise<number | null> {
    try {
      // Métricas especiais
      if (metric === 'health_status') {
        const health = await this.healthService.checkHealth();
        return health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0;
      }

      if (metric === 'memory_usage_percent') {
        const memUsage = process.memoryUsage();
        return (memUsage.heapUsed / memUsage.heapTotal) * 100;
      }

      if (metric === 'uptime_seconds') {
        return process.uptime();
      }

      // Métricas do MetricsService
      if (metric.endsWith('_total')) {
        return this.metricsService.getCounterValue(metric, tags);
      }

      if (metric.includes('_gauge')) {
        return this.metricsService.getGaugeValue(metric, tags);
      }

      if (metric.includes('_duration') || metric.includes('_latency')) {
        const stats = this.metricsService.getHistogramStats(metric, tags);
        return stats?.p95 || null;
      }

      // Tentar como gauge primeiro, depois como counter
      let value = this.metricsService.getGaugeValue(metric, tags);
      if (value === 0) {
        value = this.metricsService.getCounterValue(metric, tags);
      }

      return value || null;
    } catch (error) {
      this.logger.error(`Error getting metric value: ${metric}`, error, 'AlertsService');
      return null;
    }
  }

  // Avaliar condição
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      default:
        return false;
    }
  }

  // Criar alerta
  private createAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.formatAlertMessage(rule, value),
      value,
      threshold: rule.threshold,
      condition: rule.condition,
      timestamp: Date.now(),
      resolved: false,
      metadata: {
        metric: rule.metric,
        tags: rule.tags,
      },
    };

    this.activeAlerts.set(alert.id, alert);

    this.logger.warn(`Alert triggered: ${rule.name}`, 'AlertsService', {
      alert_id: alert.id,
      rule_id: rule.id,
      severity: rule.severity,
      value,
      threshold: rule.threshold,
      condition: rule.condition,
    });

    // Executar ações do alerta
    this.executeAlertActions(alert, 'triggered');
  }

  // Formatar mensagem do alerta
  private formatAlertMessage(rule: AlertRule, value: number): string {
    const conditionText = {
      greater_than: 'is greater than',
      less_than: 'is less than',
      equals: 'equals',
      not_equals: 'does not equal',
    }[rule.condition] || rule.condition;

    return `${rule.description}: ${rule.metric} ${conditionText} ${rule.threshold} (current: ${value})`;
  }

  // Executar ações do alerta
  private async executeAlertActions(alert: Alert, event: 'triggered' | 'resolved'): Promise<void> {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) {
      return;
    }

    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert, event);
      } catch (error) {
        this.logger.error(`Error executing alert action: ${action.type}`, error, 'AlertsService');
      }
    }
  }

  // Executar ação específica
  private async executeAction(action: AlertAction, alert: Alert, event: string): Promise<void> {
    switch (action.type) {
      case 'log':
        this.logger.warn(`Alert ${event}: ${alert.message}`, 'AlertsService', {
          alert_id: alert.id,
          severity: alert.severity,
          event,
        });
        break;

      case 'email':
        // TODO: Integrar com serviço de email
        this.logger.info(`Email alert ${event}`, 'AlertsService', {
          alert_id: alert.id,
          to: action.config.to,
          subject: `Alert ${event}: ${alert.ruleName}`,
        });
        break;

      case 'webhook':
        // TODO: Implementar webhook
        this.logger.info(`Webhook alert ${event}`, 'AlertsService', {
          alert_id: alert.id,
          url: action.config.url,
        });
        break;

      case 'slack':
        // TODO: Integrar com Slack
        this.logger.info(`Slack alert ${event}`, 'AlertsService', {
          alert_id: alert.id,
          channel: action.config.channel,
        });
        break;

      default:
        this.logger.warn(`Unknown alert action type: ${action.type}`, 'AlertsService');
    }
  }

  // Inicializar regras padrão
  private initializeDefaultRules(): void {
    // Alta taxa de erro HTTP
    this.registerAlertRule({
      id: 'high_http_error_rate',
      name: 'High HTTP Error Rate',
      description: 'HTTP error rate is too high',
      metric: 'http_errors_total',
      condition: 'greater_than',
      threshold: 10, // 10 erros por minuto
      duration: 120, // 2 minutos
      severity: 'high',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
        { type: 'email', config: { to: 'alerts@company.com' } },
      ],
    });

    // Alta latência HTTP
    this.registerAlertRule({
      id: 'high_http_latency',
      name: 'High HTTP Latency',
      description: 'HTTP response time is too high',
      metric: 'http_request_duration_ms',
      condition: 'greater_than',
      threshold: 2000, // 2 segundos p95
      duration: 300, // 5 minutos
      severity: 'medium',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
      ],
    });

    // Alto uso de memória
    this.registerAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage is critically high',
      metric: 'memory_usage_percent',
      condition: 'greater_than',
      threshold: 90, // 90%
      duration: 180, // 3 minutos
      severity: 'critical',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
        { type: 'email', config: { to: 'alerts@company.com' } },
      ],
    });

    // Serviço não saudável
    this.registerAlertRule({
      id: 'service_unhealthy',
      name: 'Service Unhealthy',
      description: 'Service health check is failing',
      metric: 'health_status',
      condition: 'less_than',
      threshold: 1, // Não saudável
      duration: 60, // 1 minuto
      severity: 'critical',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
        { type: 'email', config: { to: 'alerts@company.com' } },
      ],
    });

    // Muitas falhas de banco de dados
    this.registerAlertRule({
      id: 'high_database_errors',
      name: 'High Database Error Rate',
      description: 'Database operations are failing frequently',
      metric: 'database_errors_total',
      condition: 'greater_than',
      threshold: 5, // 5 erros por minuto
      duration: 120, // 2 minutos
      severity: 'high',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
      ],
    });

    // Cache miss rate alto
    this.registerAlertRule({
      id: 'high_cache_miss_rate',
      name: 'High Cache Miss Rate',
      description: 'Cache miss rate is unusually high',
      metric: 'cache_miss_rate',
      condition: 'greater_than',
      threshold: 80, // 80% miss rate
      duration: 300, // 5 minutos
      severity: 'medium',
      enabled: true,
      actions: [
        { type: 'log', config: {} },
      ],
    });

    this.logger.info('Default alert rules initialized', 'AlertsService', {
      rules_count: this.alertRules.size,
    });
  }

  // Iniciar verificação periódica
  private startAlertChecking(): void {
    const interval = this.configService.get('alerts.checkInterval', 30000); // 30 segundos
    
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, interval);

    this.logger.info('Alert checking started', 'AlertsService', {
      interval_ms: interval,
    });
  }

  // Parar verificação
  private stopAlertChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  // Cleanup ao destruir o serviço
  onModuleDestroy(): void {
    this.stopAlertChecking();
  }
}