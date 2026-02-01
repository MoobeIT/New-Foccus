# Otimizações Mobile - Editor PWA

Este diretório contém todas as otimizações e componentes específicos para dispositivos móveis do Editor PWA.

## Funcionalidades Implementadas

### 🎯 Gestos Touch Avançados

#### Composable useTouch
- **Pan**: Arrastar para mover objetos e navegar no canvas
- **Pinch**: Zoom com dois dedos
- **Tap**: Seleção de objetos
- **Double Tap**: Zoom rápido
- **Long Press**: Menu contextual
- **Swipe**: Navegação entre páginas

#### Configurações de Gestos
```typescript
const { emit } = useTouch(element, {
  enablePan: true,
  enablePinch: true,
  enableRotate: false,
  enableSwipe: true,
  threshold: {
    tap: 10,
    pan: 5,
    pinch: 0.1,
    swipe: 50,
  },
});
```

### 📱 Interface Adaptativa

#### Composable useResponsive
- **Breakpoints**: xs, sm, md, lg, xl, xxl
- **Device Detection**: Mobile, tablet, desktop
- **Orientation**: Portrait, landscape
- **Platform Detection**: iOS, Android, Windows
- **Capabilities**: Touch support, pixel ratio

#### Responsive Utilities
```typescript
const { 
  isMobile, 
  isTablet, 
  isPortrait, 
  hasTouch,
  getResponsiveValue,
  matchBreakpoint 
} = useResponsive();

// Valores responsivos
const fontSize = getResponsiveValue({
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
});

// Queries de breakpoint
const showSidebar = matchBreakpoint('>=md');
```

### ⚡ Otimizações de Performance

#### Composable usePerformance
- **FPS Monitoring**: Monitoramento em tempo real
- **Memory Usage**: Controle de uso de memória
- **Render Time**: Medição de tempo de renderização
- **Interaction Delay**: Latência de interações

#### Utilitários de Performance
```typescript
const {
  performanceScore,
  performanceLevel,
  debounce,
  throttle,
  requestIdleCallback,
  optimizeImage,
} = usePerformance();

// Debounce para inputs
const debouncedSave = debounce(saveProject, 300);

// Throttle para scroll
const throttledScroll = throttle(handleScroll, 16);

// Otimização de imagens
const optimizedSrc = await optimizeImage(src, 800, 600, 0.8);
```

## Componentes Mobile

### 🎨 MobileEditor
Editor principal otimizado para dispositivos móveis.

#### Características:
- Canvas responsivo com zoom touch
- Gestos nativos para manipulação de objetos
- Interface adaptativa por orientação
- Performance otimizada para mobile

#### Uso:
```vue
<MobileEditor
  :project="currentProject"
  :readonly="false"
  @save="handleSave"
  @change="handleChange"
  @error="handleError"
/>
```

### 🛠️ MobileToolbar
Barra de ferramentas otimizada para touch.

#### Características:
- Botões com área de toque adequada (44px mínimo)
- Menu expansível para ferramentas complexas
- Feedback visual para interações touch
- Propriedades inline para objetos selecionados

#### Ferramentas Disponíveis:
- **Select**: Seleção e manipulação de objetos
- **Text**: Adição de texto com opções de estilo
- **Image**: Upload e inserção de imagens
- **Shape**: Formas geométricas e ícones

### 📋 MobileHeader
Cabeçalho com controles essenciais.

#### Características:
- Título do projeto com status de salvamento
- Controles de zoom otimizados
- Ações rápidas (undo, redo, save)
- Menu dropdown com opções avançadas

### 🎛️ MobilePropertiesPanel
Painel deslizante para propriedades de objetos.

#### Características:
- Slide-up animation nativa
- Controles touch-friendly
- Presets de cores e estilos
- Sliders para valores numéricos

## Estratégias de Otimização

### 🚀 Performance Mobile

#### 1. Renderização Otimizada
```typescript
// Throttle de renderização para 60fps
const throttledRender = throttle(() => {
  canvas.renderAll();
}, 16);

// Lazy loading de componentes pesados
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
);
```

