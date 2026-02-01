# Sistema de Observabilidade

Este módulo implementa um sistema completo de observabilidade com logging estruturado, métricas, tracing distribuído e health checks.

## Funcionalidades Implementadas

### 1. **Logging Estruturado** ✅
- Logs em formato JSON estruturado
- Correlação de requests com IDs únicos
- Contexto automático (usuário, tenant, sessão)
- Sanitização automática de dados sensíveis
- Diferentes níveis de log (error, warn, info, debug, verbose)
- Logs especializados (performance, segurança, auditoria, negócio)

### 2. **Métricas** ✅
- Contadores, gauges, histogramas e timers
- Métricas de HTTP requests
- Métricas de banco de dados
- Métricas de cache
- Métricas de jobs/filas
- Métricas de sistema (memória, CPU)
- Exportação em formato Prometheus

### 3. **Tracing Distribuído** ✅
- Trace IDs únicos para correlação
- Spans hierárquicos
- Baggage para contexto propagado
- Sampling configurável
- Instrumentação automática
- Exportação para sistemas de tracing

### 4. **Health Checks** ✅
- Verificações de saúde do sistema
- Checks de conectividade (banco, Redis, serviços externos)
- Verificações de recursos (memória, CPU, disco)
- Probes de liveness e readiness
- Status agregado (healthy/degraded/unhealthy)

## Estrutura do Módulo

```
observability/
├── services/
│   ├── structured-logger.service.ts    # Logging estruturado
│   ├── metrics.service.ts              # Sistema de métricas
│   ├── health.service.ts               # Health checks
│   └── tracing.service.ts              # Tracing distribuído
├── interceptors/
│   └── logging.interceptor.ts          # Interceptor de requests
├── middleware/
│   └── tracing.middleware.ts           # Middleware de tracing
├── decorators/
│   └── log-execution.decorator.ts      # Decorators de logging
├── observability.controller.ts         # Endpoints de observabilidade
├── observability.module.ts             # Configuração do módulo
└── README.md                          # Esta documentação
```

## Como Usar

### 1. Logging Estruturado

```typescript
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class MyService {
  constructor(private logger: StructuredLoggerService) {}

  async processOrder(orderId: string) {
    // Log básico
    this.logger.info('Processing order', 'MyService', { orderId });

    try {
      // Operação...
      
      // Log de sucesso
      this.logger.info('Order processed successfully', 'MyService', { orderId });
    } catch (error) {
      // Log de erro
      this.logger.error('Failed to process order', error, 'MyService', { orderId });
      throw error;
    }
  }

  // Usando decorator para logging automático
  @LogExecution({ level: 'info', logDuration: true })
  async expensiveOperation() {
    // Operação será logada automaticamente
  }
}
```

### 2. Métricas

```typescript
import { MetricsService } from './metrics.service';

@Injectable()
export class MyService {
  constructor(private metrics: MetricsService) {}

  async processPayment(amount: number) {
    // Incrementar contador
    this.metrics.incrementCounter('payments_processed_total', 1, {
      currency: 'BRL',
      method: 'pix',
    });

    // Medir duração
    const timerId = this.metrics.startTimer('payment_processing_duration', {
      method: 'pix',
    });

    try {
      // Processar pagamento...
      
      // Registrar valor
      this.metrics.recordHistogram('payment_amount_brl', amount);
      
      // Finalizar timer
      this.metrics.stopTimer(timerId, 'payment_processing_duration', {
        method: 'pix',
      });
    } catch (error) {
      this.metrics.incrementCounter('payment_errors_total', 1, {
        method: 'pix',
        error_type: error.name,
      });
      throw error;
    }
  }
}
```

### 3. Tracing

```typescript
import { TracingService } from './tracing.service';

@Injectable()
export class MyService {
  constructor(private tracing: TracingService) {}

  async processOrder(orderId: string) {
    // Criar span manualmente
    const span = this.tracing.startSpan('process_order');
    this.tracing.addTagToSpan(span, 'order.id', orderId);

    try {
      // Operação...
      
      // Criar span filho
      const childSpan = this.tracing.createChildSpan(span, 'validate_order');
      await this.validateOrder(orderId);
      this.tracing.finishSpan(childSpan);
      
      this.tracing.finishSpan(span);
    } catch (error) {
      this.tracing.setSpanError(span, error);
      this.tracing.finishSpan(span, 'error');
      throw error;
    }
  }

  // Usando wrapper automático
  async processPayment(orderId: string) {
    return this.tracing.withSpan('process_payment', async (span) => {
      this.tracing.addTagToSpan(span, 'order.id', orderId);
      
      // Operação será automaticamente instrumentada
      return await this.paymentGateway.charge(orderId);
    });
  }
}
```

### 4. Health Checks

