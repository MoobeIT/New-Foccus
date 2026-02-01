import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface CacheInfo {
  size: number;
  entries: number;
}

export function usePWA() {
  // Estado da instalação
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const installPrompt = ref<PWAInstallPrompt | null>(null);
  
  // Estado da rede
  const networkStatus = ref<NetworkStatus>({ online: navigator.onLine });
  
  // Estado do cache
  const cacheInfo = ref<CacheInfo>({ size: 0, entries: 0 });
  
  // Estado de sincronização
  const isSyncing = ref(false);
  const pendingOperations = ref(0);
  
  // Service Worker state
  const needRefresh = ref(false);
  const offlineReady = ref(false);
  
  // Registrar Service Worker manualmente
  const registerSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW Registered: ', registration);
        checkForUpdates(registration);
        
        // Verificar se está pronto para uso offline
        if (registration.active) {
          offlineReady.value = true;
        }
        
        return registration;
      } catch (error) {
        console.log('SW registration error', error);
      }
    }
  };
  
  // Computed properties
  const isOnline = computed(() => networkStatus.value.online);
  const isOffline = computed(() => !networkStatus.value.online);
  const canInstall = computed(() => isInstallable.value && !isInstalled.value);
  const connectionType = computed(() => networkStatus.value.effectiveType || 'unknown');
  
  // Verificar se já está instalado
  const checkIfInstalled = (): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  };
  
  // Instalar PWA
  const installPWA = async (): Promise<boolean> => {
    if (!installPrompt.value) {
      return false;
    }
    
    try {
      await installPrompt.value.prompt();
      const { outcome } = await installPrompt.value.userChoice;
      
      if (outcome === 'accepted') {
        isInstalled.value = true;
        isInstallable.value = false;
        installPrompt.value = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      return false;
    }
  };
  
  // Atualizar Service Worker
  const updateSW = async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        needRefresh.value = false;
      }
    } catch (error) {
      console.error('Erro ao atualizar SW:', error);
    }
  };
  
  // Verificar atualizações periodicamente
  const checkForUpdates = (registration: ServiceWorkerRegistration): void => {
    setInterval(() => {
      registration.update();
    }, 60000); // Verificar a cada minuto
  };
  
  // Obter informações do cache
  const getCacheInfo = async (): Promise<CacheInfo> => {
    if (!('serviceWorker' in navigator)) {
      return { size: 0, entries: 0 };
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            const info = {
              size: event.data.size,
              entries: event.data.entries || 0,
            };
            cacheInfo.value = info;
            resolve(info);
          }
        };
        
        registration.active?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Erro ao obter informações do cache:', error);
      return { size: 0, entries: 0 };
    }
  };
  
  // Limpar cache
  const clearCache = async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_CLEARED') {
            cacheInfo.value = { size: 0, entries: 0 };
            resolve();
          }
        };
        
        registration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  };
  
  // Sincronizar dados offline
  const syncOfflineData = async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    
    isSyncing.value = true;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            isSyncing.value = false;
            resolve();
          }
        };
        
        registration.active?.postMessage(
          { type: 'SYNC_NOW' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      isSyncing.value = false;
    }
  };
  
  // Monitorar status da rede
  const updateNetworkStatus = (): void => {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    networkStatus.value = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  };
  
  // Event listeners
  const handleBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    installPrompt.value = event as any;
    isInstallable.value = true;
  };
  
  const handleAppInstalled = (): void => {
    isInstalled.value = true;
    isInstallable.value = false;
    installPrompt.value = null;
  };
  
  const handleOnline = (): void => {
    updateNetworkStatus();
    // Sincronizar automaticamente quando voltar online
    if (pendingOperations.value > 0) {
      syncOfflineData();
    }
  };
  
  const handleOffline = (): void => {
    updateNetworkStatus();
  };
  
  const handleNetworkChange = (): void => {
    updateNetworkStatus();
  };
  
  // Lifecycle
  onMounted(() => {
    // Registrar Service Worker
    registerSW();
    
    // Verificar se já está instalado
    isInstalled.value = checkIfInstalled();
    
    // Atualizar status da rede
    updateNetworkStatus();
    
    // Obter informações do cache
    getCacheInfo();
    
    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Network connection change
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleNetworkChange);
    }
  });
  
  onUnmounted(() => {
    // Remover event listeners
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.removeEventListener('change', handleNetworkChange);
    }
  });
  
  return {
    // Estado
    isInstallable,
    isInstalled,
    isOnline,
    isOffline,
    canInstall,
    connectionType,
    networkStatus,
    cacheInfo,
    isSyncing,
    pendingOperations,
    needRefresh,
    offlineReady,
    
    // Métodos
    installPWA,
    updateSW,
    getCacheInfo,
    clearCache,
    syncOfflineData,
    updateNetworkStatus,
  };
}