#### 2. Gestão de Memória
```typescript
// Limpeza automática de cache
const cleanupOldAssets = () => {
  const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
  assets.value = assets.value.filter(asset => 
    asset.lastUsed > cutoffTime
  );
};

// Compressão de imagens
const compressImage = async (file: File) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Redimensionar para mobile
  const maxWidth = window.innerWidth * 2; // Para telas retina
  const maxHeight = window.innerHeight * 2;
  
  // ... lógica de compressão
};
```

#### 3. Touch Optimization
```typescript
// Debounce para evitar múltiplos eventos
const debouncedTouchMove = debounce((event: TouchEvent) => {
  handleTouchMove(event);
}, 16);

// Prevenção de scroll indesejado
element.addEventListener('touchmove', (e) => {
  if (isEditingCanvas) {
    e.preventDefault();
  }
}, { passive: false });
```

### 📐 Layout Responsivo

#### 1. Breakpoints Customizados
```scss
// Breakpoints otimizados para editor
$breakpoints: (
  xs: 0,      // Phones portrait
  sm: 576px,  // Phones landscape
  md: 768px,  // Tablets portrait
  lg: 992px,  // Tablets landscape
  xl: 1200px, // Desktop
  xxl: 1400px // Large desktop
);
```

#### 2. Orientação Adaptativa
```vue
<template>
  <div :class="orientationClasses">
    <!-- Layout adapta automaticamente -->
  </div>
</template>

<script>
const orientationClasses = computed(() => ({
  'layout-portrait': isPortrait.value,
  'layout-landscape': isLandscape.value,
  'layout-mobile': isMobile.value,
}));
</script>
```

#### 3. Safe Areas
```css
/* Suporte a notch e safe areas */
.mobile-header {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.mobile-toolbar {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 🎨 UX Mobile

#### 1. Feedback Tátil
```typescript
// Vibração para feedback
const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Feedback visual para touch
const showTouchFeedback = (x: number, y: number) => {
  const ripple = document.createElement('div');
  ripple.className = 'touch-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  document.body.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 300);
};
```

#### 2. Gestos Intuitivos
```typescript
// Configuração de gestos por contexto
const getGestureConfig = (context: string) => {
  switch (context) {
    case 'canvas':
      return {
        enablePan: true,
        enablePinch: true,
        enableRotate: false,
      };
    case 'gallery':
      return {
        enableSwipe: true,
        enablePinch: true,
        enablePan: false,
      };
    default:
      return defaultGestureConfig;
  }
};
```

#### 3. Acessibilidade Touch
```css
/* Área mínima de toque (44px) */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Espaçamento adequado entre elementos */
.touch-list > * + * {
  margin-top: 8px;
}

/* Estados de foco visíveis */
.touch-target:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

## Testes Mobile

### 🧪 Testes de Gestos
```typescript
describe('Touch Gestures', () => {
  it('should handle pinch zoom', async () => {
    const element = screen.getByTestId('canvas');
    
    // Simular pinch gesture
    fireEvent.touchStart(element, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ],
    });
    
    fireEvent.touchMove(element, {
      touches: [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 },
      ],
    });
    
    expect(mockZoomHandler).toHaveBeenCalled();
  });
});
```

### 📱 Testes Responsivos
```typescript
describe('Responsive Behavior', () => {
  it('should adapt to mobile viewport', () => {
    // Simular viewport mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
    
    window.dispatchEvent(new Event('resize'));
    
    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
  });
});
```

### ⚡ Testes de Performance
```typescript
describe('Mobile Performance', () => {
  it('should maintain 60fps during interactions', async () => {
    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const frameTime = entries[0].duration;
      expect(frameTime).toBeLessThan(16.67); // 60fps
    });
    
    performanceObserver.observe({ entryTypes: ['measure'] });
    
    // Simular interação pesada
    await simulateHeavyInteraction();
  });
});
```

## Debugging Mobile

### 🔍 Ferramentas de Debug

#### 1. Remote Debugging
```javascript
// Habilitar debug remoto
if (process.env.NODE_ENV === 'development') {
  // Chrome DevTools para Android
  // Safari Web Inspector para iOS
  console.log('Mobile debug enabled');
}
```