```typescript
import { HealthService } from './health.service';

@Injectable()
export class MyService {
  constructor(private health: HealthService) {}

  onModuleInit() {
    // Registrar health check customizado
    this.health.registerHealthCheck('my_service', async () => {
      try {
        // Verificar se o serviço está funcionando
        await this.checkServiceHealth();
        
        return {
          status: 'healthy',
          message: 'Service is working properly',
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `Service error: ${error.message}`,
        };
      }
    });
  }
}
```

## Endpoints de Observabilidade

### Health Checks
- `GET /observability/health` - Status completo de saúde
- `GET /observability/health/live` - Liveness probe (Kubernetes)
- `GET /observability/health/ready` - Readiness probe (Kubernetes)

### Métricas
- `GET /observability/metrics` - Métricas em formato Prometheus
- `GET /observability/metrics/json` - Métricas em formato JSON

### Tracing
- `GET /observability/traces/stats` - Estatísticas de tracing
- `GET /observability/traces/active` - Traces ativos

### Informações do Serviço
- `GET /observability/info` - Informações do serviço e runtime
- `GET /observability/logs/test` - Testar funcionalidade de logging

## Configuração

### Variáveis de Ambiente

```env
# Logging
LOGGING_LEVEL=info
LOGGING_FORMAT=json

# Tracing
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=0.1
TRACING_MAX_SPANS_PER_TRACE=1000
TRACING_EXPORT_INTERVAL=30000

# Aplicação
APP_NAME=editor-produtos
APP_VERSION=1.0.0
APP_ENVIRONMENT=production
```

### Configuração no NestJS

```typescript
import { ObservabilityModule } from './common/observability/observability.module';

@Module({
  imports: [
    ObservabilityModule, // Módulo global
    // outros módulos...
  ],
})
export class AppModule {}
```

### Middleware de Tracing

```typescript
import { TracingMiddleware } from './common/middleware/tracing.middleware';

// No main.ts
app.use(new TracingMiddleware().use);
```

### Interceptor de Logging

```typescript
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// No main.ts ou em controllers específicos
app.useGlobalInterceptors(new LoggingInterceptor(logger));
```

## Integração com Ferramentas Externas

### Prometheus
As métricas são exportadas em formato compatível com Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'editor-produtos'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/observability/metrics'
    scrape_interval: 15s
