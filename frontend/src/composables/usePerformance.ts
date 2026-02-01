import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  loadTime: number;
  interactionDelay: number;
}

export interface PerformanceConfig {
  enableFPSMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableRenderTimeMonitoring: boolean;
  fpsThreshold: number;
  memoryThreshold: number;
  renderTimeThreshold: number;
}

export interface OptimizationSuggestion {
  type: 'fps' | 'memory' | 'render' | 'interaction';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action?: string;
}

const defaultConfig: PerformanceConfig = {
  enableFPSMonitoring: true,
  enableMemoryMonitoring: true,
  enableRenderTimeMonitoring: true,
  fpsThreshold: 30,
  memoryThreshold: 50 * 1024 * 1024, // 50MB
  renderTimeThreshold: 16, // 60fps = 16ms per frame
};

export function usePerformance(config: Partial<PerformanceConfig> = {}) {
  const settings = { ...defaultConfig, ...config };
  
  // Estado reativo
  const metrics = ref<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    loadTime: 0,
    interactionDelay: 0,
  });

  const isMonitoring = ref(false);
  const suggestions = ref<OptimizationSuggestion[]>([]);
  
  // FPS monitoring
  let fpsFrames = 0;
  let fpsStartTime = 0;
  let fpsAnimationId = 0;

  // Memory monitoring
  let memoryInterval: number;

  // Render time monitoring
  const renderTimes: number[] = [];
  let renderStartTime = 0;

  // Interaction monitoring
  const interactionTimes: number[] = [];

  // Computed properties
  const performanceScore = computed(() => {
    const fpsScore = Math.min(metrics.value.fps / 60, 1) * 30;
    const memoryScore = Math.max(1 - (metrics.value.memoryUsage / (100 * 1024 * 1024)), 0) * 25;
    const renderScore = Math.max(1 - (metrics.value.renderTime / 32), 0) * 25;
    const interactionScore = Math.max(1 - (metrics.value.interactionDelay / 100), 0) * 20;
    
    return Math.round(fpsScore + memoryScore + renderScore + interactionScore);
  });

  const performanceLevel = computed(() => {
    const score = performanceScore.value;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  });

  const isLowPerformance = computed(() => performanceLevel.value === 'poor');

  // FPS monitoring functions
  const measureFPS = (): void => {
    if (!settings.enableFPSMonitoring) return;

    const now = performance.now();
    
    if (fpsStartTime === 0) {
      fpsStartTime = now;
      fpsFrames = 0;
    }
    
    fpsFrames++;
    
    const elapsed = now - fpsStartTime;
    if (elapsed >= 1000) {
      metrics.value.fps = Math.round((fpsFrames * 1000) / elapsed);
      fpsStartTime = now;
      fpsFrames = 0;
      
      // Check for low FPS
      if (metrics.value.fps < settings.fpsThreshold) {
        addSuggestion({
          type: 'fps',
          severity: 'high',
          message: `FPS baixo detectado: ${metrics.value.fps}fps`,
          action: 'Considere reduzir a qualidade visual ou otimizar animações',
        });
      }
    }
    
    fpsAnimationId = requestAnimationFrame(measureFPS);
  };

  // Memory monitoring functions
  const measureMemory = (): void => {
    if (!settings.enableMemoryMonitoring || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    metrics.value.memoryUsage = memory.usedJSHeapSize;
    
    // Check for high memory usage
    if (metrics.value.memoryUsage > settings.memoryThreshold) {
      addSuggestion({
        type: 'memory',
        severity: 'medium',
        message: `Alto uso de memória: ${(metrics.value.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        action: 'Considere limpar caches ou reduzir dados em memória',
      });
    }
  };

  // Render time monitoring
  const startRenderMeasurement = (): void => {
    if (!settings.enableRenderTimeMonitoring) return;
    renderStartTime = performance.now();
  };

  const endRenderMeasurement = (): void => {
    if (!settings.enableRenderTimeMonitoring || renderStartTime === 0) return;
    
    const renderTime = performance.now() - renderStartTime;
    renderTimes.push(renderTime);
    
    // Keep only last 10 measurements
    if (renderTimes.length > 10) {
      renderTimes.shift();
    }
    
    // Calculate average render time
    metrics.value.renderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    
    // Check for slow renders
    if (renderTime > settings.renderTimeThreshold) {
      addSuggestion({
        type: 'render',
        severity: 'medium',
        message: `Renderização lenta: ${renderTime.toFixed(1)}ms`,
        action: 'Otimize componentes pesados ou use lazy loading',
      });
    }
    
    renderStartTime = 0;
  };

  // Interaction monitoring
  const measureInteraction = (startTime: number): void => {
    const interactionTime = performance.now() - startTime;
    interactionTimes.push(interactionTime);
    
    // Keep only last 10 measurements
    if (interactionTimes.length > 10) {
      interactionTimes.shift();
    }
    
    // Calculate average interaction delay
    metrics.value.interactionDelay = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
    
    // Check for slow interactions
    if (interactionTime > 100) {
      addSuggestion({
        type: 'interaction',
        severity: 'high',
        message: `Interação lenta: ${interactionTime.toFixed(1)}ms`,
        action: 'Otimize handlers de eventos ou use debouncing',
      });
    }
  };

  // Suggestions management
  const addSuggestion = (suggestion: OptimizationSuggestion): void => {
    // Avoid duplicate suggestions
    const exists = suggestions.value.some(s => 
      s.type === suggestion.type && s.message === suggestion.message
    );
    
    if (!exists) {
      suggestions.value.push(suggestion);
      
      // Keep only last 5 suggestions
      if (suggestions.value.length > 5) {
        suggestions.value.shift();
      }
    }
  };

  const clearSuggestions = (): void => {
    suggestions.value = [];
  };

  // Performance optimization utilities
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: number;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  };

  const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  const requestIdleCallback = (callback: () => void, timeout = 5000): void => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 1);
    }
  };

  // Lazy loading utilities
  const createIntersectionObserver = (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver => {
    const defaultOptions = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };
    
    return new IntersectionObserver(callback, defaultOptions);
  };

  // Image optimization
  const optimizeImage = (
    src: string,
    width: number,
    height: number,
    quality = 0.8
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const optimizedSrc = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedSrc);
      };
      
      img.src = src;
    });
  };

  // Bundle size optimization
  const loadComponentAsync = <T>(
    loader: () => Promise<T>,
    fallback?: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      loader()
        .then((component) => {
          const loadTime = performance.now() - startTime;
          metrics.value.loadTime = loadTime;
          
          if (loadTime > 1000) {
            addSuggestion({
              type: 'render',
              severity: 'medium',
              message: `Componente carregou lentamente: ${loadTime.toFixed(1)}ms`,
              action: 'Considere code splitting ou preloading',
            });
          }
          
          resolve(component);
        })
        .catch((error) => {
          if (fallback) {
            resolve(fallback);
          } else {
            reject(error);
          }
        });
    });
  };

  // Memory management
  const cleanupMemory = (): void => {
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old') || name.includes('temp')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Force garbage collection (if available)
    if ((window as any).gc) {
      (window as any).gc();
    }
  };

  // Performance monitoring controls
  const startMonitoring = (): void => {
    if (isMonitoring.value) return;
    
    isMonitoring.value = true;
    
    if (settings.enableFPSMonitoring) {
      measureFPS();
    }
    
    if (settings.enableMemoryMonitoring) {
      memoryInterval = window.setInterval(measureMemory, 5000);
    }
  };

  const stopMonitoring = (): void => {
    isMonitoring.value = false;
    
    if (fpsAnimationId) {
      cancelAnimationFrame(fpsAnimationId);
      fpsAnimationId = 0;
    }
    
    if (memoryInterval) {
      clearInterval(memoryInterval);
    }
  };

  // Lifecycle
  onMounted(() => {
    startMonitoring();
  });

  onUnmounted(() => {
    stopMonitoring();
  });

  return {
    // Estado
    metrics: readonly(metrics),
    suggestions: readonly(suggestions),
    isMonitoring: readonly(isMonitoring),
    performanceScore,
    performanceLevel,
    isLowPerformance,

    // Controles
    startMonitoring,
    stopMonitoring,
    clearSuggestions,

    // Medições
    startRenderMeasurement,
    endRenderMeasurement,
    measureInteraction,

    // Utilitários
    debounce,
    throttle,
    requestIdleCallback,
    createIntersectionObserver,
    optimizeImage,
    loadComponentAsync,
    cleanupMemory,
  };
}