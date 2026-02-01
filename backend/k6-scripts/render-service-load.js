import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const renderSuccessRate = new Rate('render_success');

// Configurações do teste
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 95% of requests must complete below 30s
    http_req_failed: ['rate<0.05'],     // Error rate must be below 5%
    render_success: ['rate>0.95'],      // Render success rate must be above 95%
  },
};

// Dados de teste
const testProjects = [
  'photobook-test-1',
  'photobook-test-2', 
  'calendar-test-1',
  'frame-test-1',
];

const testPages = [0, 1, 2, 3, 4];

export function setup() {
  console.log('Starting render service load test');
  
  // Verificar se o serviço está disponível
  const healthCheck = http.get(`${__ENV.BASE_URL || 'http://localhost:3001'}/api/health`);
  
  if (healthCheck.status !== 200) {
    throw new Error('Service is not healthy, aborting test');
  }
  
  return { 
    baseUrl: __ENV.BASE_URL || 'http://localhost:3001',
    startTime: Date.now() 
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  
  // Selecionar projeto e página aleatórios
  const projectId = testProjects[Math.floor(Math.random() * testProjects.length)];
  const pageIndex = testPages[Math.floor(Math.random() * testPages.length)];
  
  // Headers padrão
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Teste 1: Gerar preview
  const previewPayload = {
    projectId: projectId,
    pageIndex: pageIndex,
    quality: 'high',
    format: 'png',
  };
  
  const previewResponse = http.post(
    `${baseUrl}/api/render/preview`,
    JSON.stringify(previewPayload),
    { headers }
  );
  
  const previewSuccess = check(previewResponse, {
    'preview status is 200': (r) => r.status === 200,
    'preview response time < 30s': (r) => r.timings.duration < 30000,
    'preview has valid response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true || body.previewUrl !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!previewSuccess);
  renderSuccessRate.add(previewSuccess);
  
  sleep(Math.random() * 2 + 1); // 1-3 seconds
  
  // Teste 2: Verificar status do render (se preview foi bem-sucedido)
  if (previewSuccess && previewResponse.status === 200) {
    const statusResponse = http.get(
      `${baseUrl}/api/render/status/${projectId}`,
      { headers }
    );
    
    check(statusResponse, {
      'status check is 200': (r) => r.status === 200,
      'status response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(statusResponse.status !== 200);
  }
  
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
  
  // Teste 3: Gerar PDF (ocasionalmente)
  if (Math.random() < 0.3) { // 30% das vezes
    const pdfPayload = {
      projectId: projectId,
      format: 'pdf',
      quality: 'production',
      includeBleed: true,
      includeCropMarks: true,
    };
    
    const pdfResponse = http.post(
      `${baseUrl}/api/render/pdf`,
      JSON.stringify(pdfPayload),
      { 
        headers,
        timeout: '120s', // PDF generation can take longer
      }
    );
    
    const pdfSuccess = check(pdfResponse, {
      'pdf status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'pdf response time < 120s': (r) => r.timings.duration < 120000,
    });
    
    errorRate.add(!pdfSuccess);
    renderSuccessRate.add(pdfSuccess);
  }
}

export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Render service load test completed in ${duration}ms`);
}