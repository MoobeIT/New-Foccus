# Editor PWA - Progressive Web App

Este é o frontend PWA (Progressive Web App) do Editor de Produtos Personalizados, oferecendo uma experiência nativa em dispositivos móveis e desktop.

## Características PWA

### 🚀 Funcionalidades Principais

- **Instalável**: Pode ser instalado como app nativo
- **Offline First**: Funciona completamente offline
- **Sincronização**: Dados sincronizam automaticamente quando online
- **Push Notifications**: Notificações em tempo real
- **Background Sync**: Operações em segundo plano
- **Cache Inteligente**: Cache otimizado para performance

### 📱 Suporte a Dispositivos

- **Mobile**: iOS Safari, Android Chrome
- **Desktop**: Chrome, Edge, Firefox
- **Tablets**: iPad, Android tablets
- **Modo Standalone**: Experiência de app nativo

## Estrutura do Projeto

```
frontend/
├── public/
│   ├── icons/                    # Ícones PWA (72x72 até 512x512)
│   ├── screenshots/              # Screenshots para app stores
│   ├── manifest.json             # Web App Manifest
│   └── offline.html              # Página offline personalizada
├── src/
│   ├── sw/
│   │   └── service-worker.ts     # Service Worker principal
│   ├── composables/
│   │   └── usePWA.ts            # Composable para funcionalidades PWA
│   ├── stores/
│   │   └── offline.ts           # Store para dados offline
│   └── components/
│       └── PWAInstallPrompt.vue  # Componente de instalação
├── workbox-config.js             # Configuração Workbox
├── vite.config.ts               # Configuração Vite + PWA
└── package.json                 # Dependências PWA
```

## Instalação e Configuração

### Pré-requisitos

```bash
# Node.js 18+
node --version

# npm ou yarn
npm --version
```

### Instalação

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

### Configuração PWA

#### 1. Manifest (manifest.json)

```json
{
  "name": "Editor de Produtos Personalizados",
  "short_name": "Editor PWA",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

#### 2. Service Worker

```typescript
// Estratégias de cache configuradas:
// - NetworkFirst: APIs dinâmicas
// - CacheFirst: Assets estáticos
// - StaleWhileRevalidate: Dados que mudam ocasionalmente
```

#### 3. Ícones PWA

Gerar ícones automaticamente:

```bash
npm run pwa:generate
```

## Funcionalidades Offline

### 🗄️ Armazenamento Local

**IndexedDB**: Dados estruturados
- Projetos offline
- Assets (imagens, arquivos)
- Operações pendentes
- Configurações do usuário

**Cache API**: Assets estáticos
- HTML, CSS, JavaScript
- Imagens do app
- Fontes e ícones

### 🔄 Sincronização

**Background Sync**: Operações automáticas
- Salvar projetos quando online
- Upload de assets pendentes
- Sincronização de metadados

**Conflict Resolution**: Resolução de conflitos
- Timestamp-based merging
- User choice dialogs
- Backup de versões

### 📡 Estratégias de Cache

#### API Caching

```typescript
// Dados dinâmicos (projetos, assets)
NetworkFirst: {
  timeout: 3s,
  fallback: cache,
  maxAge: 1h
}

// Dados estáticos (catálogo, templates)
StaleWhileRevalidate: {
  maxAge: 24h,
  backgroundUpdate: true
}

// Operações críticas (auth, payments)
NetworkOnly: {
  noCache: true
}
```

#### Asset Caching

```typescript
// Assets do usuário
CacheFirst: {
  maxEntries: 500,
  maxAge: 30d
}

// Templates e recursos
CacheFirst: {
  maxEntries: 100,
  maxAge: 7d
}
```

## Uso das Funcionalidades PWA

### Composable usePWA

```vue
<script setup>
import { usePWA } from '@/composables/usePWA';

const {
  // Estado
  isOnline,
  isInstallable,
  canInstall,
  needRefresh,
  
  // Métodos
  installPWA,
  updateSW,
  getCacheInfo,
  syncOfflineData
} = usePWA();

// Instalar PWA
const install = async () => {
  const success = await installPWA();
  if (success) {
    console.log('PWA instalado com sucesso!');
  }
};

// Atualizar Service Worker
const update = async () => {
  await updateSW();
  location.reload();
};
</script>
```

### Store Offline

```vue
<script setup>
import { useOfflineStore } from '@/stores/offline';

const offlineStore = useOfflineStore();

// Salvar projeto offline
const saveProject = async (project) => {
  await offlineStore.saveProjectOffline(project);
};

// Sincronizar com servidor
const sync = async () => {
  await offlineStore.syncWithServer();
};

// Verificar dados offline
const hasOfflineData = offlineStore.hasOfflineData;
const pendingCount = offlineStore.pendingOperationsCount;
</script>
```

### Componente de Instalação

```vue
<template>
  <PWAInstallPrompt 
    :auto-show="true"
    :show-after-delay="3000"
    @install="onInstall"
    @dismiss="onDismiss"
  />
</template>

<script setup>
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';

const onInstall = (success) => {
  if (success) {
    // PWA instalado
    showSuccessMessage();
  }
};

const onDismiss = () => {
  // Usuário dispensou o prompt
  trackEvent('pwa_install_dismissed');
};
</script>
```

## Notificações Push

### Configuração

```typescript
// Registrar para notificações
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: 'YOUR_VAPID_KEY'
});

