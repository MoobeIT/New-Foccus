import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const uploadSuccessRate = new Rate('upload_success');

// Configurações do teste de stress
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 50 },   // Ramp to 50 users
    { duration: '3m', target: 100 },  // Stress test with 100 users
    { duration: '1m', target: 50 },   // Scale back to 50
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests must complete below 10s
    http_req_failed: ['rate<0.1'],      // Error rate must be below 10%
    upload_success: ['rate>0.9'],       // Upload success rate must be above 90%
  },
};

// Simular diferentes tipos de arquivo
const fileTypes = [
  { name: 'small.jpg', size: 1024 * 500, type: 'image/jpeg' },      // 500KB
  { name: 'medium.jpg', size: 1024 * 1024 * 2, type: 'image/jpeg' }, // 2MB
  { name: 'large.jpg', size: 1024 * 1024 * 5, type: 'image/jpeg' },  // 5MB
  { name: 'photo.png', size: 1024 * 1024 * 3, type: 'image/png' },   // 3MB
];

export function setup() {
  console.log('Starting asset upload stress test');
  
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';
  
  // Verificar se o serviço está disponível
  const healthCheck = http.get(`${baseUrl}/api/health`);
  
  if (healthCheck.status !== 200) {
    throw new Error('Service is not healthy, aborting test');
  }
  
  return { 
    baseUrl,
    startTime: Date.now() 
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  
  // Selecionar tipo de arquivo aleatório
  const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
  
  // Simular dados do arquivo
  const fileData = 'x'.repeat(Math.min(fileType.size, 1024 * 1024)); // Limitar a 1MB para o teste
  
  // Preparar form data
  const formData = {
    file: http.file(fileData, fileType.name, fileType.type),
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    projectId: `project-${Math.floor(Math.random() * 100)}`,
    tags: JSON.stringify(['test', 'load-test']),
  };
  
  // Headers para multipart/form-data
  const headers = {
    'Accept': 'application/json',
  };
  
  // Teste 1: Upload do asset
  const uploadResponse = http.post(
    `${baseUrl}/api/assets/upload`,
    formData,
    { 
      headers,
      timeout: '30s',
    }
  );
  
  const uploadSuccess = check(uploadResponse, {
    'upload status is 200 or 201': (r) => r.status >= 200 && r.status < 300,
    'upload response time < 10s': (r) => r.timings.duration < 10000,
    'upload has asset id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.assetId !== undefined || body.id !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!uploadSuccess);
  uploadSuccessRate.add(uploadSuccess);
  
  let assetId;
  if (uploadSuccess && uploadResponse.status < 300) {
    try {
      const responseBody = JSON.parse(uploadResponse.body);
      assetId = responseBody.assetId || responseBody.id;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
  
  // Teste 2: Verificar processamento do asset (se upload foi bem-sucedido)
  if (assetId) {
    const statusResponse = http.get(
      `${baseUrl}/api/assets/${assetId}/status`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    check(statusResponse, {
      'status check is 200': (r) => r.status === 200,
      'status response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(statusResponse.status !== 200);
    
    sleep(Math.random() * 0.5 + 0.2); // 0.2-0.7 seconds
    
    // Teste 3: Obter thumbnail (ocasionalmente)
    if (Math.random() < 0.4) { // 40% das vezes
      const thumbnailResponse = http.get(
        `${baseUrl}/api/assets/${assetId}/thumbnail?size=medium`,
        { headers: { 'Accept': 'image/*' } }
      );
      
      check(thumbnailResponse, {
        'thumbnail status is 200': (r) => r.status === 200,
        'thumbnail response time < 5s': (r) => r.timings.duration < 5000,
        'thumbnail has content': (r) => r.body.length > 0,
      });
      
      errorRate.add(thumbnailResponse.status !== 200);
    }
  }
  
  // Teste 4: Listar assets do usuário (ocasionalmente)
  if (Math.random() < 0.2) { // 20% das vezes
    const listResponse = http.get(
      `${baseUrl}/api/assets?limit=10&offset=0`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    check(listResponse, {
      'list status is 200': (r) => r.status === 200,
      'list response time < 3s': (r) => r.timings.duration < 3000,
    });
    
    errorRate.add(listResponse.status !== 200);
  }
  
  sleep(Math.random() * 2 + 1); // 1-3 seconds between iterations
}

export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Asset upload stress test completed in ${duration}ms`);
}