```

### Grafana
Dashboards podem ser criados usando as métricas exportadas:

- `http_requests_total` - Total de requests HTTP
- `http_request_duration_ms` - Duração de requests
- `database_operations_total` - Operações de banco
- `memory_heap_used_bytes` - Uso de memória
- `job_executions_total` - Execuções de jobs

### Jaeger/Zipkin
O sistema de tracing pode ser integrado com Jaeger ou Zipkin modificando o método `exportSpan` no `TracingService`.

### ELK Stack
Os logs estruturados em JSON podem ser facilmente ingeridos pelo Elasticsearch:

```json
{
  "timestamp": "2024-01-20T10:30:00.000Z",
  "level": "info",
  "message": "Order processed successfully",
  "context": "OrderService",
  "requestId": "req_123456",
  "userId": "user_789",
  "tenantId": "tenant_abc",
  "metadata": {
    "orderId": "order_456",
    "amount": 99.90
  }
}
```

## Monitoramento e Alertas

### Métricas Importantes para Alertas

1. **Disponibilidade**
   - `http_requests_total{status_class="5xx"}` - Erros de servidor
   - Health check status

2. **Performance**
   - `http_request_duration_ms` percentil 95
   - `database_operation_duration_ms` percentil 95

3. **Recursos**
   - `memory_heap_used_bytes` / `memory_heap_total_bytes`
   - CPU usage

4. **Negócio**
   - `payments_processed_total` - Volume de pagamentos
   - `orders_created_total` - Volume de pedidos

### Alertas Sugeridos

```yaml
# Prometheus alerts
groups:
  - name: editor-produtos
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_class="5xx"}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
```

### 5. **Sistema de Alertas** ✅
- Regras de alerta configuráveis com múltiplas condições
- Diferentes severidades (low, medium, high, critical)
- Ações automáticas (email, webhook, Slack, log)
- Verificação periódica de métricas
- Resolução automática e manual de alertas
- Histórico completo e estatísticas

### 6. **Dashboard de Monitoramento** ✅
- Widgets configuráveis por tipo (métrica, gráfico, status, lista, gauge)
- Gráficos de séries temporais com múltiplas métricas
- Visão geral completa do sistema
- Top métricas por categoria (erros, latência, throughput)
- Dados históricos com diferentes intervalos de tempo

### 7. **Monitoramento de Performance** ✅
- Scores de performance por categoria (disponibilidade, performance, confiabilidade, escalabilidade)
- SLA compliance tracking automático
- Relatórios de performance com recomendações
- Thresholds configuráveis para métricas críticas
- Tendências de performance ao longo do tempo

## APIs Adicionais

### Alertas
```typescript
GET /observability/alerts                    # Listar alertas ativos
GET /observability/alerts/stats              # Estatísticas de alertas
GET /observability/alerts/history            # Histórico de alertas
GET /observability/alerts/rules              # Listar regras de alerta
POST /observability/alerts/rules             # Criar regra de alerta
PUT /observability/alerts/rules/:ruleId      # Atualizar regra
DELETE /observability/alerts/rules/:ruleId   # Remover regra
POST /observability/alerts/:alertId/resolve  # Resolver alerta
```

### Dashboard
```typescript
GET /observability/dashboard                 # Dashboard completo
GET /observability/dashboard/widgets         # Listar widgets
GET /observability/dashboard/chart/:metric   # Dados de gráfico
GET /observability/dashboard/top/:type       # Top métricas
```

### Performance
```typescript
GET /observability/performance               # Relatório atual
GET /observability/performance/history       # Histórico
GET /observability/performance/trends        # Tendências
GET /observability/performance/thresholds    # Status dos thresholds
```

## Configuração de Alertas

### Exemplo de Regra de Alerta
```json
{
  "name": "High Memory Usage",
  "description": "Memory usage is critically high",
  "metric": "memory_usage_percent",
  "condition": "greater_than",
  "threshold": 90,
  "duration": 180,
  "severity": "critical",
  "enabled": true,
  "actions": [
    {
      "type": "email",
      "config": {
        "to": "alerts@company.com",
        "subject": "Critical Alert: High Memory Usage"
      }
    },
    {
      "type": "webhook",
      "config": {
        "url": "https://hooks.slack.com/services/...",
        "method": "POST"
      }
    }
  ]
}
```

### Alertas Padrão Configurados
- **High HTTP Error Rate**: Taxa de erro > 10 erros/min por 2 minutos
- **High HTTP Latency**: P95 > 2 segundos por 5 minutos
- **High Memory Usage**: Uso de memória > 90% por 3 minutos
- **Service Unhealthy**: Health check falhando por 1 minuto
- **High Database Errors**: Erros de BD > 5/min por 2 minutos
- **High Cache Miss Rate**: Miss rate > 80% por 5 minutos

## Dashboard Widgets

### Tipos de Widgets Disponíveis

1. **Metric Widget**: Exibe valor atual de uma métrica
2. **Chart Widget**: Gráfico de série temporal
3. **Status Widget**: Status de health checks
4. **List Widget**: Lista de itens (alertas, erros, endpoints lentos)
5. **Gauge Widget**: Medidor circular com thresholds

### Widgets Padrão
- **System Status**: Status geral do sistema
- **HTTP Requests/min**: Throughput de requests
- **Memory Usage**: Uso de memória com gauge
- **Active Alerts**: Lista de alertas ativos
- **Response Time Chart**: Gráfico de latência

## Performance Monitoring

### Categorias de Performance

1. **Availability (30% do score)**
   - Uptime percentage
   - Error rate
   - Health status

2. **Performance (30% do score)**
   - Average response time
   - P95 response time
   - P99 response time

3. **Reliability (25% do score)**
   - Success rate
   - Timeout rate
   - Retry rate

4. **Scalability (15% do score)**
   - Throughput
   - Concurrent users
   - Resource utilization

### SLA Targets Padrão
- **Availability**: 99.9% uptime
- **Performance**: P95 < 1 segundo
- **Error Rate**: < 1% de erros

## Boas Práticas

### Logging
1. Use níveis apropriados (error para erros, info para eventos importantes)
2. Inclua contexto relevante (IDs, operação, duração)
3. Sanitize dados sensíveis automaticamente
4. Use structured logging para facilitar análise

### Métricas
1. Use labels consistentes
2. Evite cardinalidade alta (muitos valores únicos)
3. Prefira histogramas para latência
4. Monitore tanto métricas técnicas quanto de negócio

### Tracing
1. Configure sampling apropriado para produção
2. Adicione tags relevantes aos spans
3. Use spans filhos para operações detalhadas
4. Propague contexto entre serviços

### Health Checks
1. Verifique dependências críticas
2. Implemente timeouts apropriados
3. Retorne informações úteis para debugging
4. Use diferentes endpoints para liveness/readiness

## Troubleshooting

### Logs Não Aparecem
- Verifique o nível de log configurado
- Confirme se o contexto está sendo propagado
- Verifique se o interceptor está registrado

### Métricas Não Funcionam
- Confirme se o endpoint `/observability/metrics` está acessível
- Verifique se as métricas estão sendo registradas
- Confirme a configuração do Prometheus

### Tracing Não Funciona
- Verifique se o tracing está habilitado
- Confirme a taxa de sampling
- Verifique se o contexto está sendo propagado

### Health Checks Falham
- Verifique conectividade com dependências
- Confirme timeouts dos health checks
- Verifique logs para erros específicos