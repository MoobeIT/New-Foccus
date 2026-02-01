import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const apiSuccessRate = new Rate('api_success');

// Configurações do teste
export const options = {
  scenarios: {
    // Cenário 1: Carga constante de usuários navegando
    browsing_users: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      tags: { scenario: 'browsing' },
    },
    
    // Cenário 2: Picos de tráfego
    traffic_spikes: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '1m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 }, // Pico
        { duration: '1m', target: 30 },
      ],
      tags: { scenario: 'spikes' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],     // Error rate must be below 1%
    api_success: ['rate>0.99'],         // API success rate must be above 99%
  },
};

// Endpoints para testar
const endpoints = [
  { method: 'GET', url: '/api/health', weight: 5 },
  { method: 'GET', url: '/api/catalog/products', weight: 20 },
  { method: 'GET', url: '/api/catalog/products?category=photobooks', weight: 15 },
  { method: 'GET', url: '/api/catalog/templates', weight: 10 },
  { method: 'GET', url: '/api/pricing/calculate', weight: 8 },
  { method: 'GET', url: '/observability/metrics', weight: 2 },
  { method: 'GET', url: '/observability/health', weight: 3 },
];

// Criar array ponderado de endpoints
function createWeightedEndpoints() {
  const weighted = [];
  for (const endpoint of endpoints) {
    for (let i = 0; i < endpoint.weight; i++) {
      weighted.push(endpoint);
    }
  }
  return weighted;
}

const weightedEndpoints = createWeightedEndpoints();

export function setup() {
  console.log('Starting general API load test');
  
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';
  
  // Verificar se o serviço está disponível
  const healthCheck = http.get(`${baseUrl}/api/health`);
  
  if (healthCheck.status !== 200) {
    throw new Error('Service is not healthy, aborting test');
  }
  
  console.log(`Testing ${endpoints.length} different endpoints`);
  console.log(`Weighted endpoint pool size: ${weightedEndpoints.length}`);
  
  return { 
    baseUrl,
    startTime: Date.now() 
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  
  // Selecionar endpoint aleatório baseado no peso
  const endpoint = weightedEndpoints[Math.floor(Math.random() * weightedEndpoints.length)];
  
  // Headers padrão
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'k6-load-test/1.0',
  };
  
  // Executar request
  let response;
  const fullUrl = `${baseUrl}${endpoint.url}`;
  
  switch (endpoint.method) {
    case 'GET':
      response = http.get(fullUrl, { headers });
      break;
    case 'POST':
      response = http.post(fullUrl, '{}', { headers: { ...headers, 'Content-Type': 'application/json' } });
      break;
    default:
      response = http.get(fullUrl, { headers });
  }
  
  // Verificações básicas
  const success = check(response, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'response has content': (r) => r.body.length > 0,
  });
  
  // Verificações específicas por endpoint
  if (endpoint.url.includes('/health')) {
    check(response, {
      'health check has status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    });
  }
  
  if (endpoint.url.includes('/products')) {
    check(response, {
      'products response is array or has products': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || Array.isArray(body.products) || body.data !== undefined;
        } catch {
          return false;
        }
      },
    });
  }
  
  if (endpoint.url.includes('/metrics')) {
    check(response, {
      'metrics response has timestamp': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.timestamp !== undefined;
        } catch {
          return false;
        }
      },
    });
  }
  
  errorRate.add(!success);
  apiSuccessRate.add(success);
  
  // Simular tempo de "think time" do usuário
  const thinkTime = Math.random() * 3 + 0.5; // 0.5-3.5 seconds
  sleep(thinkTime);
}

export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`General API load test completed in ${duration}ms`);
  
  // Log final statistics
  console.log('Test completed successfully');
}