#### 2. Performance Monitoring
```typescript
// Monitor de performance em tempo real
const performanceMonitor = {
  fps: 0,
  memory: 0,
  
  start() {
    this.measureFPS();
    this.measureMemory();
  },
  
  measureFPS() {
    let frames = 0;
    let startTime = performance.now();
    
    const measure = () => {
      frames++;
      const now = performance.now();
      
      if (now - startTime >= 1000) {
        this.fps = frames;
        frames = 0;
        startTime = now;
        
        console.log(`FPS: ${this.fps}`);
      }
      
      requestAnimationFrame(measure);
    };
    
    requestAnimationFrame(measure);
  },
};
```

#### 3. Touch Event Logging
```typescript
// Log detalhado de eventos touch
const touchLogger = {
  log(event: TouchEvent, type: string) {
    console.log(`Touch ${type}:`, {
      touches: event.touches.length,
      changedTouches: event.changedTouches.length,
      timestamp: event.timeStamp,
      target: event.target,
    });
  },
};

element.addEventListener('touchstart', (e) => {
  touchLogger.log(e, 'start');
});
```

## Configuração de Deploy

### 📦 Build Otimizada
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'mobile-components': [
            './src/components/mobile/MobileEditor.vue',
            './src/components/mobile/MobileToolbar.vue',
          ],
        },
      },
    },
  },
});
```

### 🌐 Service Worker Mobile
```typescript
// Estratégias específicas para mobile
const mobileStrategies = {
  // Cache agressivo para assets pequenos
  smallAssets: new CacheFirst({
    cacheName: 'mobile-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  }),
  
  // Network first para dados críticos
  criticalData: new NetworkFirst({
    cacheName: 'mobile-data',
    networkTimeoutSeconds: 3,
  }),
};
```

## Métricas e Monitoramento

### 📊 Core Web Vitals Mobile
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **FCP**: < 1.8s (First Contentful Paint)
- **TTI**: < 3.8s (Time to Interactive)

### 📈 Métricas Customizadas
```typescript
// Métricas específicas do editor
const editorMetrics = {
  canvasLoadTime: 0,
  firstInteractionTime: 0,
  averageGestureLatency: 0,
  memoryUsage: 0,
  
  track(metric: string, value: number) {
    // Enviar para analytics
    gtag('event', 'mobile_performance', {
      metric_name: metric,
      metric_value: value,
      device_type: isMobile.value ? 'mobile' : 'tablet',
    });
  },
};
```

## Troubleshooting

### 🐛 Problemas Comuns

#### 1. Scroll Indesejado
```css
/* Prevenir scroll durante edição */
.editing-mode {
  touch-action: none;
  overscroll-behavior: none;
}
```

#### 2. Zoom Acidental
```javascript
// Prevenir zoom do navegador
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

document.addEventListener('gesturechange', (e) => {
  e.preventDefault();
});
```

#### 3. Performance em Dispositivos Antigos
```typescript
// Detectar dispositivos com baixa performance
const isLowEndDevice = () => {
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  
  return memory < 4 || cores < 4;
};

// Ajustar qualidade baseado no dispositivo
const getQualitySettings = () => {
  if (isLowEndDevice()) {
    return {
      maxCanvasSize: 1024,
      imageQuality: 0.7,
      enableAnimations: false,
    };
  }
  
  return {
    maxCanvasSize: 2048,
    imageQuality: 0.9,
    enableAnimations: true,
  };
};
```

## Recursos Adicionais

### 📚 Documentação
- [Touch Events Specification](https://w3c.github.io/touch-events/)
- [Mobile Web Best Practices](https://developers.google.com/web/fundamentals/design-and-ux/principles)
- [PWA Mobile Guidelines](https://web.dev/pwa-checklist/)

### 🛠️ Ferramentas
- [Chrome DevTools Mobile](https://developers.google.com/web/tools/chrome-devtools/device-mode)
- [Safari Web Inspector](https://webkit.org/web-inspector/)
- [Lighthouse Mobile Audit](https://developers.google.com/web/tools/lighthouse)

### 📱 Testes em Dispositivos
- **iOS**: Safari, Chrome, Firefox
- **Android**: Chrome, Samsung Internet, Firefox
- **Tablets**: iPad, Android tablets
- **Diferentes resoluções**: 320px até 1024px