// Enviar subscription para servidor
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
});
```

### Tipos de Notificação

```typescript
// Projeto salvo
{
  title: 'Projeto Salvo',
  body: 'Seu projeto foi salvo com sucesso',
  icon: '/icons/icon-192x192.png',
  tag: 'project-saved',
  actions: [
    { action: 'open', title: 'Abrir Projeto' },
    { action: 'dismiss', title: 'Dispensar' }
  ]
}

// Pedido processado
{
  title: 'Pedido Processado',
  body: 'Seu pedido #12345 está sendo produzido',
  icon: '/icons/icon-192x192.png',
  tag: 'order-update',
  data: { orderId: '12345' }
}
```

## Performance e Otimização

### Métricas PWA

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1

### Otimizações Implementadas

#### Code Splitting

```typescript
// Lazy loading de rotas
const ProjectEditor = () => import('@/views/ProjectEditor.vue');
const Gallery = () => import('@/views/Gallery.vue');

// Dynamic imports para componentes pesados
const FabricCanvas = defineAsyncComponent(() => 
  import('@/components/FabricCanvas.vue')
);
```

#### Resource Hints

```html
<!-- Preload recursos críticos -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

<!-- Prefetch recursos futuros -->
<link rel="prefetch" href="/api/templates">

<!-- Preconnect para domínios externos -->
<link rel="preconnect" href="https://cdn.editor.com">
```

#### Image Optimization

```typescript
// Lazy loading de imagens
<img 
  :src="imageSrc" 
  loading="lazy"
  :srcset="generateSrcSet(image)"
  :sizes="imageSizes"
>

// WebP com fallback
<picture>
  <source :srcset="webpSrcSet" type="image/webp">
  <img :src="jpegSrc" alt="...">
</picture>
```

## Testes PWA

### Lighthouse CI

```bash
# Executar auditoria PWA
npx lighthouse --pwa https://localhost:3000

# Verificar critérios PWA
npx lighthouse --only-categories=pwa --output=json
```

### Testes de Service Worker

```typescript
// Testar cache strategies
describe('Service Worker', () => {
  it('should cache API responses', async () => {
    const response = await fetch('/api/projects');
    const cached = await caches.match('/api/projects');
    expect(cached).toBeTruthy();
  });
  
  it('should work offline', async () => {
    // Simular offline
    await setOffline(true);
    const response = await fetch('/api/projects');
    expect(response.ok).toBe(true);
  });
});
```

### Testes de Instalação

```typescript
// Testar prompt de instalação
describe('PWA Installation', () => {
  it('should show install prompt', async () => {
    const prompt = await waitForInstallPrompt();
    expect(prompt).toBeVisible();
  });
  
  it('should install successfully', async () => {
    const result = await installPWA();
    expect(result).toBe(true);
  });
});
```

## Deploy e Distribuição

### Build para Produção

```bash
# Build otimizada
npm run build

# Verificar PWA
npm run preview
npx lighthouse --pwa http://localhost:4173
```

### Configuração do Servidor

#### HTTPS Obrigatório

```nginx
# Redirecionar HTTP para HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}

# Configuração HTTPS
server {
    listen 443 ssl http2;
    
    # Headers PWA
    add_header Service-Worker-Allowed /;
    add_header Cache-Control "public, max-age=31536000" always;
}
```

#### Service Worker Headers

```nginx
# Service Worker
location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Service-Worker-Allowed /;
}

# Manifest
location /manifest.json {
    add_header Cache-Control "public, max-age=86400";
}
```

### App Stores

#### Google Play Store

```bash
# Gerar TWA (Trusted Web Activity)
npx @bubblewrap/cli init
npx @bubblewrap/cli build
```

#### Microsoft Store

```bash
# Gerar pacote PWA
npx pwa-builder https://editor.com
```

## Monitoramento e Analytics

### PWA Analytics

```typescript
// Eventos PWA
gtag('event', 'pwa_install_prompt_shown');
gtag('event', 'pwa_installed');
gtag('event', 'pwa_offline_usage');
gtag('event', 'pwa_background_sync');

// Métricas de performance
gtag('event', 'timing_complete', {
  name: 'pwa_load_time',
  value: loadTime
});
```

### Error Tracking

```typescript
// Erros do Service Worker
self.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});

// Erros de sincronização
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason.message.includes('sync')) {
    Sentry.captureException(event.reason);
  }
});
```

## Troubleshooting

### Problemas Comuns

#### Service Worker não atualiza

```bash
# Limpar cache do navegador
# Chrome DevTools > Application > Storage > Clear storage

# Forçar atualização
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

#### Cache muito grande

```typescript
// Limpar cache antigo
const clearOldCache = async () => {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.includes('v1') && !name.includes('v2')
  );
  
  await Promise.all(
    oldCaches.map(name => caches.delete(name))
  );
};
```

#### Problemas de instalação

```typescript
// Debug install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available');
  console.log('Criteria:', e.platforms);
});

// Verificar critérios PWA
if ('serviceWorker' in navigator) {
  console.log('✓ Service Worker supported');
}
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✓ Running in standalone mode');
}
```

## Recursos Adicionais

### Documentação

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

### Ferramentas

- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Workbox](https://developers.google.com/web/tools/workbox)

### Exemplos

- [PWA Examples](https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker)
- [Workbox Examples](https://github.com/GoogleChrome/workbox/tree/main/packages/workbox-examples)