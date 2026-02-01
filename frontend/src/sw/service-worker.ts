/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSync } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Configurações
const CACHE_NAMES = {
  STATIC: 'editor-static-v1',
  DYNAMIC: 'editor-dynamic-v1',
  API: 'editor-api-v1',
  ASSETS: 'editor-assets-v1',
  OFFLINE: 'editor-offline-v1',
};

const API_BASE_URL = 'https://api.editor.com';
const CDN_BASE_URL = 'https://cdn.editor.com';

// Configurar precaching
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Tomar controle imediatamente
self.skipWaiting();
clientsClaim();

// Background Sync para operações offline
const bgSync = new BackgroundSync('editor-sync-queue', {
  maxRetentionTime: 24 * 60, // 24 horas
});

// Cache de assets estáticos (CSS, JS, imagens do app)
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: CACHE_NAMES.STATIC,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
      }),
    ],
  })
);

// Cache de imagens estáticas
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.ASSETS,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
      }),
    ],
  })
);

// Cache de assets do usuário (imagens uploadadas)
registerRoute(
  ({ url }) => url.origin === CDN_BASE_URL && url.pathname.includes('/assets/'),
  new CacheFirst({
    cacheName: 'user-assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
      }),
    ],
  })
);

// Cache de API - dados que mudam frequentemente
registerRoute(
  ({ url }) => url.origin === API_BASE_URL && (
    url.pathname.includes('/projects') ||
    url.pathname.includes('/assets') ||
    url.pathname.includes('/templates')
  ),
  new NetworkFirst({
    cacheName: CACHE_NAMES.API,
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hora
      }),
    ],
  })
);

// Cache de dados estáticos da API (catálogo, produtos)
registerRoute(
  ({ url }) => url.origin === API_BASE_URL && (
    url.pathname.includes('/catalog') ||
    url.pathname.includes('/products')
  ),
  new StaleWhileRevalidate({
    cacheName: 'catalog-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 horas
      }),
    ],
  })
);

// Operações que precisam de rede (autenticação, pagamentos)
registerRoute(
  ({ url }) => url.origin === API_BASE_URL && (
    url.pathname.includes('/auth') ||
    url.pathname.includes('/payments') ||
    url.pathname.includes('/orders')
  ),
  new NetworkOnly()
);

// Navegação - sempre tentar rede primeiro, fallback para cache
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: CACHE_NAMES.DYNAMIC,
    networkTimeoutSeconds: 3,
  })
);
registerRoute(navigationRoute);

// Página offline personalizada
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await navigationRoute.handler(event);
    } catch (error) {
      return caches.match('/offline.html');
    }
  }
);

// Sincronização em background para operações offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'editor-sync') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Função para sincronizar operações offline
async function syncOfflineOperations(): Promise<void> {
  try {
    const offlineOperations = await getOfflineOperations();
    
    for (const operation of offlineOperations) {
      try {
        await executeOperation(operation);
        await removeOfflineOperation(operation.id);
      } catch (error) {
        console.error('Erro ao sincronizar operação:', error);
        // Manter operação para próxima tentativa
      }
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}

// Gerenciamento de operações offline
async function getOfflineOperations(): Promise<OfflineOperation[]> {
  const cache = await caches.open(CACHE_NAMES.OFFLINE);
  const response = await cache.match('/offline-operations');
  
  if (response) {
    return response.json();
  }
  
  return [];
}

async function saveOfflineOperation(operation: OfflineOperation): Promise<void> {
  const operations = await getOfflineOperations();
  operations.push(operation);
  
  const cache = await caches.open(CACHE_NAMES.OFFLINE);
  await cache.put('/offline-operations', new Response(JSON.stringify(operations)));
}

async function removeOfflineOperation(operationId: string): Promise<void> {
  const operations = await getOfflineOperations();
  const filteredOperations = operations.filter(op => op.id !== operationId);
  
  const cache = await caches.open(CACHE_NAMES.OFFLINE);
  await cache.put('/offline-operations', new Response(JSON.stringify(filteredOperations)));
}

async function executeOperation(operation: OfflineOperation): Promise<void> {
  const { method, url, data, headers } = operation;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

// Interceptar requisições para operações offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Verificar se é uma operação que pode ser feita offline
  if (isOfflineCapableOperation(request)) {
    event.respondWith(handleOfflineCapableRequest(request));
  }
});

function isOfflineCapableOperation(request: Request): boolean {
  const url = new URL(request.url);
  
  return (
    url.origin === API_BASE_URL &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') &&
    (
      url.pathname.includes('/projects') ||
      url.pathname.includes('/assets/metadata')
    )
  );
}

async function handleOfflineCapableRequest(request: Request): Promise<Response> {
  try {
    // Tentar fazer a requisição normalmente
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // Se falhar, salvar para sincronização posterior
    const operation: OfflineOperation = {
      id: generateOperationId(),
      method: request.method,
      url: request.url,
      data: request.method !== 'GET' ? await request.json() : undefined,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: Date.now(),
    };
    
    await saveOfflineOperation(operation);
    
    // Registrar para background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('editor-sync');
    }
    
    // Retornar resposta de sucesso simulada
    return new Response(
      JSON.stringify({ 
        success: true, 
        offline: true, 
        message: 'Operação salva para sincronização' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function generateOperationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Notificações push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'editor-notification',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event;
  
  let url = '/';
  
  if (action === 'open-project' && data?.projectId) {
    url = `/projects/${data.projectId}`;
  } else if (action === 'view-order' && data?.orderId) {
    url = `/orders/${data.orderId}`;
  } else if (data?.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Verificar se já existe uma janela aberta
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'SYNC_NOW':
      syncOfflineOperations().then(() => {
        event.ports[0].postMessage({ type: 'SYNC_COMPLETE' });
      });
      break;
  }
});

async function getCacheSize(): Promise<number> {
  let totalSize = 0;
  
  for (const cacheName of Object.values(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Tipos
interface OfflineOperation {
  id: string;
  method: string;
  url: string;
  data?: any;
  headers: Record<string, string>;
  timestamp: number;
}

// Log de instalação
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.OFFLINE).then(cache => {
      return cache.addAll([
        '/offline.html',
        '/icons/icon-192x192.png',
      ]);
    })
  );
});

// Log de ativação
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Remover caches antigos
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});